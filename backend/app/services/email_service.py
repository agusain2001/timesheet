"""Email notification service for sending email alerts."""
from typing import Optional, List
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)


# Email configuration (would typically come from environment)
class EmailConfig:
    SMTP_HOST = "smtp.gmail.com"
    SMTP_PORT = 587
    SMTP_USER = ""  # Set via environment
    SMTP_PASSWORD = ""  # Set via environment
    FROM_EMAIL = "noreply@timesheet.app"
    FROM_NAME = "TimeSheet App"
    ENABLED = False  # Disabled by default until configured


class EmailService:
    """Service for sending email notifications."""
    
    def __init__(self):
        self.config = EmailConfig()
    
    def is_configured(self) -> bool:
        """Check if email is properly configured."""
        return bool(self.config.SMTP_USER and self.config.SMTP_PASSWORD)
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email synchronously."""
        if not self.config.ENABLED or not self.is_configured():
            logger.warning("Email not configured, skipping send")
            return False
        
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.config.FROM_NAME} <{self.config.FROM_EMAIL}>"
            msg["To"] = to_email
            
            # Add text part
            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            
            # Add HTML part
            msg.attach(MIMEText(html_content, "html"))
            
            # Send
            with smtplib.SMTP(self.config.SMTP_HOST, self.config.SMTP_PORT) as server:
                server.starttls()
                server.login(self.config.SMTP_USER, self.config.SMTP_PASSWORD)
                server.sendmail(self.config.FROM_EMAIL, to_email, msg.as_string())
            
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    async def send_email_async(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email asynchronously."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.send_email(to_email, subject, html_content, text_content)
        )


# Email templates
class EmailTemplates:
    """HTML email templates for various notifications."""
    
    @staticmethod
    def base_template(content: str, title: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 24px; }}
                .content {{ padding: 24px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; }}
                .footer {{ background: #f4f4f5; padding: 16px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{title}</h1>
                </div>
                <div class="content">
                    {content}
                </div>
                <div class="footer">
                    <p>This email was sent by TimeSheet App</p>
                    <p>You can manage your notification preferences in your account settings.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    @staticmethod
    def task_assigned(task_name: str, assigned_by: str, due_date: str, task_url: str) -> str:
        content = f"""
        <h2>You've been assigned a new task</h2>
        <p><strong>{assigned_by}</strong> has assigned you to:</p>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 8px 0;">{task_name}</h3>
            <p style="margin: 0; color: #666;">Due: {due_date}</p>
        </div>
        <a href="{task_url}" class="button">View Task</a>
        """
        return EmailTemplates.base_template(content, "New Task Assignment")
    
    @staticmethod
    def deadline_reminder(task_name: str, due_date: str, task_url: str) -> str:
        content = f"""
        <h2>⏰ Deadline Reminder</h2>
        <p>Don't forget! You have an upcoming deadline:</p>
        <div style="background: #fff3cd; padding: 16px; border-radius: 8px; border-left: 4px solid #ffc107;">
            <h3 style="margin: 0 0 8px 0;">{task_name}</h3>
            <p style="margin: 0; color: #856404;"><strong>Due: {due_date}</strong></p>
        </div>
        <a href="{task_url}" class="button">View Task</a>
        """
        return EmailTemplates.base_template(content, "Deadline Reminder")
    
    @staticmethod
    def task_completed(task_name: str, completed_by: str, task_url: str) -> str:
        content = f"""
        <h2>✅ Task Completed</h2>
        <p><strong>{completed_by}</strong> has completed:</p>
        <div style="background: #d4edda; padding: 16px; border-radius: 8px; border-left: 4px solid #28a745;">
            <h3 style="margin: 0;">{task_name}</h3>
        </div>
        <a href="{task_url}" class="button">View Details</a>
        """
        return EmailTemplates.base_template(content, "Task Completed")
    
    @staticmethod
    def daily_digest(user_name: str, tasks_due: List[dict], tasks_overdue: List[dict]) -> str:
        tasks_html = ""
        
        if tasks_overdue:
            tasks_html += "<h3 style='color: #dc3545;'>⚠️ Overdue Tasks</h3><ul>"
            for task in tasks_overdue:
                tasks_html += f"<li><strong>{task['name']}</strong> - Due: {task['due_date']}</li>"
            tasks_html += "</ul>"
        
        if tasks_due:
            tasks_html += "<h3>📅 Due Today</h3><ul>"
            for task in tasks_due:
                tasks_html += f"<li><strong>{task['name']}</strong></li>"
            tasks_html += "</ul>"
        
        if not tasks_html:
            tasks_html = "<p>🎉 You're all caught up! No tasks due today.</p>"
        
        content = f"""
        <h2>Good morning, {user_name}!</h2>
        <p>Here's your daily task summary:</p>
        {tasks_html}
        <a href="/tasks" class="button">View All Tasks</a>
        """
        return EmailTemplates.base_template(content, "Daily Digest")
    
    @staticmethod
    def weekly_summary(user_name: str, completed: int, created: int, overdue: int) -> str:
        content = f"""
        <h2>Weekly Summary for {user_name}</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 16px; text-align: center; background: #d4edda; border-radius: 8px;">
                    <h2 style="margin: 0; color: #28a745;">{completed}</h2>
                    <p style="margin: 0; color: #155724;">Completed</p>
                </td>
                <td style="width: 16px;"></td>
                <td style="padding: 16px; text-align: center; background: #cce5ff; border-radius: 8px;">
                    <h2 style="margin: 0; color: #004085;">{created}</h2>
                    <p style="margin: 0; color: #004085;">New Tasks</p>
                </td>
                <td style="width: 16px;"></td>
                <td style="padding: 16px; text-align: center; background: #f8d7da; border-radius: 8px;">
                    <h2 style="margin: 0; color: #721c24;">{overdue}</h2>
                    <p style="margin: 0; color: #721c24;">Overdue</p>
                </td>
            </tr>
        </table>
        <a href="/dashboard" class="button">View Dashboard</a>
        """
        return EmailTemplates.base_template(content, "Weekly Summary")


# Singleton instance
email_service = EmailService()


# Helper functions
async def send_task_assigned_email(
    to_email: str,
    task_name: str,
    assigned_by: str,
    due_date: str,
    task_url: str
):
    """Send task assignment email."""
    html = EmailTemplates.task_assigned(task_name, assigned_by, due_date, task_url)
    await email_service.send_email_async(
        to_email=to_email,
        subject=f"New Task: {task_name}",
        html_content=html
    )


async def send_deadline_reminder_email(
    to_email: str,
    task_name: str,
    due_date: str,
    task_url: str
):
    """Send deadline reminder email."""
    html = EmailTemplates.deadline_reminder(task_name, due_date, task_url)
    await email_service.send_email_async(
        to_email=to_email,
        subject=f"Reminder: {task_name} due {due_date}",
        html_content=html
    )


async def send_daily_digest_email(
    to_email: str,
    user_name: str,
    tasks_due: List[dict],
    tasks_overdue: List[dict]
):
    """Send daily digest email."""
    html = EmailTemplates.daily_digest(user_name, tasks_due, tasks_overdue)
    await email_service.send_email_async(
        to_email=to_email,
        subject="Your Daily Task Digest",
        html_content=html
    )
