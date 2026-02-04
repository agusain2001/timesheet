"""
Enhanced OpenAPI documentation configuration.
Custom documentation with examples, authentication details, and webhook information.
"""
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from typing import Dict, Any


def custom_openapi(app: FastAPI) -> Dict[str, Any]:
    """
    Generate custom OpenAPI schema with enhanced documentation.
    """
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="LightIDEA Project Management API",
        version="3.0.0",
        description="""
# LightIDEA API Documentation

A comprehensive API for project management, time tracking, and team collaboration.

## Features

- **Project & Task Management** - Create, update, and track projects and tasks
- **Team Management** - Organize teams and manage workloads
- **Time Tracking** - Log time entries with timer support
- **AI-Powered Features** - Smart task prioritization, natural language processing
- **Reporting & Analytics** - Variance reports, team performance, burndown charts
- **Real-time Notifications** - WebSocket-based live updates
- **Integrations** - Google Calendar, webhooks, third-party services

## Getting Started

1. Create an account or login to get an authentication token
2. Include the token in the `Authorization` header: `Bearer <token>`
3. Make API requests to manage your projects and tasks

## Rate Limiting

- Standard tier: 1000 requests/hour
- Premium tier: 10000 requests/hour

## Support

For API support, contact: api-support@lightidea.com
        """,
        routes=app.routes,
    )

    # Custom security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your JWT token obtained from /api/auth/login"
        },
        "apiKey": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "API key for service-to-service communication"
        }
    }

    # Apply default security
    openapi_schema["security"] = [{"bearerAuth": []}]

    # Add tags with descriptions
    openapi_schema["tags"] = [
        {
            "name": "Authentication",
            "description": "User authentication and authorization endpoints"
        },
        {
            "name": "Users",
            "description": "User management and profile operations"
        },
        {
            "name": "Projects",
            "description": "Project CRUD and management operations"
        },
        {
            "name": "Tasks",
            "description": "Task management with status, priority, and assignments"
        },
        {
            "name": "Teams",
            "description": "Team creation and member management"
        },
        {
            "name": "Timesheets",
            "description": "Time tracking and timesheet entries"
        },
        {
            "name": "Reports",
            "description": "Analytics, variance reports, and scheduled reports"
        },
        {
            "name": "AI Features",
            "description": "AI-powered task prioritization and suggestions"
        },
        {
            "name": "Integrations & Webhooks",
            "description": "Third-party integrations and webhook management"
        },
        {
            "name": "Google Calendar",
            "description": "Google Calendar OAuth and sync operations"
        },
        {
            "name": "GDPR Compliance",
            "description": "Data export, deletion, and consent management"
        },
        {
            "name": "Permissions & Roles",
            "description": "Role-based access control and permission management"
        },
        {
            "name": "WebSocket Notifications",
            "description": "Real-time notification WebSocket endpoints"
        }
    ]

    # Add example responses
    openapi_schema["components"]["examples"] = {
        "TaskExample": {
            "summary": "Sample Task",
            "value": {
                "id": "task_abc123",
                "name": "Implement user authentication",
                "description": "Add JWT-based authentication flow",
                "status": "in_progress",
                "priority": "high",
                "due_date": "2024-02-15T23:59:59Z",
                "estimated_hours": 16,
                "assignee_id": "user_xyz789",
                "project_id": "proj_def456",
                "created_at": "2024-01-20T10:30:00Z",
                "updated_at": "2024-01-22T14:15:00Z"
            }
        },
        "ProjectExample": {
            "summary": "Sample Project",
            "value": {
                "id": "proj_def456",
                "name": "Q1 Product Launch",
                "description": "Launch new product features for Q1",
                "status": "active",
                "start_date": "2024-01-01",
                "end_date": "2024-03-31",
                "budget": 50000.00,
                "owner_id": "user_owner123",
                "team_id": "team_alpha"
            }
        },
        "ErrorExample": {
            "summary": "Error Response",
            "value": {
                "detail": "Task not found",
                "error_code": "TASK_NOT_FOUND",
                "timestamp": "2024-01-22T14:15:00Z"
            }
        },
        "WebhookPayloadExample": {
            "summary": "Webhook Payload",
            "value": {
                "event": "task.updated",
                "timestamp": "2024-01-22T14:15:00Z",
                "data": {
                    "task_id": "task_abc123",
                    "changes": {
                        "status": {
                            "old": "todo",
                            "new": "in_progress"
                        }
                    }
                },
                "signature": "sha256=abc123..."
            }
        }
    }

    # Common response schemas
    openapi_schema["components"]["schemas"]["HTTPError"] = {
        "type": "object",
        "properties": {
            "detail": {
                "type": "string",
                "description": "Error message"
            },
            "error_code": {
                "type": "string",
                "description": "Machine-readable error code"
            }
        },
        "required": ["detail"]
    }

    openapi_schema["components"]["schemas"]["PaginatedResponse"] = {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {}
            },
            "total": {
                "type": "integer",
                "description": "Total number of items"
            },
            "page": {
                "type": "integer",
                "description": "Current page number"
            },
            "per_page": {
                "type": "integer",
                "description": "Items per page"
            },
            "pages": {
                "type": "integer",
                "description": "Total number of pages"
            }
        }
    }

    # Webhooks documentation
    openapi_schema["webhooks"] = {
        "taskCreated": {
            "post": {
                "summary": "Task Created",
                "description": "Triggered when a new task is created",
                "operationId": "taskCreatedWebhook",
                "tags": ["Webhooks"],
                "requestBody": {
                    "description": "Task creation payload",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "event": {"type": "string", "example": "task.created"},
                                    "timestamp": {"type": "string", "format": "date-time"},
                                    "data": {
                                        "type": "object",
                                        "properties": {
                                            "task_id": {"type": "string"},
                                            "name": {"type": "string"},
                                            "project_id": {"type": "string"},
                                            "assignee_id": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "responses": {
                    "200": {"description": "Webhook processed successfully"}
                }
            }
        },
        "taskUpdated": {
            "post": {
                "summary": "Task Updated",
                "description": "Triggered when a task is updated",
                "operationId": "taskUpdatedWebhook",
                "tags": ["Webhooks"],
                "requestBody": {
                    "description": "Task update payload",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "event": {"type": "string", "example": "task.updated"},
                                    "timestamp": {"type": "string", "format": "date-time"},
                                    "data": {
                                        "type": "object",
                                        "properties": {
                                            "task_id": {"type": "string"},
                                            "changes": {"type": "object"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "responses": {
                    "200": {"description": "Webhook processed successfully"}
                }
            }
        },
        "taskCompleted": {
            "post": {
                "summary": "Task Completed",
                "description": "Triggered when a task status changes to done",
                "operationId": "taskCompletedWebhook",
                "tags": ["Webhooks"],
                "requestBody": {
                    "description": "Task completion payload",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "event": {"type": "string", "example": "task.completed"},
                                    "timestamp": {"type": "string", "format": "date-time"},
                                    "data": {
                                        "type": "object",
                                        "properties": {
                                            "task_id": {"type": "string"},
                                            "completed_by": {"type": "string"},
                                            "actual_hours": {"type": "number"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "responses": {
                    "200": {"description": "Webhook processed successfully"}
                }
            }
        },
        "projectCreated": {
            "post": {
                "summary": "Project Created",
                "description": "Triggered when a new project is created",
                "operationId": "projectCreatedWebhook",
                "tags": ["Webhooks"],
                "requestBody": {
                    "description": "Project creation payload",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "event": {"type": "string", "example": "project.created"},
                                    "timestamp": {"type": "string", "format": "date-time"},
                                    "data": {
                                        "type": "object",
                                        "properties": {
                                            "project_id": {"type": "string"},
                                            "name": {"type": "string"},
                                            "owner_id": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "responses": {
                    "200": {"description": "Webhook processed successfully"}
                }
            }
        }
    }

    # Server information
    openapi_schema["servers"] = [
        {
            "url": "http://localhost:8000",
            "description": "Local development server"
        },
        {
            "url": "https://api.lightidea.com",
            "description": "Production server"
        },
        {
            "url": "https://staging-api.lightidea.com",
            "description": "Staging server"
        }
    ]

    # External documentation
    openapi_schema["externalDocs"] = {
        "description": "Full API documentation and guides",
        "url": "https://docs.lightidea.com"
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema


def setup_custom_openapi(app: FastAPI):
    """
    Setup custom OpenAPI schema for the application.
    """
    app.openapi = lambda: custom_openapi(app)
