"""
Google Calendar Integration Service.
Handles OAuth 2.0 authentication and two-way calendar sync.
"""
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

# Google Calendar API imports (conditional)
try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build
    HAS_GOOGLE_API = True
except ImportError:
    HAS_GOOGLE_API = False
    logger.warning("Google API libraries not installed. Install with: pip install google-api-python-client google-auth-oauthlib")


class GoogleCalendarConfig:
    """Google Calendar configuration from environment."""
    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
        self.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/integrations/google/callback")
        self.scopes = [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events"
        ]


class GoogleCalendarService:
    """
    Production Google Calendar integration service.
    Supports OAuth 2.0 authentication and two-way task/event sync.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.config = GoogleCalendarConfig()
    
    # ==================== OAuth 2.0 Flow ====================
    
    def get_authorization_url(self, user_id: str, state: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate Google OAuth authorization URL.
        User will be redirected here to grant calendar access.
        """
        if not HAS_GOOGLE_API:
            return {'success': False, 'error': 'Google API libraries not installed'}
        
        if not self.config.client_id or not self.config.client_secret:
            return {'success': False, 'error': 'Google OAuth not configured'}
        
        # Create OAuth flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.config.client_id,
                    "client_secret": self.config.client_secret,
                    "redirect_uris": [self.config.redirect_uri],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token"
                }
            },
            scopes=self.config.scopes
        )
        
        flow.redirect_uri = self.config.redirect_uri
        
        # Generate state if not provided
        if not state:
            state = f"{user_id}:{uuid.uuid4().hex}"
        
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=state,
            prompt='consent'
        )
        
        return {
            'success': True,
            'authorization_url': auth_url,
            'state': state
        }
    
    def handle_oauth_callback(
        self,
        code: str,
        state: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Handle OAuth callback and store credentials.
        """
        if not HAS_GOOGLE_API:
            return {'success': False, 'error': 'Google API libraries not installed'}
        
        try:
            # Create OAuth flow
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": self.config.client_id,
                        "client_secret": self.config.client_secret,
                        "redirect_uris": [self.config.redirect_uri],
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token"
                    }
                },
                scopes=self.config.scopes
            )
            
            flow.redirect_uri = self.config.redirect_uri
            
            # Exchange code for tokens
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # Store credentials in database
            self._store_credentials(user_id, credentials)
            
            return {
                'success': True,
                'message': 'Google Calendar connected successfully'
            }
            
        except Exception as e:
            logger.error(f"OAuth callback error: {e}")
            return {'success': False, 'error': str(e)}
    
    def _store_credentials(self, user_id: str, credentials):
        """Store OAuth credentials in database."""
        from app.models.integration import Integration
        
        # Check if integration exists
        integration = self.db.query(Integration).filter(
            Integration.user_id == user_id,
            Integration.provider == 'google_calendar'
        ).first()
        
        cred_data = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes,
            'expiry': credentials.expiry.isoformat() if credentials.expiry else None
        }
        
        if integration:
            integration.credentials = cred_data
            integration.is_active = True
            integration.last_sync_at = datetime.utcnow()
        else:
            integration = Integration(
                id=str(uuid.uuid4()),
                user_id=user_id,
                name='Google Calendar',
                type='calendar',
                provider='google_calendar',
                credentials=cred_data,
                is_active=True
            )
            self.db.add(integration)
        
        self.db.commit()
    
    def _get_credentials(self, user_id: str) -> Optional[Any]:
        """Get OAuth credentials from database."""
        from app.models.integration import Integration
        
        integration = self.db.query(Integration).filter(
            Integration.user_id == user_id,
            Integration.provider == 'google_calendar',
            Integration.is_active == True
        ).first()
        
        if not integration or not integration.credentials:
            return None
        
        cred_data = integration.credentials
        
        credentials = Credentials(
            token=cred_data.get('token'),
            refresh_token=cred_data.get('refresh_token'),
            token_uri=cred_data.get('token_uri'),
            client_id=cred_data.get('client_id'),
            client_secret=cred_data.get('client_secret'),
            scopes=cred_data.get('scopes')
        )
        
        return credentials
    
    def _get_calendar_service(self, user_id: str):
        """Get Google Calendar API service."""
        credentials = self._get_credentials(user_id)
        
        if not credentials:
            raise ValueError("No Google Calendar credentials found for user")
        
        # Refresh if expired
        if credentials.expired and credentials.refresh_token:
            from google.auth.transport.requests import Request
            credentials.refresh(Request())
            self._store_credentials(user_id, credentials)
        
        return build('calendar', 'v3', credentials=credentials)
    
    # ==================== Calendar Operations ====================
    
    def list_calendars(self, user_id: str) -> List[Dict[str, Any]]:
        """List user's Google calendars."""
        if not HAS_GOOGLE_API:
            return []
        
        try:
            service = self._get_calendar_service(user_id)
            
            calendars = service.calendarList().list().execute()
            
            return [
                {
                    'id': cal['id'],
                    'name': cal['summary'],
                    'description': cal.get('description', ''),
                    'is_primary': cal.get('primary', False),
                    'background_color': cal.get('backgroundColor'),
                    'timezone': cal.get('timeZone')
                }
                for cal in calendars.get('items', [])
            ]
        except Exception as e:
            logger.error(f"List calendars error: {e}")
            return []
    
    def get_events(
        self,
        user_id: str,
        calendar_id: str = 'primary',
        time_min: Optional[datetime] = None,
        time_max: Optional[datetime] = None,
        max_results: int = 100
    ) -> List[Dict[str, Any]]:
        """Get calendar events."""
        if not HAS_GOOGLE_API:
            return []
        
        try:
            service = self._get_calendar_service(user_id)
            
            if not time_min:
                time_min = datetime.utcnow()
            if not time_max:
                time_max = time_min + timedelta(days=30)
            
            events = service.events().list(
                calendarId=calendar_id,
                timeMin=time_min.isoformat() + 'Z',
                timeMax=time_max.isoformat() + 'Z',
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            return [
                self._parse_event(event)
                for event in events.get('items', [])
            ]
        except Exception as e:
            logger.error(f"Get events error: {e}")
            return []
    
    def _parse_event(self, event: Dict) -> Dict[str, Any]:
        """Parse Google Calendar event to standard format."""
        start = event.get('start', {})
        end = event.get('end', {})
        
        return {
            'id': event['id'],
            'title': event.get('summary', ''),
            'description': event.get('description', ''),
            'location': event.get('location', ''),
            'start': start.get('dateTime') or start.get('date'),
            'end': end.get('dateTime') or end.get('date'),
            'all_day': 'date' in start,
            'status': event.get('status'),
            'link': event.get('htmlLink'),
            'attendees': [
                {'email': a['email'], 'response': a.get('responseStatus')}
                for a in event.get('attendees', [])
            ]
        }
    
    # ==================== Task ↔ Calendar Sync ====================
    
    async def sync_task_to_calendar(
        self,
        user_id: str,
        task_id: str,
        calendar_id: str = 'primary'
    ) -> Dict[str, Any]:
        """Sync a task to Google Calendar as an event."""
        if not HAS_GOOGLE_API:
            return {'success': False, 'error': 'Google API not available'}
        
        from app.models import Task
        
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {'success': False, 'error': 'Task not found'}
        
        try:
            service = self._get_calendar_service(user_id)
            
            # Create event from task
            event_body = self._task_to_event(task)
            
            # Check if event already exists
            existing_event_id = self._get_linked_event_id(task)
            
            if existing_event_id:
                # Update existing event
                event = service.events().update(
                    calendarId=calendar_id,
                    eventId=existing_event_id,
                    body=event_body
                ).execute()
            else:
                # Create new event
                event = service.events().insert(
                    calendarId=calendar_id,
                    body=event_body
                ).execute()
                
                # Store event ID in task
                self._link_event_to_task(task, event['id'])
            
            return {
                'success': True,
                'event_id': event['id'],
                'event_link': event.get('htmlLink')
            }
            
        except Exception as e:
            logger.error(f"Task sync error: {e}")
            return {'success': False, 'error': str(e)}
    
    def _task_to_event(self, task) -> Dict[str, Any]:
        """Convert a task to Google Calendar event format."""
        # Determine start and end dates
        if task.due_date:
            if task.start_date:
                start = task.start_date
                end = task.due_date
            else:
                start = task.due_date
                end = task.due_date + timedelta(hours=1)
        else:
            # Default to today
            start = datetime.utcnow()
            end = start + timedelta(hours=1)
        
        # Build description
        description_parts = []
        if task.description:
            description_parts.append(task.description)
        description_parts.append(f"\n\n---\nSynced from LightIDEA\nTask ID: {task.id}")
        if task.project:
            description_parts.append(f"Project: {task.project.name}")
        
        # Priority to color mapping
        color_map = {
            'urgent': '11',  # Red
            'high': '6',     # Orange
            'medium': '5',   # Yellow
            'low': '10'      # Green
        }
        
        return {
            'summary': f"[{task.priority.upper()}] {task.name}",
            'description': '\n'.join(description_parts),
            'start': {
                'dateTime': start.isoformat() + 'Z',
                'timeZone': 'UTC'
            },
            'end': {
                'dateTime': end.isoformat() + 'Z',
                'timeZone': 'UTC'
            },
            'colorId': color_map.get(task.priority, '0'),
            'reminders': {
                'useDefault': True
            }
        }
    
    def _get_linked_event_id(self, task) -> Optional[str]:
        """Get linked Google Calendar event ID from task."""
        if task.custom_fields and isinstance(task.custom_fields, dict):
            return task.custom_fields.get('google_calendar_event_id')
        return None
    
    def _link_event_to_task(self, task, event_id: str):
        """Store Google Calendar event ID in task."""
        if not task.custom_fields:
            task.custom_fields = {}
        
        task.custom_fields['google_calendar_event_id'] = event_id
        self.db.commit()
    
    async def sync_calendar_to_tasks(
        self,
        user_id: str,
        calendar_id: str = 'primary',
        project_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Sync calendar events to tasks (import from calendar)."""
        if not HAS_GOOGLE_API:
            return {'success': False, 'error': 'Google API not available'}
        
        from app.models import Task
        
        try:
            events = self.get_events(
                user_id=user_id,
                calendar_id=calendar_id,
                time_min=datetime.utcnow(),
                time_max=datetime.utcnow() + timedelta(days=30)
            )
            
            created = 0
            updated = 0
            
            for event in events:
                # Skip already linked events
                existing = self.db.query(Task).filter(
                    Task.custom_fields.contains({'google_calendar_event_id': event['id']})
                ).first()
                
                if existing:
                    # Update existing task
                    existing.name = event['title']
                    if event['description']:
                        existing.description = event['description']
                    if event['start']:
                        existing.due_date = datetime.fromisoformat(event['start'].replace('Z', '+00:00'))
                    updated += 1
                else:
                    # Create new task from event
                    task = Task(
                        id=str(uuid.uuid4()),
                        name=event['title'],
                        description=event.get('description', ''),
                        status='todo',
                        priority='medium',
                        owner_id=user_id,
                        assignee_id=user_id,
                        project_id=project_id,
                        custom_fields={'google_calendar_event_id': event['id']}
                    )
                    
                    if event['start']:
                        task.due_date = datetime.fromisoformat(event['start'].replace('Z', '+00:00'))
                    
                    self.db.add(task)
                    created += 1
            
            self.db.commit()
            
            # Update last sync time
            self._update_last_sync(user_id)
            
            return {
                'success': True,
                'created': created,
                'updated': updated,
                'total_events': len(events)
            }
            
        except Exception as e:
            logger.error(f"Calendar sync error: {e}")
            return {'success': False, 'error': str(e)}
    
    def _update_last_sync(self, user_id: str):
        """Update last sync timestamp."""
        from app.models.integration import Integration
        
        integration = self.db.query(Integration).filter(
            Integration.user_id == user_id,
            Integration.provider == 'google_calendar'
        ).first()
        
        if integration:
            integration.last_sync_at = datetime.utcnow()
            self.db.commit()
    
    # ==================== Disconnect ====================
    
    def disconnect(self, user_id: str) -> Dict[str, Any]:
        """Disconnect Google Calendar integration."""
        from app.models.integration import Integration
        
        integration = self.db.query(Integration).filter(
            Integration.user_id == user_id,
            Integration.provider == 'google_calendar'
        ).first()
        
        if integration:
            integration.is_active = False
            integration.credentials = None
            self.db.commit()
            return {'success': True, 'message': 'Google Calendar disconnected'}
        
        return {'success': False, 'error': 'Integration not found'}
