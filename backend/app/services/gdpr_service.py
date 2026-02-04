"""
GDPR Compliance Service - Handles data privacy, export, and deletion.
Supports right to data access, right to be forgotten, and consent management.
"""
import uuid
import json
import zipfile
import io
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
import logging

logger = logging.getLogger(__name__)


class GDPRService:
    """
    Production GDPR compliance service.
    Handles data export, deletion, consent management, and audit logging.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== Right to Access (Data Export) ====================
    
    async def export_user_data(self, user_id: str, format: str = "json") -> Dict[str, Any]:
        """
        Export all user data as a downloadable package.
        Implements GDPR Article 20 - Right to data portability.
        """
        from app.models import User, Task, Project
        from app.models.task_collaboration import TaskComment, TaskAttachment
        from app.models.timesheet import TimeEntry, Timesheet
        from app.models.notification import Notification
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {'success': False, 'error': 'User not found'}
        
        # Collect all user data
        export_data = {
            'export_metadata': {
                'user_id': user_id,
                'export_date': datetime.utcnow().isoformat(),
                'format': format,
                'version': '1.0'
            },
            'profile': self._export_profile(user),
            'tasks': self._export_tasks(user_id),
            'projects': self._export_projects(user_id),
            'comments': self._export_comments(user_id),
            'time_entries': self._export_time_entries(user_id),
            'notifications': self._export_notifications(user_id),
            'activity_log': self._export_activity_log(user_id)
        }
        
        # Log the export
        self._log_data_access(
            user_id=user_id,
            action='data_export',
            details={'format': format}
        )
        
        if format == "zip":
            return await self._create_zip_export(export_data, user_id)
        
        return {
            'success': True,
            'data': export_data,
            'format': format
        }
    
    def _export_profile(self, user) -> Dict[str, Any]:
        """Export user profile data."""
        return {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'position': user.position,
            'phone': user.phone,
            'timezone': user.timezone,
            'role': user.role,
            'is_active': user.is_active,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'skills': user.skills,
            'availability_status': user.availability_status
        }
    
    def _export_tasks(self, user_id: str) -> List[Dict[str, Any]]:
        """Export tasks owned or assigned to user."""
        from app.models import Task
        
        tasks = self.db.query(Task).filter(
            or_(Task.owner_id == user_id, Task.assignee_id == user_id)
        ).all()
        
        return [
            {
                'id': t.id,
                'name': t.name,
                'description': t.description,
                'status': t.status,
                'priority': t.priority,
                'due_date': t.due_date.isoformat() if t.due_date else None,
                'created_at': t.created_at.isoformat() if t.created_at else None,
                'role': 'owner' if t.owner_id == user_id else 'assignee'
            }
            for t in tasks
        ]
    
    def _export_projects(self, user_id: str) -> List[Dict[str, Any]]:
        """Export projects user is involved in."""
        from app.models import Project
        from app.models.project import ProjectMember
        
        memberships = self.db.query(ProjectMember).filter(
            ProjectMember.user_id == user_id
        ).all()
        
        projects = []
        for m in memberships:
            project = self.db.query(Project).filter(Project.id == m.project_id).first()
            if project:
                projects.append({
                    'id': project.id,
                    'name': project.name,
                    'code': project.code,
                    'status': project.status,
                    'role': m.role,
                    'joined_at': m.created_at.isoformat() if m.created_at else None
                })
        
        return projects
    
    def _export_comments(self, user_id: str) -> List[Dict[str, Any]]:
        """Export user's comments."""
        from app.models.task_collaboration import TaskComment
        
        comments = self.db.query(TaskComment).filter(
            TaskComment.user_id == user_id
        ).all()
        
        return [
            {
                'id': c.id,
                'task_id': c.task_id,
                'content': c.content,
                'created_at': c.created_at.isoformat() if c.created_at else None
            }
            for c in comments
        ]
    
    def _export_time_entries(self, user_id: str) -> List[Dict[str, Any]]:
        """Export user's time entries."""
        from app.models.timesheet import TimeEntry
        
        entries = self.db.query(TimeEntry).filter(
            TimeEntry.user_id == user_id
        ).all()
        
        return [
            {
                'id': e.id,
                'task_id': e.task_id,
                'hours': e.hours,
                'description': e.description,
                'date': e.date.isoformat() if e.date else None,
                'created_at': e.created_at.isoformat() if e.created_at else None
            }
            for e in entries
        ]
    
    def _export_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        """Export user's notifications."""
        from app.models.notification import Notification
        
        notifications = self.db.query(Notification).filter(
            Notification.user_id == user_id
        ).limit(1000).all()
        
        return [
            {
                'id': n.id,
                'type': n.type,
                'title': n.title,
                'message': n.message,
                'is_read': n.is_read,
                'created_at': n.created_at.isoformat() if n.created_at else None
            }
            for n in notifications
        ]
    
    def _export_activity_log(self, user_id: str) -> List[Dict[str, Any]]:
        """Export user's activity log."""
        from app.models.task_collaboration import TaskAuditLog
        
        logs = self.db.query(TaskAuditLog).filter(
            TaskAuditLog.user_id == user_id
        ).limit(1000).all()
        
        return [
            {
                'id': l.id,
                'task_id': l.task_id,
                'action': l.action,
                'field_name': l.field_name,
                'created_at': l.created_at.isoformat() if l.created_at else None
            }
            for l in logs
        ]
    
    async def _create_zip_export(self, data: Dict, user_id: str) -> Dict[str, Any]:
        """Create a ZIP file containing all exported data."""
        from app.services.storage_service import get_storage_service
        
        # Create in-memory ZIP
        buffer = io.BytesIO()
        
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add JSON data
            zf.writestr(
                'user_data.json',
                json.dumps(data, indent=2, default=str)
            )
            
            # Add individual sections
            for section, content in data.items():
                if section != 'export_metadata':
                    zf.writestr(
                        f'{section}.json',
                        json.dumps(content, indent=2, default=str)
                    )
            
            # Add README
            readme = """
# GDPR Data Export

This archive contains all your personal data stored in LightIDEA.

## Contents
- user_data.json: Complete export in a single file
- profile.json: Your profile information
- tasks.json: Tasks you own or are assigned to
- projects.json: Projects you're a member of
- comments.json: Comments you've made
- time_entries.json: Your time tracking entries
- notifications.json: Your notifications
- activity_log.json: Your activity history

## Data Retention
This export was generated on {export_date} and reflects 
your data at that point in time.

For questions, contact: privacy@lightidea.com
            """.format(export_date=datetime.utcnow().isoformat())
            
            zf.writestr('README.txt', readme)
        
        buffer.seek(0)
        
        # Store the ZIP file
        storage = get_storage_service()
        result = await storage.upload_file(
            buffer.read(),
            f"export_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip",
            folder="exports",
            user_id=user_id
        )
        
        return {
            'success': True,
            'download_url': result['url'],
            'expires_in': 3600,
            'format': 'zip'
        }
    
    # ==================== Right to Erasure (Data Deletion) ====================
    
    async def delete_user_data(
        self,
        user_id: str,
        confirm: bool = False,
        keep_anonymized: bool = True
    ) -> Dict[str, Any]:
        """
        Delete all user data.
        Implements GDPR Article 17 - Right to erasure ("right to be forgotten").
        """
        if not confirm:
            return {
                'success': False,
                'error': 'Deletion must be explicitly confirmed',
                'warning': 'This action is irreversible. All your data will be permanently deleted.'
            }
        
        from app.models import User
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {'success': False, 'error': 'User not found'}
        
        try:
            deleted_counts = {}
            
            if keep_anonymized:
                # Anonymize instead of delete (keeps data integrity)
                deleted_counts = await self._anonymize_user_data(user_id)
            else:
                # Hard delete all data
                deleted_counts = await self._hard_delete_user_data(user_id)
            
            # Log the deletion
            self._log_data_access(
                user_id=user_id,
                action='data_deletion',
                details={
                    'type': 'anonymized' if keep_anonymized else 'hard_delete',
                    'counts': deleted_counts
                }
            )
            
            return {
                'success': True,
                'message': 'User data has been deleted',
                'deleted_counts': deleted_counts,
                'type': 'anonymized' if keep_anonymized else 'hard_delete'
            }
            
        except Exception as e:
            logger.error(f"Data deletion error: {e}")
            self.db.rollback()
            return {'success': False, 'error': str(e)}
    
    async def _anonymize_user_data(self, user_id: str) -> Dict[str, int]:
        """Anonymize user data (replace PII with anonymous values)."""
        from app.models import User
        from app.models.task_collaboration import TaskComment
        from app.models.notification import Notification
        
        user = self.db.query(User).filter(User.id == user_id).first()
        
        # Anonymize user profile
        anon_id = f"deleted_{uuid.uuid4().hex[:8]}"
        user.email = f"{anon_id}@deleted.user"
        user.full_name = "Deleted User"
        user.phone = None
        user.avatar_url = None
        user.skills = None
        user.is_active = False
        user.password_hash = None
        
        # Anonymize comments (replace name mentions)
        comments = self.db.query(TaskComment).filter(
            TaskComment.user_id == user_id
        ).all()
        
        for comment in comments:
            comment.user_id = None  # Break foreign key
        
        # Delete notifications
        deleted_notifs = self.db.query(Notification).filter(
            Notification.user_id == user_id
        ).delete()
        
        self.db.commit()
        
        return {
            'profile': 1,
            'comments': len(comments),
            'notifications': deleted_notifs
        }
    
    async def _hard_delete_user_data(self, user_id: str) -> Dict[str, int]:
        """Hard delete all user data."""
        from app.models import User, Task
        from app.models.task_collaboration import TaskComment, TaskAttachment, TaskAuditLog
        from app.models.timesheet import TimeEntry, Timesheet
        from app.models.notification import Notification
        from app.models.email_settings import EmailPreference, TaskReminder, EmailLog
        
        counts = {}
        
        # Delete in order of dependencies
        counts['audit_logs'] = self.db.query(TaskAuditLog).filter(
            TaskAuditLog.user_id == user_id
        ).delete()
        
        counts['comments'] = self.db.query(TaskComment).filter(
            TaskComment.user_id == user_id
        ).delete()
        
        counts['attachments'] = self.db.query(TaskAttachment).filter(
            TaskAttachment.uploaded_by == user_id
        ).delete()
        
        counts['time_entries'] = self.db.query(TimeEntry).filter(
            TimeEntry.user_id == user_id
        ).delete()
        
        counts['notifications'] = self.db.query(Notification).filter(
            Notification.user_id == user_id
        ).delete()
        
        counts['email_preferences'] = self.db.query(EmailPreference).filter(
            EmailPreference.user_id == user_id
        ).delete()
        
        counts['reminders'] = self.db.query(TaskReminder).filter(
            TaskReminder.user_id == user_id
        ).delete()
        
        counts['email_logs'] = self.db.query(EmailLog).filter(
            EmailLog.user_id == user_id
        ).delete()
        
        # Unassign tasks (don't delete, just remove user reference)
        self.db.query(Task).filter(Task.assignee_id == user_id).update(
            {'assignee_id': None}
        )
        
        # Finally delete user
        self.db.query(User).filter(User.id == user_id).delete()
        counts['user'] = 1
        
        self.db.commit()
        
        return counts
    
    # ==================== Consent Management ====================
    
    def get_consent_status(self, user_id: str) -> Dict[str, Any]:
        """Get current consent settings for a user."""
        from app.models.email_settings import EmailPreference
        
        prefs = self.db.query(EmailPreference).filter(
            EmailPreference.user_id == user_id
        ).first()
        
        return {
            'user_id': user_id,
            'marketing_emails': prefs.marketing_opt_in if prefs else False,
            'analytics_tracking': prefs.analytics_opt_in if prefs else True,
            'third_party_sharing': False,  # We don't share data
            'essential_communications': True,  # Required, can't opt out
            'last_updated': prefs.updated_at.isoformat() if prefs and prefs.updated_at else None
        }
    
    def update_consent(
        self,
        user_id: str,
        marketing_emails: Optional[bool] = None,
        analytics_tracking: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Update user consent preferences."""
        from app.models.email_settings import EmailPreference
        
        prefs = self.db.query(EmailPreference).filter(
            EmailPreference.user_id == user_id
        ).first()
        
        if not prefs:
            prefs = EmailPreference(
                id=str(uuid.uuid4()),
                user_id=user_id
            )
            self.db.add(prefs)
        
        if marketing_emails is not None:
            prefs.marketing_opt_in = marketing_emails
        
        if analytics_tracking is not None:
            prefs.analytics_opt_in = analytics_tracking
        
        prefs.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        # Log consent change
        self._log_data_access(
            user_id=user_id,
            action='consent_update',
            details={
                'marketing_emails': marketing_emails,
                'analytics_tracking': analytics_tracking
            }
        )
        
        return {'success': True, 'message': 'Consent preferences updated'}
    
    # ==================== Data Access Logging ====================
    
    def _log_data_access(
        self,
        user_id: str,
        action: str,
        details: Optional[Dict] = None
    ):
        """Log data access for GDPR compliance."""
        from app.models.permission import AuditLog
        
        log = AuditLog(
            id=str(uuid.uuid4()),
            action=f"gdpr_{action}",
            actor_id=user_id,
            target_type="user",
            target_id=user_id,
            details=details or {}
        )
        self.db.add(log)
        self.db.commit()
    
    def get_data_access_log(
        self,
        user_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get data access log for a user."""
        from app.models.permission import AuditLog
        
        logs = self.db.query(AuditLog).filter(
            AuditLog.target_id == user_id,
            AuditLog.action.like('gdpr_%')
        ).order_by(AuditLog.created_at.desc()).limit(limit).all()
        
        return [
            {
                'id': l.id,
                'action': l.action,
                'details': l.details,
                'created_at': l.created_at.isoformat() if l.created_at else None
            }
            for l in logs
        ]
    
    # ==================== Data Retention ====================
    
    async def cleanup_expired_data(self, retention_days: int = 365) -> Dict[str, int]:
        """Clean up data older than retention period."""
        from app.models.notification import Notification
        from app.models.email_settings import EmailLog
        from app.models.permission import AuditLog
        
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        counts = {}
        
        # Delete old notifications
        counts['notifications'] = self.db.query(Notification).filter(
            Notification.created_at < cutoff,
            Notification.is_read == True
        ).delete()
        
        # Delete old email logs
        counts['email_logs'] = self.db.query(EmailLog).filter(
            EmailLog.created_at < cutoff
        ).delete()
        
        # Keep audit logs longer (7 years for compliance)
        audit_cutoff = datetime.utcnow() - timedelta(days=2555)  # ~7 years
        counts['audit_logs'] = self.db.query(AuditLog).filter(
            AuditLog.created_at < audit_cutoff
        ).delete()
        
        self.db.commit()
        
        logger.info(f"Data retention cleanup: {counts}")
        
        return counts
