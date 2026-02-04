"""
SLA (Service Level Agreement) Service - Manages SLA definitions and breach detection.
Supports task-level and project-level SLAs with automated alerts.
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import logging

logger = logging.getLogger(__name__)


class SLAService:
    """
    Production SLA service for managing service level agreements.
    Handles SLA definitions, compliance checking, and breach notifications.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    async def check_sla_compliance(self) -> Dict[str, Any]:
        """
        Check all active SLAs for compliance and handle breaches.
        Returns summary of SLA check results.
        """
        from app.models import Task, Project
        
        summary = {
            'checked': 0,
            'compliant': 0,
            'at_risk': 0,
            'breached': 0,
            'notifications_sent': 0
        }
        
        try:
            # Get all SLA definitions
            slas = self._get_active_slas()
            
            for sla in slas:
                result = await self._check_sla(sla)
                summary['checked'] += result['checked']
                summary['compliant'] += result['compliant']
                summary['at_risk'] += result['at_risk']
                summary['breached'] += result['breached']
                summary['notifications_sent'] += result['notifications_sent']
            
            logger.info(f"SLA check completed: {summary}")
            return summary
            
        except Exception as e:
            logger.error(f"SLA check failed: {e}")
            return summary
    
    def _get_active_slas(self) -> List[Dict[str, Any]]:
        """Get all active SLA definitions."""
        # Default SLA definitions (would typically come from database)
        return [
            {
                'id': 'sla_urgent_response',
                'name': 'Urgent Task Response',
                'type': 'response_time',
                'priority': 'urgent',
                'target_hours': 2,
                'warning_threshold': 0.7,  # 70% of target
                'description': 'Urgent tasks must be acknowledged within 2 hours'
            },
            {
                'id': 'sla_high_response',
                'name': 'High Priority Response',
                'type': 'response_time',
                'priority': 'high',
                'target_hours': 8,
                'warning_threshold': 0.7,
                'description': 'High priority tasks must be acknowledged within 8 hours'
            },
            {
                'id': 'sla_urgent_resolution',
                'name': 'Urgent Task Resolution',
                'type': 'resolution_time',
                'priority': 'urgent',
                'target_hours': 24,
                'warning_threshold': 0.8,
                'description': 'Urgent tasks must be resolved within 24 hours'
            },
            {
                'id': 'sla_high_resolution',
                'name': 'High Priority Resolution',
                'type': 'resolution_time',
                'priority': 'high',
                'target_hours': 72,
                'warning_threshold': 0.8,
                'description': 'High priority tasks must be resolved within 72 hours'
            },
            {
                'id': 'sla_medium_resolution',
                'name': 'Medium Priority Resolution',
                'type': 'resolution_time',
                'priority': 'medium',
                'target_hours': 168,  # 7 days
                'warning_threshold': 0.8,
                'description': 'Medium priority tasks must be resolved within 7 days'
            }
        ]
    
    async def _check_sla(self, sla: Dict[str, Any]) -> Dict[str, Any]:
        """Check compliance for a specific SLA."""
        from app.models import Task
        
        result = {
            'checked': 0,
            'compliant': 0,
            'at_risk': 0,
            'breached': 0,
            'notifications_sent': 0
        }
        
        now = datetime.utcnow()
        
        # Get applicable tasks
        query = self.db.query(Task).filter(
            Task.priority == sla['priority'],
            Task.status.notin_(['completed', 'cancelled', 'archived'])
        )
        
        tasks = query.all()
        result['checked'] = len(tasks)
        
        for task in tasks:
            status = self._calculate_sla_status(task, sla, now)
            
            if status == 'compliant':
                result['compliant'] += 1
            elif status == 'at_risk':
                result['at_risk'] += 1
                # Send warning notification
                await self._send_sla_warning(task, sla)
                result['notifications_sent'] += 1
            elif status == 'breached':
                result['breached'] += 1
                # Send breach notification
                await self._send_sla_breach_notification(task, sla)
                result['notifications_sent'] += 1
        
        return result
    
    def _calculate_sla_status(
        self,
        task,
        sla: Dict[str, Any],
        now: datetime
    ) -> str:
        """Calculate SLA status for a task."""
        target_hours = sla['target_hours']
        warning_threshold = sla.get('warning_threshold', 0.8)
        
        # Calculate elapsed time
        start_time = task.created_at
        
        if sla['type'] == 'response_time':
            # Check if task has been acknowledged (moved from backlog/todo)
            if task.status not in ['backlog', 'todo']:
                return 'compliant'
            elapsed = (now - start_time).total_seconds() / 3600
        
        elif sla['type'] == 'resolution_time':
            # Check if task is completed
            if task.status == 'completed':
                return 'compliant'
            elapsed = (now - start_time).total_seconds() / 3600
        
        else:
            return 'compliant'
        
        # Determine status
        if elapsed >= target_hours:
            return 'breached'
        elif elapsed >= (target_hours * warning_threshold):
            return 'at_risk'
        else:
            return 'compliant'
    
    async def _send_sla_warning(self, task, sla: Dict[str, Any]):
        """Send SLA warning notification."""
        from app.models.notification import Notification
        
        if not task.assignee_id:
            return
        
        # Check if warning already sent recently
        if self._warning_sent_recently(task.id, sla['id']):
            return
        
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=task.assignee_id,
            type='sla_warning',
            title=f'⚠️ SLA Warning: {sla["name"]}',
            message=f'Task "{task.name}" is approaching SLA breach. {sla["description"]}',
            link=f'/tasks/{task.id}',
            icon='clock',
            data={
                'sla_id': sla['id'],
                'sla_name': sla['name'],
                'task_id': task.id
            }
        )
        self.db.add(notification)
        self.db.commit()
        
        # Mark warning as sent
        self._mark_warning_sent(task.id, sla['id'])
    
    async def _send_sla_breach_notification(self, task, sla: Dict[str, Any]):
        """Send SLA breach notification."""
        from app.models import User
        from app.models.notification import Notification
        
        # Check if breach already notified
        if self._breach_notified_recently(task.id, sla['id']):
            return
        
        # Notify assignee
        if task.assignee_id:
            notification = Notification(
                id=str(uuid.uuid4()),
                user_id=task.assignee_id,
                type='sla_breach',
                title=f'🚨 SLA Breached: {sla["name"]}',
                message=f'Task "{task.name}" has breached SLA. Immediate action required.',
                link=f'/tasks/{task.id}',
                icon='alert-octagon',
                data={
                    'sla_id': sla['id'],
                    'sla_name': sla['name'],
                    'task_id': task.id
                }
            )
            self.db.add(notification)
        
        # Also notify team lead if available
        if task.team_id:
            from app.models import Team
            team = self.db.query(Team).filter(Team.id == task.team_id).first()
            if team and team.lead_id and team.lead_id != task.assignee_id:
                notification = Notification(
                    id=str(uuid.uuid4()),
                    user_id=team.lead_id,
                    type='sla_breach',
                    title=f'🚨 Team SLA Breach: {sla["name"]}',
                    message=f'Task "{task.name}" has breached SLA.',
                    link=f'/tasks/{task.id}',
                    icon='alert-octagon',
                    data={
                        'sla_id': sla['id'],
                        'task_id': task.id
                    }
                )
                self.db.add(notification)
        
        self.db.commit()
        
        # Mark breach as notified
        self._mark_breach_notified(task.id, sla['id'])
    
    def _warning_sent_recently(self, task_id: str, sla_id: str) -> bool:
        """Check if warning was sent recently (within 4 hours)."""
        from app.models.notification import Notification
        
        cutoff = datetime.utcnow() - timedelta(hours=4)
        
        existing = self.db.query(Notification).filter(
            Notification.type == 'sla_warning',
            Notification.created_at > cutoff,
            Notification.data.contains({'task_id': task_id, 'sla_id': sla_id})
        ).first()
        
        return existing is not None
    
    def _mark_warning_sent(self, task_id: str, sla_id: str):
        """Mark warning as sent (handled by notification creation)."""
        pass
    
    def _breach_notified_recently(self, task_id: str, sla_id: str) -> bool:
        """Check if breach was notified recently (within 24 hours)."""
        from app.models.notification import Notification
        
        cutoff = datetime.utcnow() - timedelta(hours=24)
        
        existing = self.db.query(Notification).filter(
            Notification.type == 'sla_breach',
            Notification.created_at > cutoff,
            Notification.data.contains({'task_id': task_id, 'sla_id': sla_id})
        ).first()
        
        return existing is not None
    
    def _mark_breach_notified(self, task_id: str, sla_id: str):
        """Mark breach as notified (handled by notification creation)."""
        pass
    
    def get_sla_report(
        self,
        project_id: Optional[str] = None,
        team_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Generate SLA compliance report."""
        from app.models import Task
        
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        query = self.db.query(Task).filter(
            Task.created_at >= start_date,
            Task.created_at <= end_date
        )
        
        if project_id:
            query = query.filter(Task.project_id == project_id)
        if team_id:
            query = query.filter(Task.team_id == team_id)
        
        tasks = query.all()
        
        # Calculate SLA metrics
        slas = self._get_active_slas()
        report = {
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'total_tasks': len(tasks),
            'sla_metrics': {},
            'by_priority': {},
            'overall_compliance': 0
        }
        
        total_compliant = 0
        total_applicable = 0
        
        for sla in slas:
            applicable_tasks = [t for t in tasks if t.priority == sla['priority']]
            if not applicable_tasks:
                continue
            
            compliant = 0
            breached = 0
            
            for task in applicable_tasks:
                if task.status == 'completed':
                    # Check if completed within SLA
                    if task.completed_at:
                        elapsed = (task.completed_at - task.created_at).total_seconds() / 3600
                        if elapsed <= sla['target_hours']:
                            compliant += 1
                        else:
                            breached += 1
                else:
                    # Still open - check current status
                    now = datetime.utcnow()
                    elapsed = (now - task.created_at).total_seconds() / 3600
                    if elapsed > sla['target_hours']:
                        breached += 1
                    else:
                        compliant += 1
            
            total = len(applicable_tasks)
            compliance_rate = (compliant / total * 100) if total > 0 else 100
            
            report['sla_metrics'][sla['id']] = {
                'name': sla['name'],
                'type': sla['type'],
                'priority': sla['priority'],
                'target_hours': sla['target_hours'],
                'total': total,
                'compliant': compliant,
                'breached': breached,
                'compliance_rate': round(compliance_rate, 1)
            }
            
            total_compliant += compliant
            total_applicable += total
        
        # Overall compliance
        if total_applicable > 0:
            report['overall_compliance'] = round(total_compliant / total_applicable * 100, 1)
        else:
            report['overall_compliance'] = 100
        
        # Group by priority
        priority_groups = {}
        for task in tasks:
            if task.priority not in priority_groups:
                priority_groups[task.priority] = {'total': 0, 'completed': 0}
            priority_groups[task.priority]['total'] += 1
            if task.status == 'completed':
                priority_groups[task.priority]['completed'] += 1
        
        report['by_priority'] = priority_groups
        
        return report
    
    def get_task_sla_status(self, task_id: str) -> Dict[str, Any]:
        """Get SLA status for a specific task."""
        from app.models import Task
        
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {'error': 'Task not found'}
        
        slas = self._get_active_slas()
        applicable_slas = [s for s in slas if s['priority'] == task.priority]
        
        now = datetime.utcnow()
        result = {
            'task_id': task_id,
            'task_name': task.name,
            'priority': task.priority,
            'status': task.status,
            'created_at': task.created_at.isoformat(),
            'sla_statuses': []
        }
        
        for sla in applicable_slas:
            status = self._calculate_sla_status(task, sla, now)
            elapsed = (now - task.created_at).total_seconds() / 3600
            remaining = max(0, sla['target_hours'] - elapsed)
            
            result['sla_statuses'].append({
                'sla_id': sla['id'],
                'sla_name': sla['name'],
                'type': sla['type'],
                'target_hours': sla['target_hours'],
                'elapsed_hours': round(elapsed, 1),
                'remaining_hours': round(remaining, 1),
                'status': status,
                'percentage_used': round(min(100, elapsed / sla['target_hours'] * 100), 1)
            })
        
        return result
