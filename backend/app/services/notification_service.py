"""
Notification service for creating notifications throughout the application.
This service can be imported and used in other routers to automatically
create notifications when certain events occur.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Notification, User


class NotificationService:
    """Service for managing notifications."""
    
    @staticmethod
    def create_notification(
        db: Session,
        user_id: str,
        notification_type: str,
        title: str,
        message: str = None,
        link: str = None,
        data: dict = None
    ) -> Notification:
        """Create a new notification for a user."""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            link=link,
            data=data,
            is_read=False
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification
    
    @staticmethod
    def notify_task_assigned(
        db: Session,
        assignee_id: str,
        task_name: str,
        task_id: str,
        assigner_name: str = None
    ) -> Notification:
        """Notify a user they have been assigned a task."""
        message = f"You have been assigned to '{task_name}'"
        if assigner_name:
            message += f" by {assigner_name}"
        
        return NotificationService.create_notification(
            db=db,
            user_id=assignee_id,
            notification_type="task_assigned",
            title="Task Assigned",
            message=message,
            link=f"/tasks/{task_id}"
        )
    
    @staticmethod
    def notify_task_completed(
        db: Session,
        user_id: str,
        task_name: str,
        task_id: str,
        completed_by: str = None
    ) -> Notification:
        """Notify a user that a task has been completed."""
        message = f"Task '{task_name}' has been completed"
        if completed_by:
            message += f" by {completed_by}"
        
        return NotificationService.create_notification(
            db=db,
            user_id=user_id,
            notification_type="task",
            title="Task Completed",
            message=message,
            link=f"/tasks/{task_id}"
        )
    
    @staticmethod
    def notify_comment(
        db: Session,
        user_id: str,
        commenter_name: str,
        task_name: str,
        task_id: str,
        comment_preview: str = None
    ) -> Notification:
        """Notify a user about a new comment on their task."""
        message = f"{commenter_name} commented on '{task_name}'"
        if comment_preview:
            message += f": {comment_preview[:100]}"
        
        return NotificationService.create_notification(
            db=db,
            user_id=user_id,
            notification_type="comment",
            title="New Comment",
            message=message,
            link=f"/tasks/{task_id}"
        )
    
    @staticmethod
    def notify_mention(
        db: Session,
        user_id: str,
        mentioner_name: str,
        context: str,
        link: str = None
    ) -> Notification:
        """Notify a user they have been mentioned."""
        return NotificationService.create_notification(
            db=db,
            user_id=user_id,
            notification_type="mention",
            title="You were mentioned",
            message=f"{mentioner_name} mentioned you: {context[:150]}",
            link=link or "/dashboard"
        )
    
    @staticmethod
    def notify_due_soon(
        db: Session,
        user_id: str,
        task_name: str,
        task_id: str,
        hours_remaining: int = 24
    ) -> Notification:
        """Notify a user that a task is due soon."""
        if hours_remaining < 1:
            time_str = "less than an hour"
        elif hours_remaining == 1:
            time_str = "1 hour"
        elif hours_remaining < 24:
            time_str = f"{hours_remaining} hours"
        else:
            days = hours_remaining // 24
            time_str = f"{days} day{'s' if days > 1 else ''}"
        
        return NotificationService.create_notification(
            db=db,
            user_id=user_id,
            notification_type="reminder",
            title="Task Due Soon",
            message=f"'{task_name}' is due in {time_str}",
            link=f"/tasks/{task_id}"
        )
    
    @staticmethod
    def notify_approval_request(
        db: Session,
        approver_id: str,
        requester_name: str,
        request_type: str,
        link: str = None
    ) -> Notification:
        """Notify a user about an approval request."""
        return NotificationService.create_notification(
            db=db,
            user_id=approver_id,
            notification_type="approval",
            title="Approval Request",
            message=f"{requester_name} submitted a {request_type} for your approval",
            link=link or "/my-expense/approvals"
        )
    
    @staticmethod
    def notify_expense_status(
        db: Session,
        user_id: str,
        expense_title: str,
        status: str,
        expense_id: str = None
    ) -> Notification:
        """Notify a user about expense status change."""
        status_messages = {
            "approved": "has been approved",
            "rejected": "has been rejected",
            "pending": "is pending review",
            "paid": "has been paid"
        }
        message = f"Your expense '{expense_title}' {status_messages.get(status, 'status updated')}"
        
        return NotificationService.create_notification(
            db=db,
            user_id=user_id,
            notification_type="approval",
            title=f"Expense {status.title()}",
            message=message,
            link=f"/my-expense" if expense_id else "/my-expense"
        )
    
    @staticmethod
    def notify_system(
        db: Session,
        user_id: str,
        title: str,
        message: str,
        link: str = None
    ) -> Notification:
        """Send a system notification to a user."""
        return NotificationService.create_notification(
            db=db,
            user_id=user_id,
            notification_type="system",
            title=title,
            message=message,
            link=link or "/dashboard"
        )
    
    @staticmethod
    def notify_all_users(
        db: Session,
        title: str,
        message: str,
        notification_type: str = "system",
        link: str = None
    ) -> int:
        """Send a notification to all active users."""
        users = db.query(User).filter(User.is_active == True).all()
        count = 0
        for user in users:
            NotificationService.create_notification(
                db=db,
                user_id=user.id,
                notification_type=notification_type,
                title=title,
                message=message,
                link=link
            )
            count += 1
        return count


# Convenience instance
notification_service = NotificationService()
