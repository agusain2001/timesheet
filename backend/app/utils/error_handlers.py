"""
Centralized error handling for the LightIDEA API.
Provides consistent error responses and exception handlers.
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, OperationalError
import logging

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base application error."""
    def __init__(self, message: str, code: str = "APP_ERROR", status_code: int = 400, field: str = None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.field = field
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, resource: str, resource_id: str = None):
        msg = f"{resource} not found" if not resource_id else f"{resource} '{resource_id}' not found"
        super().__init__(msg, "NOT_FOUND", 404)


class ForbiddenError(AppError):
    def __init__(self, action: str = "perform this action"):
        super().__init__(f"You do not have permission to {action}", "FORBIDDEN", 403)


class ConflictError(AppError):
    def __init__(self, message: str, field: str = None):
        super().__init__(message, "CONFLICT", 409, field)


class ValidationError(AppError):
    def __init__(self, message: str, field: str = None):
        super().__init__(message, "VALIDATION_ERROR", 422, field)


class DependencyBlockedError(AppError):
    def __init__(self, blocking_tasks: list):
        names = ", ".join(t.get("name", t.get("id", "")) for t in blocking_tasks)
        super().__init__(
            f"Cannot progress: task is blocked by: {names}",
            "DEPENDENCY_BLOCKED",
            409
        )
        self.blocking_tasks = blocking_tasks


def register_error_handlers(app: FastAPI):
    """Register all error handlers on the FastAPI app."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        content = {
            "detail": exc.message,
            "code": exc.code,
        }
        if exc.field:
            content["field"] = exc.field
        if isinstance(exc, DependencyBlockedError):
            content["blocking_tasks"] = exc.blocking_tasks
        return JSONResponse(status_code=exc.status_code, content=content)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "code": "HTTP_ERROR"}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error.get("loc", []) if loc != "body")
            errors.append({"field": field, "message": error.get("msg", "Invalid value")})
        return JSONResponse(
            status_code=422,
            content={"detail": "Validation failed", "code": "VALIDATION_ERROR", "errors": errors}
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        logger.error(f"DB integrity error: {exc}")
        return JSONResponse(
            status_code=409,
            content={"detail": "A record with this value already exists", "code": "CONFLICT"}
        )

    @app.exception_handler(OperationalError)
    async def db_error_handler(request: Request, exc: OperationalError):
        logger.error(f"DB operational error: {exc}")
        return JSONResponse(
            status_code=503,
            content={"detail": "Database temporarily unavailable", "code": "DB_ERROR"}
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled error: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred", "code": "INTERNAL_ERROR"}
        )
