"""
Production-Level TimeSheet AI Agent using LangGraph
All responses are AI-powered using Gemini with real database context.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Task, Timesheet, TimeEntry, Expense, ExpenseItem, Project, Client, SupportRequest, ChatHistory
from app.schemas import (
    ChatMessage, ChatResponse, ChatHistoryItem,
    DocumentScanResult, DocumentScanResponse,
    SaveToActivityRequest, SaveToActivityResponse
)
from app.utils import get_current_active_user
from app.config import get_settings
from datetime import datetime, timedelta, date as date_type
from sqlalchemy import func
from pydantic import BaseModel, Field
from typing import List, Optional, Annotated, Any, Dict
from enum import Enum
import base64
import json
import uuid
import os
import re

# LangGraph imports
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

router = APIRouter()
settings = get_settings()

# Upload directory for chatbot files
CHATBOT_UPLOADS_DIR = os.path.join("uploads", "chatbot")
os.makedirs(CHATBOT_UPLOADS_DIR, exist_ok=True)


# =============================================================================
# SCHEMAS
# =============================================================================

class ExtractedExpenseData(BaseModel):
    vendor_name: Optional[str] = None
    date: Optional[str] = None
    total_amount: Optional[float] = None
    currency: str = "EGP"
    items: List[dict] = []
    category: Optional[str] = None
    description: Optional[str] = None
    raw_text: Optional[str] = None
    confidence: str = "medium"


class FileAnalysisResponse(BaseModel):
    success: bool
    message: str
    extracted_data: Optional[ExtractedExpenseData] = None
    summary: Optional[str] = None
    file_type: Optional[str] = None


class UserContext(BaseModel):
    user_id: str
    user_name: str
    user_role: str
    today: str
    week_start: str
    pending_tasks: int
    high_priority_tasks: int
    overdue_tasks: int
    completed_tasks_week: int
    task_list: List[dict]
    hours_today: float
    hours_week: float
    pending_timesheets: int
    pending_expenses: int
    pending_expense_amount: float
    approved_expenses_month: int
    active_projects: int
    project_names: List[str]
    open_tickets: int


# =============================================================================
# AGENT STATE
# =============================================================================

class AgentState(dict):
    """State object that passes through the graph nodes."""
    user_message: str
    user_context: dict
    intent: str
    tool_output: str
    final_response: str
    needs_ai: bool
    error: Optional[str]


# =============================================================================
# DATABASE CONTEXT FETCHER
# =============================================================================

def fetch_user_context(user: User, db: Session) -> UserContext:
    """Fetch comprehensive user context from database."""
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    pending_tasks = db.query(Task).filter(
        Task.status.in_(["open", "in_progress"])
    ).all()

    user_pending_tasks = [t for t in pending_tasks if t.assignee_id == user.id or (t.task_type == "personal" and t.assignee_id is None)]

    completed = db.query(Task).filter(
        Task.assignee_id == user.id,
        Task.status == "completed"
    ).count()

    high_priority = sum(1 for t in user_pending_tasks if t.priority == "high")
    overdue = sum(1 for t in user_pending_tasks if hasattr(t, 'due_date') and t.due_date and (t.due_date.date() if hasattr(t.due_date, 'date') else t.due_date) < today)
    task_list = [{"name": t.name, "status": t.status, "priority": t.priority} for t in user_pending_tasks[:10]]

    hours_week = db.query(func.sum(TimeEntry.hours)).join(Timesheet).filter(
        Timesheet.user_id == user.id,
        TimeEntry.day >= week_start
    ).scalar() or 0.0

    hours_today = db.query(func.sum(TimeEntry.hours)).join(Timesheet).filter(
        Timesheet.user_id == user.id,
        TimeEntry.day == today
    ).scalar() or 0.0

    pending_ts = db.query(Timesheet).filter(
        Timesheet.user_id == user.id,
        Timesheet.status == "pending"
    ).count()

    pending_exp = db.query(Expense).filter(
        Expense.user_id == user.id,
        Expense.status == "pending"
    ).all()

    approved_exp = db.query(Expense).filter(
        Expense.user_id == user.id,
        Expense.status == "approved",
        Expense.created_at >= month_start
    ).count()

    projects = db.query(Project).filter(Project.status == "active").all()

    tickets = db.query(SupportRequest).filter(
        SupportRequest.user_id == user.id,
        SupportRequest.status.in_(["open", "in_progress"])
    ).count()

    return UserContext(
        user_id=str(user.id),
        user_name=user.full_name,
        user_role=user.role,
        today=today.strftime('%Y-%m-%d'),
        week_start=week_start.strftime('%Y-%m-%d'),
        pending_tasks=len(user_pending_tasks),
        high_priority_tasks=high_priority,
        overdue_tasks=overdue,
        completed_tasks_week=completed,
        task_list=task_list,
        hours_today=float(hours_today),
        hours_week=float(hours_week),
        pending_timesheets=pending_ts,
        pending_expenses=len(pending_exp),
        pending_expense_amount=sum(e.total_amount or 0 for e in pending_exp),
        approved_expenses_month=approved_exp,
        active_projects=len(projects),
        project_names=[p.name for p in projects[:10]],
        open_tickets=tickets
    )


# =============================================================================
# CHAT HISTORY HELPERS
# =============================================================================

def save_chat_message(db: Session, user_id: str, role: str, content: str,
                      attachments: list = None, metadata: dict = None):
    """Save a chat message to the database."""
    msg = ChatHistory(
        id=str(uuid.uuid4()),
        user_id=user_id,
        role=role,
        content=content,
        attachments=attachments or [],
        metadata_=metadata or {}
    )
    db.add(msg)
    db.commit()
    return msg


# =============================================================================
# PDF TEXT EXTRACTION
# =============================================================================

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF using PyMuPDF (fitz)."""
    try:
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_parts = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                text_parts.append(f"--- Page {page_num + 1} ---\n{text.strip()}")
        doc.close()
        return "\n\n".join(text_parts) if text_parts else ""
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""


def analyze_with_gemini(content_bytes: bytes, mime_type: str, prompt: str) -> str:
    """Analyze file content using Gemini vision API."""
    if not settings.gemini_api_key or len(settings.gemini_api_key) < 20:
        return ""
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        image_data = base64.b64encode(content_bytes).decode('utf-8')
        response = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": image_data}
        ])
        return response.text.strip()
    except Exception as e:
        print(f"Gemini analysis error: {e}")
        return ""


def extract_structured_data(raw_text: str) -> dict:
    """Use Gemini to extract structured data from raw text."""
    if not raw_text or not settings.gemini_api_key or len(settings.gemini_api_key) < 20:
        return {}
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')

        prompt = f"""Extract structured financial/document data from this text.
Return ONLY valid JSON with these keys (use null if not found):
- vendor_name: string
- date: string (YYYY-MM-DD format)
- total_amount: number
- currency: string (EGP, USD, EUR, etc)
- category: string (Food, Travel, Office Supplies, Transportation, Other)
- description: string (brief summary)

Text:
{raw_text[:3000]}"""

        response = model.generate_content(prompt)
        json_match = re.search(r'\{[\s\S]*\}', response.text)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print(f"Structured extraction error: {e}")
    return {}


def clean_text(text: str) -> str:
    """Remove markdown formatting from text."""
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*[\*\•]\s*', '- ', text, flags=re.MULTILINE)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


# =============================================================================
# AI RESPONSE ENGINE
# =============================================================================

def generate_ai_response(user_message: str, context_data: str, system_instruction: str) -> str:
    """Use Gemini AI to generate a natural, conversational response."""
    if not settings.gemini_api_key or len(settings.gemini_api_key) < 20:
        print(f"[Chatbot] No valid API key (length={len(settings.gemini_api_key) if settings.gemini_api_key else 0})")
        return ""
    try:
        import google.generativeai as genai
        import time as time_mod

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')

        prompt = f"""{system_instruction}

Here is the user's real data from the database:
{context_data}

User's question: {user_message}

Respond naturally and conversationally. Be specific — use the actual data provided above.
Do NOT use markdown formatting (no **, ##, ``` etc). Use plain text only.
Keep your response concise but helpful (under 250 words).
If the user asks follow-up questions, answer based on the data you have."""

        delays = [2, 5, 10]
        for attempt in range(3):
            try:
                print(f"[Chatbot] Gemini attempt {attempt+1}/3...")
                response = model.generate_content(prompt)
                print(f"[Chatbot] Gemini SUCCESS - response length: {len(response.text)}")
                return response.text.strip()
            except Exception as retry_err:
                err_str = str(retry_err).lower()
                print(f"[Chatbot] Gemini attempt {attempt+1} failed: {retry_err}")
                if ("quota" in err_str or "rate" in err_str or "resource" in err_str or "429" in err_str) and attempt < 2:
                    print(f"[Chatbot] Rate limited, waiting {delays[attempt]}s before retry...")
                    time_mod.sleep(delays[attempt])
                    continue
                raise retry_err
    except Exception as e:
        print(f"AI Response Error: {e}")
    return ""


def build_context_summary(ctx: dict) -> str:
    """Build a readable text summary of the user's data for AI context."""
    task_details = ""
    for t in ctx.get("task_list", []):
        task_details += f'\n  - Task: "{t["name"]}", Status: {t["status"]}, Priority: {t["priority"]}'

    return f"""User: {ctx['user_name']} (Role: {ctx['user_role']})
Date: {ctx['today']} (Week started: {ctx['week_start']})

TASKS:
  Total pending: {ctx['pending_tasks']}
  High priority: {ctx['high_priority_tasks']}
  Overdue: {ctx['overdue_tasks']}
  Completed this week: {ctx['completed_tasks_week']}
  Task details:{task_details if task_details else " None"}

TIME TRACKING:
  Hours logged today: {ctx['hours_today']}
  Hours logged this week: {ctx['hours_week']}
  Pending timesheets: {ctx['pending_timesheets']}

EXPENSES:
  Pending expense reports: {ctx['pending_expenses']}
  Pending amount: {ctx['pending_expense_amount']} EGP
  Approved this month: {ctx['approved_expenses_month']}

PROJECTS:
  Active projects: {ctx['active_projects']}
  Project names: {', '.join(ctx['project_names']) if ctx['project_names'] else 'None'}

SUPPORT:
  Open tickets: {ctx['open_tickets']}"""


# =============================================================================
# GRAPH NODES (AI-Powered)
# =============================================================================

def intent_classifier_node(state: AgentState) -> AgentState:
    """Classify user intent — simplified to 3 routes."""
    message = state["user_message"].lower().strip()

    # Email composition
    email_words = ["email", "mail", "e-mail"]
    action_words = ["send", "write", "compose", "draft"]
    email_patterns = ["email to", "mail to", "send message"]
    if (any(w in message for w in email_words) and any(w in message for w in action_words)) or any(p in message for p in email_patterns):
        state["intent"] = "email"
        state["needs_ai"] = True
        return state

    # File upload guidance
    if any(w in message for w in ["upload", "attach", "scan receipt", "scan document"]) and not any(w in message for w in ["about", "what", "tell", "explain", "why", "can you"]):
        state["intent"] = "file_help"
        state["needs_ai"] = True
        return state

    # Everything else → unified AI with full database context
    state["intent"] = "general"
    state["needs_ai"] = True
    return state


def unified_ai_node(state: AgentState) -> AgentState:
    """Main AI node: handles ALL queries using Gemini with full database context."""
    ctx = state["user_context"]
    context_summary = build_context_summary(ctx)

    system_instruction = """You are a helpful AI assistant for a TimeSheet & Project Management system called "TimeSheet".
You have access to the user's real data from the database (provided below).

Your capabilities:
- Answer questions about the user's tasks, time entries, expenses, projects with real data
- Give advice on priorities, workload management, productivity
- Explain how to use any feature of the TimeSheet system
- Help with general questions and follow-up questions
- The system has these sidebar pages: Home, Operation, Dashboards, Reports, Templates, Automation, AI, Support, My Time, My Expense, Settings
- Users can attach PDFs/images in chat using the paperclip button for document scanning

When the user asks about their data, give specific, detailed answers using the real numbers and task names.
When the user asks follow-up questions (e.g. "tell me more about X"), provide deeper analysis.
When the user asks "how to" questions, give step-by-step guidance.
For greetings, respond warmly with a quick status summary and offer help.
Be conversational, friendly, and intelligent. Address the user by their first name.
NEVER give the exact same response twice — always tailor your answer to the specific question."""

    ai_response = generate_ai_response(state["user_message"], context_summary, system_instruction)

    if ai_response:
        state["tool_output"] = ai_response
    else:
        # Smart fallback if AI is unavailable
        name = ctx["user_name"].split()[0]
        msg = state["user_message"].lower()

        if any(g in msg for g in ["hi", "hello", "hey", "good morning"]):
            state["tool_output"] = f"Hello {name}! You have {ctx['pending_tasks']} pending tasks ({ctx['high_priority_tasks']} high priority, {ctx['overdue_tasks']} overdue), {ctx['hours_week']} hours this week, and {ctx['pending_expenses']} pending expenses. What would you like to know?"
        elif "task" in msg:
            tasks = "\n".join([f"  - {t['name']} ({t['priority']} priority, {t['status']})" for t in ctx["task_list"][:10]])
            state["tool_output"] = f"Your tasks, {name}:\n\n{tasks}\n\n{ctx['pending_tasks']} pending ({ctx['high_priority_tasks']} high priority, {ctx['overdue_tasks']} overdue)."
        elif "hour" in msg or "time" in msg:
            state["tool_output"] = f"{name}, you've logged {ctx['hours_today']} hours today and {ctx['hours_week']} hours this week. {ctx['pending_timesheets']} pending timesheets."
        elif "expense" in msg:
            state["tool_output"] = f"{name}, you have {ctx['pending_expenses']} pending expense reports ({ctx['pending_expense_amount']} EGP). {ctx['approved_expenses_month']} approved this month."
        else:
            state["tool_output"] = f"Hi {name}! I have your data: {ctx['pending_tasks']} pending tasks, {ctx['hours_week']} hours this week, {ctx['pending_expenses']} pending expenses. Ask me anything!"

    return state


def file_help_tool_node(state: AgentState) -> AgentState:
    """Handle file-related queries using AI."""
    ctx = state["user_context"]
    system_instruction = """You are a helpful AI assistant for a TimeSheet system.
The user is asking about file uploads, document scanning, or OCR features.
The system supports: PDF, JPEG, PNG, WebP files (up to 10MB, max 5 at once).
Users attach files using the paperclip button in the chat, or by dragging and dropping.
After scanning, extracted data is shown in cards with "Save as Expense" and "Save as Task" buttons.
Answer naturally and conversationally."""

    ai_response = generate_ai_response(state["user_message"], build_context_summary(ctx), system_instruction)
    state["tool_output"] = ai_response or "Use the paperclip button below to attach files. I support PDF, JPEG, PNG, and WebP. You can also drag and drop."
    return state


def email_tool_node(state: AgentState) -> AgentState:
    """Handle email composition using AI."""
    ctx = state["user_context"]
    system_instruction = """You are a helpful AI assistant for a TimeSheet system.
The user wants to compose or send an email. Help them naturally:
- If they haven't specified a recipient or subject, ask for those details.
- If they provided both, generate a professional email draft.
Use the user's name as the sender."""

    ai_response = generate_ai_response(state["user_message"], f"Sender: {ctx['user_name']} ({ctx['user_role']})", system_instruction)
    state["tool_output"] = ai_response or f"I'd be happy to help you compose an email. Please tell me who it's for and what it should be about."
    return state


def response_formatter_node(state: AgentState) -> AgentState:
    """Format and finalize the response."""
    state["final_response"] = clean_text(state.get("tool_output", "I'm not sure how to help with that. Could you rephrase?"))
    return state


# =============================================================================
# ROUTING & GRAPH
# =============================================================================

def route_by_intent(state: AgentState) -> str:
    intent = state.get("intent", "general")
    if intent == "email":
        return "email_tool"
    elif intent == "file_help":
        return "file_help_tool"
    return "unified_ai"


def build_agent_graph() -> StateGraph:
    """Build the LangGraph state machine."""
    workflow = StateGraph(AgentState)
    workflow.add_node("intent_classifier", intent_classifier_node)
    workflow.add_node("unified_ai", unified_ai_node)
    workflow.add_node("file_help_tool", file_help_tool_node)
    workflow.add_node("email_tool", email_tool_node)
    workflow.add_node("response_formatter", response_formatter_node)

    workflow.set_entry_point("intent_classifier")
    workflow.add_conditional_edges("intent_classifier", route_by_intent, {
        "unified_ai": "unified_ai",
        "file_help_tool": "file_help_tool",
        "email_tool": "email_tool"
    })
    workflow.add_edge("unified_ai", "response_formatter")
    workflow.add_edge("file_help_tool", "response_formatter")
    workflow.add_edge("email_tool", "response_formatter")
    workflow.add_edge("response_formatter", END)
    return workflow.compile()


agent = build_agent_graph()


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.get("/context")
async def get_context(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return fetch_user_context(current_user, db)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    message: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Main chat endpoint — AI-powered with database context."""
    save_chat_message(db, str(current_user.id), "user", message.message)
    context = fetch_user_context(current_user, db)

    initial_state = AgentState(
        user_message=message.message,
        user_context=context.model_dump(),
        intent="",
        tool_output="",
        final_response="",
        needs_ai=False,
        error=None
    )

    try:
        result = agent.invoke(initial_state)
        response_text = result.get("final_response", "I'm not sure how to help.")
        intent = result.get("intent", "unknown")

        save_chat_message(db, str(current_user.id), "assistant", response_text,
                          metadata={"intent": intent})

        return ChatResponse(response=response_text, context_used=intent)
    except Exception as e:
        print(f"Agent Error: {e}")
        error_msg = "Sorry, I encountered an error. Please try again."
        save_chat_message(db, str(current_user.id), "assistant", error_msg,
                          metadata={"intent": "error", "error": str(e)})
        return ChatResponse(response=error_msg, context_used="error")


@router.get("/history")
async def get_chat_history(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    messages = db.query(ChatHistory).filter(
        ChatHistory.user_id == str(current_user.id)
    ).order_by(ChatHistory.created_at.asc()).offset(skip).limit(limit).all()

    return [
        ChatHistoryItem(
            id=m.id, role=m.role, content=m.content,
            attachments=m.attachments or [],
            metadata=m.metadata_ or {},
            created_at=m.created_at
        ) for m in messages
    ]


@router.post("/chat-with-files", response_model=ChatResponse)
async def chat_with_files(
    files: List[UploadFile] = File(...),
    message: str = Form(default="Analyze these files"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Chat with multiple file attachments."""
    if len(files) > 5:
        raise HTTPException(400, "Maximum 5 files allowed per request.")

    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    file_results = []
    attachment_list = []

    for file in files:
        if file.content_type not in allowed_types:
            file_results.append(f"x {file.filename}: Unsupported format ({file.content_type})")
            continue

        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            file_results.append(f"x {file.filename}: Too large (max 10MB)")
            continue

        file_id = str(uuid.uuid4())
        ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
        save_path = os.path.join(CHATBOT_UPLOADS_DIR, f"{file_id}{ext}")
        with open(save_path, "wb") as f:
            f.write(content)

        attachment_list.append({
            "fileName": file.filename,
            "fileUrl": f"/api/uploads/chatbot/{file_id}{ext}",
            "fileType": file.content_type,
            "size": len(content)
        })

        if file.content_type == "application/pdf":
            pdf_text = extract_text_from_pdf(content)
            if pdf_text:
                structured = extract_structured_data(pdf_text)
                if structured:
                    result = f"PDF {file.filename}:\nVendor: {structured.get('vendor_name', 'N/A')}\nDate: {structured.get('date', 'N/A')}\nAmount: {structured.get('total_amount', 'N/A')} {structured.get('currency', 'EGP')}\nCategory: {structured.get('category', 'N/A')}\nDescription: {structured.get('description', 'N/A')}"
                else:
                    result = f"PDF {file.filename}:\n{pdf_text[:500]}..."
            else:
                gemini_result = analyze_with_gemini(content, file.content_type, f"Analyze this document. {message}")
                result = f"PDF {file.filename}:\n{clean_text(gemini_result) if gemini_result else 'Could not extract text.'}"
        else:
            gemini_result = analyze_with_gemini(content, file.content_type, f"Analyze this image/document. {message}. Extract text, amounts, dates, vendor names.")
            result = f"Image {file.filename}:\n{clean_text(gemini_result) if gemini_result else 'Could not analyze.'}"

        file_results.append(result)

    combined_response = f"Analysis of {len(files)} file(s):\n\n" + "\n\n".join(file_results)

    save_chat_message(db, str(current_user.id), "user", message, attachments=attachment_list)
    save_chat_message(db, str(current_user.id), "assistant", combined_response,
                      metadata={"intent": "file_analysis", "file_count": len(files)})

    return ChatResponse(response=combined_response, context_used="file_analysis", attachments=attachment_list)


@router.post("/scan-documents", response_model=DocumentScanResponse)
async def scan_documents(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Batch scan PDFs and images, extracting structured data."""
    if len(files) > 5:
        raise HTTPException(400, "Maximum 5 files allowed.")

    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    results = []

    for file in files:
        if file.content_type not in allowed_types:
            results.append(DocumentScanResult(file_name=file.filename or "unknown", file_type=file.content_type or "unknown", description=f"Unsupported: {file.content_type}"))
            continue

        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            results.append(DocumentScanResult(file_name=file.filename or "unknown", file_type=file.content_type or "unknown", description="Too large (max 10MB)"))
            continue

        file_type = "pdf" if file.content_type == "application/pdf" else "image"
        raw_text = ""
        structured = {}

        if file.content_type == "application/pdf":
            raw_text = extract_text_from_pdf(content)
            if raw_text:
                structured = extract_structured_data(raw_text)
            else:
                gemini_text = analyze_with_gemini(content, file.content_type, "Extract ALL text from this document. Also extract: vendor_name, date, total_amount, currency, category, description as JSON.")
                if gemini_text:
                    raw_text = gemini_text
                    json_match = re.search(r'\{[\s\S]*\}', gemini_text)
                    if json_match:
                        try: structured = json.loads(json_match.group())
                        except json.JSONDecodeError: pass
        else:
            gemini_text = analyze_with_gemini(content, file.content_type, "Extract ALL text from this image. Also identify: vendor_name, date, total_amount, currency, category, description. Return as JSON.")
            if gemini_text:
                raw_text = gemini_text
                json_match = re.search(r'\{[\s\S]*\}', gemini_text)
                if json_match:
                    try: structured = json.loads(json_match.group())
                    except json.JSONDecodeError: pass

        results.append(DocumentScanResult(
            file_name=file.filename or "unknown", file_type=file_type,
            raw_text=raw_text[:2000] if raw_text else None,
            vendor_name=structured.get("vendor_name"), date=structured.get("date"),
            total_amount=structured.get("total_amount"), currency=structured.get("currency", "EGP"),
            category=structured.get("category"), description=structured.get("description"),
            summary=f"Extracted from {file.filename}",
            confidence="high" if structured else ("medium" if raw_text else "low")
        ))

    return DocumentScanResponse(success=True, message=f"Scanned {len(results)} document(s)", results=results)


@router.post("/save-to-activity", response_model=SaveToActivityResponse)
async def save_to_activity(
    request: SaveToActivityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Save extracted document data as an Expense or Task."""
    try:
        if request.activity_type == "expense":
            expense = Expense(
                id=str(uuid.uuid4()), user_id=str(current_user.id),
                title=request.title, description=request.description or "Created from document scan",
                project_id=request.project_id, currency=request.currency or "EGP",
                vendor=request.vendor, payment_method="cash",
                total_amount=request.amount or 0.0, status="draft"
            )
            db.add(expense)

            if request.amount:
                parsed_date = datetime.utcnow().date()
                if request.date:
                    try: parsed_date = datetime.strptime(request.date, "%Y-%m-%d").date()
                    except ValueError: pass

                item = ExpenseItem(
                    id=str(uuid.uuid4()), expense_id=expense.id, date=parsed_date,
                    expense_type=request.category or "other", amount=request.amount,
                    currency=request.currency or "EGP", currency_rate=1.0,
                    description=request.description, vendor=request.vendor,
                    ocr_data={"source": "chatbot_scan", "vendor": request.vendor, "date": request.date, "amount": request.amount, "category": request.category}
                )
                db.add(item)

            db.commit()
            return SaveToActivityResponse(success=True, message=f"Expense '{request.title}' created ({request.amount or 0} {request.currency})", activity_id=expense.id, activity_type="expense")

        elif request.activity_type == "task":
            task = Task(
                id=str(uuid.uuid4()), name=request.title,
                description=request.description or "Created from document scan",
                task_type="personal", project_id=request.project_id,
                assignee_id=str(current_user.id), priority="medium", status="open"
            )
            db.add(task)
            db.commit()
            return SaveToActivityResponse(success=True, message=f"Task '{request.title}' created", activity_id=task.id, activity_type="task")

        else:
            return SaveToActivityResponse(success=False, message=f"Unknown type: {request.activity_type}. Use 'expense' or 'task'.")

    except Exception as e:
        db.rollback()
        return SaveToActivityResponse(success=False, message=f"Failed to save: {str(e)}")


@router.post("/analyze-file", response_model=FileAnalysisResponse)
async def analyze_file(
    file: UploadFile = File(...),
    purpose: str = Form(default="expense"),
    current_user: User = Depends(get_current_active_user)
):
    """Analyze uploaded file using AI with PDF text extraction."""
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, f"Unsupported: {file.content_type}")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB).")

    file_type = "pdf" if file.content_type == "application/pdf" else "image"

    if file.content_type == "application/pdf":
        pdf_text = extract_text_from_pdf(content)
        if pdf_text:
            structured = extract_structured_data(pdf_text)
            if structured:
                return FileAnalysisResponse(
                    success=True, message="PDF analyzed",
                    extracted_data=ExtractedExpenseData(
                        vendor_name=structured.get("vendor_name"), date=structured.get("date"),
                        total_amount=structured.get("total_amount"), currency=structured.get("currency", "EGP"),
                        category=structured.get("category"), description=structured.get("description"),
                        raw_text=pdf_text[:1000], confidence="high"
                    ), file_type=file_type
                )
            return FileAnalysisResponse(success=True, message="PDF text extracted", summary=pdf_text[:1000], file_type=file_type)

    if not settings.gemini_api_key or len(settings.gemini_api_key) < 20:
        return FileAnalysisResponse(success=True, message="Demo mode", extracted_data=ExtractedExpenseData(
            vendor_name="Sample Store", date=datetime.utcnow().strftime("%Y-%m-%d"),
            total_amount=100.0, description=f"Demo from {file.filename}"
        ), file_type=file_type)

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        image_data = base64.b64encode(content).decode('utf-8')
        response = model.generate_content([
            "Analyze this receipt/document. Extract: vendor_name, date (YYYY-MM-DD), total_amount, currency, category, description. Return as JSON.",
            {"mime_type": file.content_type, "data": image_data}
        ])
        json_match = re.search(r'\{[\s\S]*\}', response.text)
        if json_match:
            data = json.loads(json_match.group())
            return FileAnalysisResponse(success=True, message="Analyzed", extracted_data=ExtractedExpenseData(**data), file_type=file_type)
        return FileAnalysisResponse(success=True, message="Analyzed", summary=clean_text(response.text), file_type=file_type)
    except Exception as e:
        return FileAnalysisResponse(success=False, message=f"Analysis failed: {str(e)}", file_type=file_type)


@router.post("/chat-with-file", response_model=ChatResponse)
async def chat_with_file(
    file: UploadFile = File(...),
    message: str = Form(default="What is in this file?"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Chat about an uploaded file."""
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        return ChatResponse(response=f"Sorry, I cannot process {file.content_type} files.", context_used="file_error")

    content = await file.read()

    if file.content_type == "application/pdf":
        pdf_text = extract_text_from_pdf(content)
        if pdf_text and settings.gemini_api_key and len(settings.gemini_api_key) >= 20:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.gemini_api_key)
                model = genai.GenerativeModel('gemini-2.5-flash')
                response = model.generate_content(f"Based on this document text, respond to: {message}\n\nDocument:\n{pdf_text[:4000]}\n\nRespond clearly. No markdown.")
                reply = clean_text(response.text)
                save_chat_message(db, str(current_user.id), "user", message, attachments=[{"fileName": file.filename, "fileType": file.content_type}])
                save_chat_message(db, str(current_user.id), "assistant", reply, metadata={"intent": "file_analysis"})
                return ChatResponse(response=reply, context_used="file_analysis")
            except Exception:
                pass
        if pdf_text:
            reply = f"Text from {file.filename}:\n\n{pdf_text[:2000]}"
            save_chat_message(db, str(current_user.id), "assistant", reply)
            return ChatResponse(response=reply, context_used="file_text")

    if not settings.gemini_api_key or len(settings.gemini_api_key) < 20:
        return ChatResponse(response=f"Received {file.filename}. Configure GEMINI_API_KEY for AI analysis.", context_used="demo")

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        image_data = base64.b64encode(content).decode('utf-8')
        response = model.generate_content([f"Analyze this and respond to: {message}\nNo markdown.", {"mime_type": file.content_type, "data": image_data}])
        reply = clean_text(response.text)
        save_chat_message(db, str(current_user.id), "user", message, attachments=[{"fileName": file.filename, "fileType": file.content_type}])
        save_chat_message(db, str(current_user.id), "assistant", reply, metadata={"intent": "file_analysis"})
        return ChatResponse(response=reply, context_used="file_analysis")
    except Exception as e:
        return ChatResponse(response=f"Could not analyze: {str(e)}", context_used="file_error")
