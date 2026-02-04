"""
Scheduler Service - APScheduler-based task scheduling for reports and notifications.
Handles scheduled reports, reminder notifications, digest emails, and escalation checks.
"""
import os
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Callable, Dict, Any, List
import logging
from enum import Enum

logger = logging.getLogger(__name__)

# Try to import APScheduler, fall back to simple implementation if not available
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.triggers.date import DateTrigger
    from apscheduler.jobstores.memory import MemoryJobStore
    HAS_APSCHEDULER = True
except ImportError:
    HAS_APSCHEDULER = False
    logger.warning("APScheduler not installed. Using fallback scheduler.")


class JobType(str, Enum):
    """Types of scheduled jobs."""
    DAILY_DIGEST = "daily_digest"
    WEEKLY_DIGEST = "weekly_digest"
    SCHEDULED_REPORT = "scheduled_report"
    REMINDER = "reminder"
    ESCALATION_CHECK = "escalation_check"
    SLA_CHECK = "sla_check"
    CLEANUP = "cleanup"


class SchedulerService:
    """
    Production-ready scheduler service using APScheduler.
    Handles all time-based operations in the system.
    """
    
    _instance: Optional['SchedulerService'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._db_session_factory = None
        self._jobs: Dict[str, Any] = {}
        
        if HAS_APSCHEDULER:
            jobstores = {'default': MemoryJobStore()}
            self.scheduler = AsyncIOScheduler(jobstores=jobstores)
        else:
            self.scheduler = None
        
        self._started = False
    
    def set_db_session_factory(self, factory: Callable):
        """Set database session factory for jobs."""
        self._db_session_factory = factory
    
    def start(self):
        """Start the scheduler."""
        if self._started:
            return
        
        if self.scheduler:
            self.scheduler.start()
            self._started = True
            logger.info("Scheduler started")
            
            # Add default system jobs
            self._schedule_system_jobs()
        else:
            logger.warning("Scheduler not available")
    
    def stop(self):
        """Stop the scheduler."""
        if self.scheduler and self._started:
            self.scheduler.shutdown()
            self._started = False
            logger.info("Scheduler stopped")
    
    def _schedule_system_jobs(self):
        """Schedule default system jobs."""
        # Daily digest emails at 8 AM
        self.add_cron_job(
            job_id="system_daily_digest",
            func=self._run_daily_digest,
            hour=8,
            minute=0
        )
        
        # Weekly digest emails on Monday at 9 AM
        self.add_cron_job(
            job_id="system_weekly_digest",
            func=self._run_weekly_digest,
            day_of_week='mon',
            hour=9,
            minute=0
        )
        
        # Escalation check every hour
        self.add_interval_job(
            job_id="system_escalation_check",
            func=self._run_escalation_check,
            hours=1
        )
        
        # SLA check every 30 minutes
        self.add_interval_job(
            job_id="system_sla_check",
            func=self._run_sla_check,
            minutes=30
        )
        
        # Reminder check every 15 minutes
        self.add_interval_job(
            job_id="system_reminder_check",
            func=self._run_reminder_check,
            minutes=15
        )
        
        # Cleanup old data weekly
        self.add_cron_job(
            job_id="system_cleanup",
            func=self._run_cleanup,
            day_of_week='sun',
            hour=2,
            minute=0
        )
        
        logger.info("System jobs scheduled")
    
    def add_cron_job(
        self,
        job_id: str,
        func: Callable,
        year: Optional[int] = None,
        month: Optional[int] = None,
        day: Optional[int] = None,
        week: Optional[int] = None,
        day_of_week: Optional[str] = None,
        hour: Optional[int] = None,
        minute: Optional[int] = None,
        second: Optional[int] = 0,
        **kwargs
    ) -> bool:
        """Add a cron-scheduled job."""
        if not self.scheduler:
            return False
        
        try:
            trigger = CronTrigger(
                year=year,
                month=month,
                day=day,
                week=week,
                day_of_week=day_of_week,
                hour=hour,
                minute=minute,
                second=second
            )
            
            self.scheduler.add_job(
                func,
                trigger=trigger,
                id=job_id,
                replace_existing=True,
                **kwargs
            )
            
            self._jobs[job_id] = {
                'type': 'cron',
                'func': func.__name__,
                'created_at': datetime.utcnow()
            }
            
            logger.info(f"Added cron job: {job_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to add cron job {job_id}: {e}")
            return False
    
    def add_interval_job(
        self,
        job_id: str,
        func: Callable,
        weeks: int = 0,
        days: int = 0,
        hours: int = 0,
        minutes: int = 0,
        seconds: int = 0,
        **kwargs
    ) -> bool:
        """Add an interval-scheduled job."""
        if not self.scheduler:
            return False
        
        try:
            trigger = IntervalTrigger(
                weeks=weeks,
                days=days,
                hours=hours,
                minutes=minutes,
                seconds=seconds
            )
            
            self.scheduler.add_job(
                func,
                trigger=trigger,
                id=job_id,
                replace_existing=True,
                **kwargs
            )
            
            self._jobs[job_id] = {
                'type': 'interval',
                'func': func.__name__,
                'created_at': datetime.utcnow()
            }
            
            logger.info(f"Added interval job: {job_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to add interval job {job_id}: {e}")
            return False
    
    def add_one_time_job(
        self,
        job_id: str,
        func: Callable,
        run_at: datetime,
        **kwargs
    ) -> bool:
        """Add a one-time scheduled job."""
        if not self.scheduler:
            return False
        
        try:
            trigger = DateTrigger(run_date=run_at)
            
            self.scheduler.add_job(
                func,
                trigger=trigger,
                id=job_id,
                replace_existing=True,
                **kwargs
            )
            
            self._jobs[job_id] = {
                'type': 'one_time',
                'func': func.__name__,
                'run_at': run_at,
                'created_at': datetime.utcnow()
            }
            
            logger.info(f"Added one-time job: {job_id} at {run_at}")
            return True
        except Exception as e:
            logger.error(f"Failed to add one-time job {job_id}: {e}")
            return False
    
    def remove_job(self, job_id: str) -> bool:
        """Remove a scheduled job."""
        if not self.scheduler:
            return False
        
        try:
            self.scheduler.remove_job(job_id)
            self._jobs.pop(job_id, None)
            logger.info(f"Removed job: {job_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to remove job {job_id}: {e}")
            return False
    
    def get_job_info(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a scheduled job."""
        if not self.scheduler:
            return None
        
        try:
            job = self.scheduler.get_job(job_id)
            if job:
                return {
                    'id': job.id,
                    'name': job.name,
                    'next_run': job.next_run_time,
                    'trigger': str(job.trigger),
                    **self._jobs.get(job_id, {})
                }
            return None
        except Exception as e:
            logger.error(f"Failed to get job info {job_id}: {e}")
            return None
    
    def list_jobs(self) -> List[Dict[str, Any]]:
        """List all scheduled jobs."""
        if not self.scheduler:
            return []
        
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run': job.next_run_time,
                'trigger': str(job.trigger)
            })
        return jobs
    
    # ==================== System Job Implementations ====================
    
    async def _run_daily_digest(self):
        """Send daily digest emails to all users with the preference enabled."""
        logger.info("Running daily digest job")
        
        if not self._db_session_factory:
            return
        
        from app.models import User
        from app.models.email_settings import EmailPreference
        from app.services.email_service import email_service, EmailTemplates
        
        db = self._db_session_factory()
        try:
            # Get users with daily digest enabled
            prefs = db.query(EmailPreference).filter(
                EmailPreference.daily_summary == True
            ).all()
            
            for pref in prefs:
                user = db.query(User).filter(User.id == pref.user_id).first()
                if not user or not user.email:
                    continue
                
                # Get user's tasks
                from app.models import Task
                
                now = datetime.utcnow()
                today = now.date()
                
                tasks_due = db.query(Task).filter(
                    Task.assignee_id == user.id,
                    Task.status.notin_(['completed', 'cancelled']),
                    Task.due_date >= now,
                    Task.due_date < now + timedelta(days=1)
                ).all()
                
                tasks_overdue = db.query(Task).filter(
                    Task.assignee_id == user.id,
                    Task.status.notin_(['completed', 'cancelled']),
                    Task.due_date < now
                ).all()
                
                if tasks_due or tasks_overdue:
                    html = EmailTemplates.daily_digest(
                        user.full_name,
                        [{'name': t.name, 'due_date': str(t.due_date)} for t in tasks_due],
                        [{'name': t.name, 'due_date': str(t.due_date)} for t in tasks_overdue]
                    )
                    
                    await email_service.send_email_async(
                        user.email,
                        f"Daily Digest - {today}",
                        html
                    )
            
            logger.info("Daily digest completed")
        except Exception as e:
            logger.error(f"Daily digest error: {e}")
        finally:
            db.close()
    
    async def _run_weekly_digest(self):
        """Send weekly digest emails."""
        logger.info("Running weekly digest job")
        
        if not self._db_session_factory:
            return
        
        from app.models import User
        from app.models.email_settings import EmailPreference
        from app.services.email_service import email_service, EmailTemplates
        
        db = self._db_session_factory()
        try:
            prefs = db.query(EmailPreference).filter(
                EmailPreference.weekly_digest == True
            ).all()
            
            for pref in prefs:
                user = db.query(User).filter(User.id == pref.user_id).first()
                if not user or not user.email:
                    continue
                
                # Get weekly stats
                from app.models import Task
                
                week_start = datetime.utcnow() - timedelta(days=7)
                
                completed = db.query(Task).filter(
                    Task.assignee_id == user.id,
                    Task.completed_at >= week_start
                ).count()
                
                created = db.query(Task).filter(
                    Task.owner_id == user.id,
                    Task.created_at >= week_start
                ).count()
                
                overdue = db.query(Task).filter(
                    Task.assignee_id == user.id,
                    Task.status.notin_(['completed', 'cancelled']),
                    Task.due_date < datetime.utcnow()
                ).count()
                
                html = EmailTemplates.weekly_summary(
                    user.full_name,
                    completed,
                    created,
                    overdue
                )
                
                await email_service.send_email_async(
                    user.email,
                    f"Weekly Summary",
                    html
                )
            
            logger.info("Weekly digest completed")
        except Exception as e:
            logger.error(f"Weekly digest error: {e}")
        finally:
            db.close()
    
    async def _run_escalation_check(self):
        """Check for tasks that need escalation."""
        logger.info("Running escalation check")
        
        if not self._db_session_factory:
            return
        
        db = self._db_session_factory()
        try:
            from app.models import Task, User
            from app.models.notification import NotificationRule
            from app.services.escalation_service import EscalationService
            
            escalation_service = EscalationService(db)
            await escalation_service.check_and_escalate_tasks()
            
            logger.info("Escalation check completed")
        except Exception as e:
            logger.error(f"Escalation check error: {e}")
        finally:
            db.close()
    
    async def _run_sla_check(self):
        """Check for SLA breaches."""
        logger.info("Running SLA check")
        
        if not self._db_session_factory:
            return
        
        db = self._db_session_factory()
        try:
            from app.services.sla_service import SLAService
            
            sla_service = SLAService(db)
            await sla_service.check_sla_compliance()
            
            logger.info("SLA check completed")
        except Exception as e:
            logger.error(f"SLA check error: {e}")
        finally:
            db.close()
    
    async def _run_reminder_check(self):
        """Check and send task reminders."""
        logger.info("Running reminder check")
        
        if not self._db_session_factory:
            return
        
        db = self._db_session_factory()
        try:
            from app.models import Task, User
            from app.models.email_settings import TaskReminder
            from app.services.email_service import email_service, EmailTemplates
            
            now = datetime.utcnow()
            
            # Get pending reminders
            reminders = db.query(TaskReminder).filter(
                TaskReminder.is_sent == False,
                TaskReminder.reminder_date <= now
            ).all()
            
            for reminder in reminders:
                task = db.query(Task).filter(Task.id == reminder.task_id).first()
                user = db.query(User).filter(User.id == reminder.user_id).first()
                
                if task and user and user.email:
                    html = EmailTemplates.deadline_reminder(
                        task.name,
                        str(task.due_date) if task.due_date else "Not set",
                        f"/tasks/{task.id}"
                    )
                    
                    await email_service.send_email_async(
                        user.email,
                        f"Reminder: {task.name}",
                        html
                    )
                    
                    reminder.is_sent = True
                    reminder.sent_at = now
            
            db.commit()
            logger.info(f"Sent {len(reminders)} reminders")
        except Exception as e:
            logger.error(f"Reminder check error: {e}")
            db.rollback()
        finally:
            db.close()
    
    async def _run_cleanup(self):
        """Clean up old data."""
        logger.info("Running cleanup job")
        
        if not self._db_session_factory:
            return
        
        db = self._db_session_factory()
        try:
            from app.models.email_settings import EmailLog
            from app.models.notification import Notification
            
            # Delete email logs older than 90 days
            cutoff = datetime.utcnow() - timedelta(days=90)
            
            deleted_logs = db.query(EmailLog).filter(
                EmailLog.created_at < cutoff
            ).delete()
            
            # Delete read notifications older than 30 days
            notif_cutoff = datetime.utcnow() - timedelta(days=30)
            deleted_notifs = db.query(Notification).filter(
                Notification.is_read == True,
                Notification.created_at < notif_cutoff
            ).delete()
            
            db.commit()
            logger.info(f"Cleanup: deleted {deleted_logs} logs, {deleted_notifs} notifications")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
            db.rollback()
        finally:
            db.close()
    
    # ==================== Scheduled Reports ====================
    
    def schedule_report(
        self,
        report_id: str,
        report_type: str,
        user_id: str,
        frequency: str,  # daily, weekly, monthly
        day_of_week: Optional[int] = None,  # 0-6 for weekly
        day_of_month: Optional[int] = None,  # 1-31 for monthly
        hour: int = 9,
        minute: int = 0
    ) -> bool:
        """Schedule a recurring report."""
        job_id = f"report_{report_id}"
        
        kwargs = {'args': [report_id, report_type, user_id]}
        
        if frequency == 'daily':
            return self.add_cron_job(
                job_id=job_id,
                func=self._generate_and_send_report,
                hour=hour,
                minute=minute,
                **kwargs
            )
        elif frequency == 'weekly':
            dow = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day_of_week or 1]
            return self.add_cron_job(
                job_id=job_id,
                func=self._generate_and_send_report,
                day_of_week=dow,
                hour=hour,
                minute=minute,
                **kwargs
            )
        elif frequency == 'monthly':
            return self.add_cron_job(
                job_id=job_id,
                func=self._generate_and_send_report,
                day=day_of_month or 1,
                hour=hour,
                minute=minute,
                **kwargs
            )
        
        return False
    
    async def _generate_and_send_report(self, report_id: str, report_type: str, user_id: str):
        """Generate and email a scheduled report."""
        logger.info(f"Generating scheduled report: {report_id}")
        
        if not self._db_session_factory:
            return
        
        db = self._db_session_factory()
        try:
            from app.models import User
            from app.services.report_service import ReportService
            from app.services.email_service import email_service
            
            user = db.query(User).filter(User.id == user_id).first()
            if not user or not user.email:
                return
            
            report_service = ReportService(db)
            report_data = await report_service.generate_report(report_type, user_id)
            
            # Send email with report
            html = f"""
            <h2>{report_type.replace('_', ' ').title()} Report</h2>
            <p>Your scheduled report is ready.</p>
            <pre>{report_data}</pre>
            """
            
            await email_service.send_email_async(
                user.email,
                f"Scheduled Report: {report_type.replace('_', ' ').title()}",
                html
            )
            
            logger.info(f"Sent scheduled report {report_id} to {user.email}")
        except Exception as e:
            logger.error(f"Report generation error: {e}")
        finally:
            db.close()


# Singleton instance
scheduler_service = SchedulerService()


def get_scheduler() -> SchedulerService:
    """Get the scheduler service singleton."""
    return scheduler_service
