"""
Escalation Service - Handles task escalation based on overdue status and rules.
Implements multi-level escalation chains with notification support.
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import logging

logger = logging.getLogger(__name__)


class EscalationLevel:
    """Escalation level definitions."""
    LEVEL_1 = 1  # Notify assignee again
    LEVEL_2 = 2  # Notify team lead
    LEVEL_3 = 3  # Notify project manager
    LEVEL_4 = 4  # Notify department head
    LEVEL_5 = 5  # Notify executive


class EscalationService:
    """
    Production escalation service for overdue task handling.
    Supports multi-level escalation chains based on configurable rules.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    async def check_and_escalate_tasks(self) -> Dict[str, Any]:
        """
        Check all tasks for escalation needs and escalate as necessary.
        Returns summary of escalation actions taken.
        """
        from app.models import Task, User
        from app.models.notification import NotificationRule
        
        summary = {
            'checked': 0,
            'escalated': 0,
            'notifications_sent': 0,
            'errors': []
        }
        
        try:
            # Get all overdue tasks that are not completed
            now = datetime.utcnow()
            
            overdue_tasks = self.db.query(Task).filter(
                Task.due_date < now,
                Task.status.notin_(['completed', 'cancelled', 'archived'])
            ).all()
            
            summary['checked'] = len(overdue_tasks)
            
            for task in overdue_tasks:
                try:
                    result = await self._process_task_escalation(task)
                    if result['escalated']:
                        summary['escalated'] += 1
                    summary['notifications_sent'] += result['notifications']
                except Exception as e:
                    summary['errors'].append(f"Task {task.id}: {str(e)}")
                    logger.error(f"Escalation error for task {task.id}: {e}")
            
            logger.info(f"Escalation check: {summary}")
            return summary
            
        except Exception as e:
            logger.error(f"Escalation check failed: {e}")
            summary['errors'].append(str(e))
            return summary
    
    async def _process_task_escalation(self, task) -> Dict[str, Any]:
        """Process escalation for a single task."""
        from app.models import User
        from app.models.notification import NotificationRule
        
        result = {'escalated': False, 'notifications': 0}
        
        now = datetime.utcnow()
        days_overdue = (now - task.due_date).days if task.due_date else 0
        
        # Get applicable escalation rules
        rules = self._get_applicable_rules(task)
        
        # Determine current escalation level based on days overdue
        current_level = self._calculate_escalation_level(days_overdue, rules)
        
        # Get previous escalation level (from task metadata)
        previous_level = self._get_task_escalation_level(task)
        
        if current_level > previous_level:
            # Escalation needed
            result['escalated'] = True
            
            # Get escalation target
            target_user = self._get_escalation_target(task, current_level)
            
            if target_user:
                # Send escalation notification
                await self._send_escalation_notification(
                    task=task,
                    target_user=target_user,
                    escalation_level=current_level,
                    days_overdue=days_overdue
                )
                result['notifications'] += 1
            
            # Update task escalation level
            self._update_task_escalation_level(task, current_level)
            
            # Create audit log entry
            self._log_escalation(task, previous_level, current_level, target_user)
        
        return result
    
    def _get_applicable_rules(self, task) -> List[Any]:
        """Get notification rules applicable to this task."""
        from app.models.notification import NotificationRule
        
        rules = self.db.query(NotificationRule).filter(
            NotificationRule.is_active == True,
            NotificationRule.trigger_type == 'overdue',
            or_(
                NotificationRule.project_id == None,
                NotificationRule.project_id == task.project_id
            ),
            or_(
                NotificationRule.team_id == None,
                NotificationRule.team_id == task.team_id
            )
        ).order_by(NotificationRule.trigger_value).all()
        
        return rules
    
    def _calculate_escalation_level(self, days_overdue: int, rules: List) -> int:
        """Calculate escalation level based on days overdue."""
        # Default escalation thresholds if no rules
        default_thresholds = {
            1: 1,   # 1 day  -> Level 1
            3: 2,   # 3 days -> Level 2
            7: 3,   # 7 days -> Level 3
            14: 4,  # 14 days -> Level 4
            30: 5   # 30 days -> Level 5
        }
        
        # Use rules if available
        if rules:
            level = 0
            for rule in rules:
                if rule.trigger_value and days_overdue >= rule.trigger_value:
                    level += 1
            return min(level, 5)
        
        # Use default thresholds
        level = 0
        for threshold, lvl in sorted(default_thresholds.items()):
            if days_overdue >= threshold:
                level = lvl
        
        return level
    
    def _get_task_escalation_level(self, task) -> int:
        """Get current escalation level from task metadata."""
        if task.custom_fields and isinstance(task.custom_fields, dict):
            return task.custom_fields.get('escalation_level', 0)
        return 0
    
    def _update_task_escalation_level(self, task, level: int):
        """Update task escalation level in metadata."""
        if not task.custom_fields:
            task.custom_fields = {}
        
        task.custom_fields['escalation_level'] = level
        task.custom_fields['last_escalation'] = datetime.utcnow().isoformat()
        
        self.db.commit()
    
    def _get_escalation_target(self, task, level: int) -> Optional[Any]:
        """Get the user to escalate to based on level."""
        from app.models import User, Team, Project
        
        if level == EscalationLevel.LEVEL_1:
            # Re-notify assignee
            if task.assignee_id:
                return self.db.query(User).filter(User.id == task.assignee_id).first()
        
        elif level == EscalationLevel.LEVEL_2:
            # Team lead
            if task.team_id:
                team = self.db.query(Team).filter(Team.id == task.team_id).first()
                if team and team.lead_id:
                    return self.db.query(User).filter(User.id == team.lead_id).first()
        
        elif level == EscalationLevel.LEVEL_3:
            # Project manager
            if task.project_id:
                from app.models.project import ProjectManager
                pm = self.db.query(ProjectManager).filter(
                    ProjectManager.project_id == task.project_id
                ).first()
                if pm:
                    return self.db.query(User).filter(User.id == pm.user_id).first()
        
        elif level >= EscalationLevel.LEVEL_4:
            # Department head or admin
            admins = self.db.query(User).filter(
                User.role.in_(['admin', 'manager', 'org_admin'])
            ).first()
            return admins
        
        return None
    
    async def _send_escalation_notification(
        self,
        task,
        target_user,
        escalation_level: int,
        days_overdue: int
    ):
        """Send escalation notification via email and in-app."""
        from app.models.notification import Notification
        from app.services.email_service import email_service, EmailTemplates
        
        # Create in-app notification
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=target_user.id,
            type='escalation',
            title=f'🚨 Task Escalated (Level {escalation_level})',
            message=f'Task "{task.name}" is {days_overdue} days overdue and requires attention.',
            link=f'/tasks/{task.id}',
            icon='alert-triangle',
            data={
                'task_id': task.id,
                'escalation_level': escalation_level,
                'days_overdue': days_overdue
            }
        )
        self.db.add(notification)
        self.db.commit()
        
        # Send email notification
        if target_user.email:
            original_assignee = "Unassigned"
            if task.assignee:
                original_assignee = task.assignee.full_name
            
            try:
                from app.services.email_service import email_service
                
                html = f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ef4444;">🚨 Task Escalation Alert</h2>
                    <p>Hi {target_user.full_name},</p>
                    <p>The following task has been escalated to you:</p>
                    <div style="background: #f8f9fa; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0;">
                        <h3 style="margin: 0 0 8px 0;">{task.name}</h3>
                        <p style="margin: 0; color: #666;">
                            <strong>Original Assignee:</strong> {original_assignee}<br>
                            <strong>Days Overdue:</strong> {days_overdue}<br>
                            <strong>Escalation Level:</strong> {escalation_level}<br>
                            <strong>Priority:</strong> {task.priority}
                        </p>
                    </div>
                    <a href="/tasks/{task.id}" style="display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px;">Take Action</a>
                </div>
                """
                
                await email_service.send_email_async(
                    target_user.email,
                    f"🚨 Escalation: {task.name} - Level {escalation_level}",
                    html
                )
            except Exception as e:
                logger.error(f"Failed to send escalation email: {e}")
    
    def _log_escalation(self, task, from_level: int, to_level: int, target_user):
        """Log escalation action in audit trail."""
        from app.models.task_collaboration import TaskAuditLog
        
        log = TaskAuditLog(
            id=str(uuid.uuid4()),
            task_id=task.id,
            user_id=target_user.id if target_user else task.owner_id,
            action='escalated',
            field_name='escalation_level',
            old_value=str(from_level),
            new_value=str(to_level),
            extra_data={
                'target_user_id': target_user.id if target_user else None,
                'target_user_name': target_user.full_name if target_user else None
            }
        )
        self.db.add(log)
        self.db.commit()
    
    def manually_escalate(
        self,
        task_id: str,
        target_user_id: str,
        reason: str,
        escalated_by_id: str
    ) -> Dict[str, Any]:
        """Manually escalate a task to a specific user."""
        from app.models import Task, User
        from app.models.notification import Notification
        
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {'success': False, 'error': 'Task not found'}
        
        target_user = self.db.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            return {'success': False, 'error': 'Target user not found'}
        
        escalated_by = self.db.query(User).filter(User.id == escalated_by_id).first()
        
        # Update task assignment
        old_assignee_id = task.assignee_id
        task.assignee_id = target_user_id
        
        # Create notification
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=target_user_id,
            type='escalation',
            title=f'Task Escalated to You',
            message=f'{escalated_by.full_name if escalated_by else "Someone"} escalated "{task.name}" to you. Reason: {reason}',
            link=f'/tasks/{task.id}',
            icon='alert-triangle'
        )
        self.db.add(notification)
        
        # Log the action
        from app.models.task_collaboration import TaskAuditLog
        
        log = TaskAuditLog(
            id=str(uuid.uuid4()),
            task_id=task_id,
            user_id=escalated_by_id,
            action='manual_escalation',
            field_name='assignee_id',
            old_value=old_assignee_id,
            new_value=target_user_id,
            extra_data={'reason': reason}
        )
        self.db.add(log)
        
        self.db.commit()
        
        return {
            'success': True,
            'task_id': task_id,
            'escalated_to': target_user.full_name,
            'reason': reason
        }
    
    def get_escalation_history(self, task_id: str) -> List[Dict[str, Any]]:
        """Get escalation history for a task."""
        from app.models.task_collaboration import TaskAuditLog
        
        logs = self.db.query(TaskAuditLog).filter(
            TaskAuditLog.task_id == task_id,
            TaskAuditLog.action.in_(['escalated', 'manual_escalation'])
        ).order_by(TaskAuditLog.created_at.desc()).all()
        
        return [
            {
                'id': log.id,
                'action': log.action,
                'from_level': log.old_value,
                'to_level': log.new_value,
                'extra_data': log.extra_data,
                'created_at': log.created_at.isoformat()
            }
            for log in logs
        ]
