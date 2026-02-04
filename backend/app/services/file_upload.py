"""File upload service for handling receipt uploads."""
import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException


# Configure upload directory
UPLOAD_DIR = Path("uploads/receipts")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".pdf", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def ensure_upload_dir():
    """Ensure upload directory exists."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def validate_file(file: UploadFile) -> Tuple[bool, str]:
    """Validate uploaded file."""
    if not file.filename:
        return False, "No filename provided"
    
    # Check extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    
    return True, ""


async def save_receipt(
    file: UploadFile,
    expense_id: str,
    item_id: Optional[str] = None
) -> str:
    """
    Save uploaded receipt file and return the file path.
    
    Args:
        file: The uploaded file
        expense_id: ID of the expense
        item_id: Optional ID of the expense item
        
    Returns:
        The relative path to the saved file
    """
    ensure_upload_dir()
    
    # Validate file
    is_valid, error = validate_file(file)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    
    # Generate unique filename
    ext = Path(file.filename).suffix.lower()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    
    if item_id:
        filename = f"{expense_id}_{item_id}_{timestamp}_{unique_id}{ext}"
    else:
        filename = f"{expense_id}_{timestamp}_{unique_id}{ext}"
    
    # Create expense-specific subdirectory
    expense_dir = UPLOAD_DIR / expense_id
    expense_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = expense_dir / filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            
            # Check file size
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400, 
                    detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
                )
            
            buffer.write(content)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Return relative path
    return str(file_path.relative_to(UPLOAD_DIR.parent))


def delete_receipt(file_path: str) -> bool:
    """Delete a receipt file."""
    try:
        full_path = Path(file_path)
        if full_path.exists():
            full_path.unlink()
            return True
        return False
    except Exception:
        return False


def get_receipt_url(file_path: str, base_url: str = "/api/uploads") -> str:
    """Get the URL for accessing a receipt file."""
    return f"{base_url}/{file_path}"
