"""Chat History model for persisting chatbot conversations."""

from sqlalchemy import Column, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base
import uuid


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    attachments = Column(JSON, default=list)  # [{fileName, fileUrl, fileType, size}]
    metadata_ = Column("metadata", JSON, default=dict)  # {intent, extracted_data, ...}
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
