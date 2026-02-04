"""Reminder and escalation scheduler service."""
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import asyncio
import logging

from app.database import SessionLocal
from app.models import Task, User, Notification
from app.models.notification import NotificationRule
from app.services.email_service import (
    email_service, 
    send_deadline_reminder_email,
    send_daily_digest_email
)

logger = logging.getLogger(__name__)


class ReminderScheduler:
    """Service for scheduling and sending task reminders."""
    
    def __init__(self):
        self.is_running = False
    
    async def check_and_send_reminders(self, db: Session):
        """Check for tasks needing reminders and send them."""
        now = datetime.utcnow()
        today = now.date()
        tomorrow = today + timedelta(days=1)
        
        # Get tasks due tomorrow (1-day reminder)
        tasks_due_tomorrow = db.query(Task).filter(
            Task.status.notin_(['done', 'cancelled']),
            Task.due_date >= tomorrow,
            Task.due_date < tomorrow + timedelta(days=1),
            Task.assignee_id.isnot(None)
        ).all()
        
        for task in tasks_due_tomorrow:
            await self._send_reminder(db, task, "due_tomorrow")
        
        # Get overdue tasks
        overdue_tasks = db.query(Task).filter(
            Task.status.notin_(['done', 'cancelled']),
            Task.due_date < today,
            Task.assignee_id.isnot(None)
        ).all()
        
        for task in overdue_tasks:
            await self._send_overdue_notification(db, task)
        
        logger.info(f"Processed {len(tasks_due_tomorrow)} due reminders and {len(overdue_tasks)} overdue notifications")
    
    async def _send_reminder(self, db: Session, task: Task, reminder_type: str):
        """Send a reminder notification for a task."""
        if not task.assignee_id:
            return
        
        assignee = db.query(User).filter(User.id == task.assignee_id).first()
        if not assignee:
            return
        
        # Create in-app notification
        notification = Notification(
            user_id=assignee.id,
            type="deadline_reminder",
            title=f"Reminder: {task.name}",
            content=f"Task '{task.name}' is due {task.due_date.strftime('%Y-%m-%d')}",
            data={"task_id": task.id, "reminder_type": reminder_type},
            is_read="false"
        )
        db.add(notification)
        db.commit()
        
        # Send email if configured
        if assignee.notification_preferences and assignee.notification_preferences.get("email_reminders"):
            try:
                await send_deadline_reminder_email(
                    to_email=assignee.email,
                    task_name=task.name,
                    due_date=task.due_date.strftime('%Y-%m-%d'),
                    task_url=f"/tasks?id={task.id}"
                )
            except Exception as e:
                logger.error(f"Failed to send reminder email: {e}")
    
    async def _send_overdue_notification(self, db: Session, task: Task):
        """Send overdue notification and escalate if needed."""
        if not task.assignee_id:
            return
        
        assignee = db.query(User).filter(User.id == task.assignee_id).first()
        if not assignee:
            return
        
        days_overdue = (datetime.utcnow().date() - task.due_date.date()).days
        
        # Create overdue notification
        notification = Notification(
            user_id=assignee.id,
            type="task_overdue",
            title=f"Overdue: {task.name}",
            content=f"Task '{task.name}' is {days_overdue} days overdue!",
            data={"task_id": task.id, "days_overdue": days_overdue},
            is_read="false"
        )
        db.add(notification)
        
        # Escalation logic for tasks overdue > 3 days
        if days_overdue > 3 and task.project_id:
            await self._escalate_to_manager(db, task, days_overdue)
        
        db.commit()
    
    async def _escalate_to_manager(self, db: Session, task: Task, days_overdue: int):
        """Escalate overdue task to team lead or project manager."""
        # Find team lead or project manager
        if task.project_id:
            from app.models import Project, ProjectManager
            project = db.query(Project).filter(Project.id == task.project_id).first()
            if project:
                # Notify project managers
                managers = db.query(ProjectManager).filter(
                    ProjectManager.project_id == project.id
                ).all()
                
                for manager in managers:
                    notification = Notification(
                        user_id=manager.user_id,
                        type="escalation",
                        title=f"Escalation: {task.name}",
                        content=f"Task '{task.name}' has been overdue for {days_overdue} days and requires attention.",
                        data={
                            "task_id": task.id, 
                            "days_overdue": days_overdue,
                            "escalation_level": "project_manager"
                        },
                        is_read="false"
                    )
                    db.add(notification)
    
    async def send_daily_digests(self, db: Session):
        """Send daily digest emails to all users."""
        users = db.query(User).filter(User.is_active == True).all()
        today = datetime.utcnow().date()
        
        for user in users:
            # Skip if email digest is disabled
            if not user.notification_preferences or not user.notification_preferences.get("email_digest"):
                continue
            
            # Get user's tasks
            tasks_due_today = db.query(Task).filter(
                Task.assignee_id == user.id,
                Task.status.notin_(['done', 'cancelled']),
                Task.due_date >= today,
                Task.due_date < today + timedelta(days=1)
            ).all()
            
            overdue_tasks = db.query(Task).filter(
                Task.assignee_id == user.id,
                Task.status.notin_(['done', 'cancelled']),
                Task.due_date < today
            ).all()
            
            if tasks_due_today or overdue_tasks:
                try:
                    await send_daily_digest_email(
                        to_email=user.email,
                        user_name=user.full_name,
                        tasks_due=[{"name": t.name, "due_date": str(t.due_date)} for t in tasks_due_today],
                        tasks_overdue=[{"name": t.name, "due_date": str(t.due_date)} for t in overdue_tasks]
                    )
                except Exception as e:
                    logger.error(f"Failed to send daily digest to {user.email}: {e}")


# Singleton instance
reminder_scheduler = ReminderScheduler()


async def run_scheduled_reminders():
    """Background task to run reminders periodically."""
    while True:
        try:
            db = SessionLocal()
            await reminder_scheduler.check_and_send_reminders(db)
            db.close()
        except Exception as e:
            logger.error(f"Reminder scheduler error: {e}")
        
        # Run every hour
        await asyncio.sleep(3600)


async def run_daily_digest():
    """Background task to run daily digest at 9 AM."""
    while True:
        now = datetime.utcnow()
        # Calculate time until 9 AM
        target_hour = 9
        if now.hour >= target_hour:
            # Schedule for tomorrow
            next_run = now.replace(hour=target_hour, minute=0, second=0) + timedelta(days=1)
        else:
            next_run = now.replace(hour=target_hour, minute=0, second=0)
        
        wait_seconds = (next_run - now).total_seconds()
        await asyncio.sleep(wait_seconds)
        
        try:
            db = SessionLocal()
            await reminder_scheduler.send_daily_digests(db)
            db.close()
        except Exception as e:
            logger.error(f"Daily digest error: {e}")
