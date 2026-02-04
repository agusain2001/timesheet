"""
Production-Level TimeSheet AI Agent using LangGraph
Implements a proper state graph with conditional routing and tool nodes
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Task, Timesheet, TimeEntry, Expense, Project, Client, SupportRequest
from app.schemas import ChatMessage, ChatResponse
from app.utils import get_current_active_user
from app.config import get_settings
from datetime import datetime, timedelta
from sqlalchemy import func
from pydantic import BaseModel, Field
from typing import List, Optional, Annotated, Any
from enum import Enum
import base64
import json

# LangGraph imports
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

router = APIRouter()
settings = get_settings()


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
# AGENT STATE - The state that flows through the graph
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
    
    # Tasks - Query all tasks for user (including unassigned personal tasks)
    pending_tasks = db.query(Task).filter(
        Task.status.in_(["open", "in_progress"])
    ).all()
    
    # Filter to user's tasks (assigned to them or created by them for personal tasks)
    user_pending_tasks = [t for t in pending_tasks if t.assignee_id == user.id or (t.task_type == "personal" and t.assignee_id is None)]
    
    completed = db.query(Task).filter(
        Task.assignee_id == user.id,
        Task.status == "completed"
    ).count()
    
    high_priority = sum(1 for t in user_pending_tasks if t.priority == "high")
    overdue = sum(1 for t in user_pending_tasks if hasattr(t, 'due_date') and t.due_date and t.due_date < today)
    task_list = [{"name": t.name, "status": t.status, "priority": t.priority} for t in user_pending_tasks[:10]]
    
    # Time
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
    
    # Expenses
    pending_exp = db.query(Expense).filter(
        Expense.user_id == user.id,
        Expense.status == "pending"
    ).all()
    
    approved_exp = db.query(Expense).filter(
        Expense.user_id == user.id,
        Expense.status == "approved",
        Expense.created_at >= month_start
    ).count()
    
    # Projects
    projects = db.query(Project).filter(Project.status == "active").all()
    
    # Support
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
# GRAPH NODES
# =============================================================================

def intent_classifier_node(state: AgentState) -> AgentState:
    """
    Node 1: Classify user intent to determine routing.
    This is the router node that decides which tool to use.
    """
    message = state["user_message"].lower().strip()
    
    # Greeting patterns
    greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy"]
    if any(message == g or message.startswith(g + " ") for g in greetings):
        state["intent"] = "greeting"
        state["needs_ai"] = False
        return state
    
    # Email intent - detect email sending requests
    # Check for email/mail keywords combined with action words
    email_words = ["email", "mail", "e-mail"]
    action_words = ["send", "write", "compose", "draft", "create"]
    has_email_word = any(w in message for w in email_words)
    has_action_word = any(w in message for w in action_words)
    
    # Also check for direct patterns
    email_patterns = ["email to", "mail to", "email someone", "send message"]
    has_email_pattern = any(p in message for p in email_patterns)
    
    if (has_email_word and has_action_word) or has_email_pattern:
        state["intent"] = "email"
        state["needs_ai"] = True
        return state
    
    # File/upload related
    if any(w in message for w in ["upload", "file", "receipt", "image", "document", "scan", "ocr"]):
        state["intent"] = "file_help"
        state["needs_ai"] = False
        return state
    
    # Action requests
    if any(w in message for w in ["create", "add", "new", "make", "submit", "delete", "update"]):
        state["intent"] = "action"
        state["needs_ai"] = False
        return state
    
    # Help/guidance
    if any(w in message for w in ["how to", "how do i", "help", "guide", "tutorial", "steps"]):
        state["intent"] = "help"
        state["needs_ai"] = False
        return state
    
    # Database queries (user's data)
    db_keywords = ["my ", "show", "list", "pending", "tasks", "timesheet", "hours", "time",
                   "expense", "project", "status", "summary", "dashboard", "today", "this week"]
    if any(w in message for w in db_keywords):
        state["intent"] = "database"
        state["needs_ai"] = False
        return state
    
    # General knowledge - needs AI
    state["intent"] = "general"
    state["needs_ai"] = True
    return state


def database_tool_node(state: AgentState) -> AgentState:
    """
    Node 2A: Handle queries about user's data from database.
    """
    ctx = state["user_context"]
    msg = state["user_message"].lower()
    name = ctx["user_name"].split()[0]
    
    # Task queries
    if "task" in msg or "pending" in msg or "todo" in msg:
        # Check if asking specifically for high priority tasks
        if "high" in msg and "priority" in msg:
            high_priority_tasks = [t for t in ctx["task_list"] if t.get("priority") == "high"]
            if not high_priority_tasks:
                response = f"You have no high priority tasks right now, {name}."
            else:
                tasks = "\n".join([f"  - {t['name']} (Status: {t['status']})" for t in high_priority_tasks])
                response = f"""Here are your high priority tasks {name}:

{tasks}

Total: {len(high_priority_tasks)} high priority task(s)

Go to Tasks page to manage them."""
        elif ctx["pending_tasks"] == 0:
            response = f"Great news {name}! You have no pending tasks. All caught up!"
        else:
            tasks = "\n".join([f"  - {t['name']} ({t['priority']})" for t in ctx["task_list"][:5]])
            response = f"""Here are your tasks {name}:

Pending: {ctx['pending_tasks']}
High Priority: {ctx['high_priority_tasks']}
Overdue: {ctx['overdue_tasks']}

Current tasks:
{tasks}

Go to Tasks page to manage them."""
    
    # Time queries
    elif "hour" in msg or "time" in msg or "timesheet" in msg:
        response = f"""Time Summary for {name}:

Today: {ctx['hours_today']} hours
This Week: {ctx['hours_week']} hours
Pending Timesheets: {ctx['pending_timesheets']}

Visit Time Sheet page to log more hours."""
    
    # Expense queries
    elif "expense" in msg or "money" in msg:
        response = f"""Expense Summary for {name}:

Pending Reports: {ctx['pending_expenses']}
Pending Amount: {ctx['pending_expense_amount']} EGP
Approved This Month: {ctx['approved_expenses_month']}

Check My Expenses page for details."""
    
    # Project queries
    elif "project" in msg:
        projects = ", ".join(ctx["project_names"]) if ctx["project_names"] else "None"
        response = f"You have {ctx['active_projects']} active projects: {projects}"
    
    # Dashboard/summary
    else:
        response = f"""Dashboard for {name}:

Tasks: {ctx['pending_tasks']} pending, {ctx['high_priority_tasks']} high priority
Time: {ctx['hours_today']} hrs today, {ctx['hours_week']} hrs this week
Expenses: {ctx['pending_expenses']} pending ({ctx['pending_expense_amount']} EGP)
Projects: {ctx['active_projects']} active"""
    
    state["tool_output"] = response
    return state


def help_tool_node(state: AgentState) -> AgentState:
    """
    Node 2B: Handle how-to and guidance questions.
    """
    msg = state["user_message"].lower()
    name = state["user_context"]["user_name"].split()[0]
    
    if "task" in msg:
        response = f"""To create a task {name}:

1. Go to Tasks page from sidebar
2. Click Add Task button
3. Fill in task name, priority, due date
4. Click Save"""
    
    elif "expense" in msg:
        response = f"""To submit an expense {name}:

1. Go to My Expenses from sidebar
2. Click New Expense button
3. Add expense items with amounts
4. Upload receipt images (I can read them)
5. Submit for approval"""
    
    elif "timesheet" in msg or "time" in msg:
        response = f"""To log your time {name}:

1. Go to Time Sheet from sidebar
2. Click New Timesheet
3. Select project and task
4. Enter hours for each day
5. Submit when complete"""
    
    else:
        response = f"""I can help with {name}:

Creating Tasks: Go to Tasks page, click Add Task
Logging Time: Go to Time Sheet, click New Timesheet
Submitting Expenses: Go to My Expenses, click New Expense
Uploading Receipts: Use file upload in chat"""
    
    state["tool_output"] = response
    return state


def action_tool_node(state: AgentState) -> AgentState:
    """
    Node 2C: Handle action requests (create, add, etc).
    """
    msg = state["user_message"].lower()
    name = state["user_context"]["user_name"].split()[0]
    
    if "task" in msg:
        response = f"To create a task, go to Tasks page and click Add Task button."
    elif "expense" in msg:
        response = f"To create an expense, go to My Expenses and click New Expense."
    elif "timesheet" in msg:
        response = f"To create a timesheet, go to Time Sheet and click New Timesheet."
    else:
        response = f"""What would you like to create {name}?

- Task: Go to Tasks page
- Expense: Go to My Expenses
- Timesheet: Go to Time Sheet"""
    
    state["tool_output"] = response
    return state


def greeting_tool_node(state: AgentState) -> AgentState:
    """
    Node 2D: Handle greetings.
    """
    ctx = state["user_context"]
    name = ctx["user_name"].split()[0]
    
    status_parts = []
    if ctx["pending_tasks"] > 0:
        status_parts.append(f"{ctx['pending_tasks']} pending tasks")
    if ctx["hours_week"] > 0:
        status_parts.append(f"{ctx['hours_week']} hours this week")
    if ctx["pending_expenses"] > 0:
        status_parts.append(f"{ctx['pending_expenses']} expenses pending")
    
    status = ", ".join(status_parts) if status_parts else "all clear"
    
    state["tool_output"] = f"""Hello {name}!

I'm TimeSheet AI, your assistant for time, tasks, and expenses.

Quick status: {status}

Ask me about your tasks, hours, or how to do something."""
    
    return state


def file_help_tool_node(state: AgentState) -> AgentState:
    """
    Node 2E: Handle file-related queries.
    """
    state["tool_output"] = """To analyze a file:

1. Click the attachment icon in chat
2. Select an image or PDF file
3. I will extract text and data from it

For receipts, I can identify vendor, date, amount, and items."""
    
    return state


def email_tool_node(state: AgentState) -> AgentState:
    """
    Node 2G: Handle email composition and sending requests.
    Uses AI to generate email content based on subject.
    """
    import google.generativeai as genai
    
    ctx = state["user_context"]
    msg = state["user_message"].lower()
    user_name = ctx["user_name"]
    
    # Check if this is a follow-up with recipient/subject info
    # For now, provide interactive guidance
    
    # Try to extract recipient from message
    recipient = None
    subject = None
    
    # Simple extraction patterns
    if " to " in msg:
        parts = msg.split(" to ")
        if len(parts) > 1:
            # Get text after "to" up to next keyword or end
            after_to = parts[1].strip()
            # Check if it looks like an email or name
            if "@" in after_to or after_to.split()[0] not in ["send", "compose", "write"]:
                recipient = after_to.split()[0] if after_to else None
    
    # Check for subject indicators
    if "about" in msg:
        subject = msg.split("about")[-1].strip()
    elif "regarding" in msg:
        subject = msg.split("regarding")[-1].strip()
    elif "subject" in msg:
        subject = msg.split("subject")[-1].strip()
    
    # Generate response based on what info we have
    if not recipient and not subject:
        response = f"""📧 **Email Composition Assistant**

Hi {user_name.split()[0]}! I'd be happy to help you compose an email.

To get started, please provide:
1. **Recipient**: Who should receive this email? (email address or name)
2. **Subject**: What's the email about?

For example, you can say:
- "Send email to john@example.com about project update"
- "Compose email to the team regarding weekly meeting"

Once you provide these details, I'll generate a professional email for you! ✨"""
    
    elif recipient and not subject:
        response = f"""📧 **Email to: {recipient}**

Great! Now what should the email be about?

Please provide a subject or topic, for example:
- "about the project deadline"
- "regarding the meeting tomorrow"
- "to follow up on our discussion"

I'll then generate a professional email body for you!"""
    
    elif not recipient and subject:
        response = f"""📧 **Email subject: "{subject[:50]}..."**

Got it! Now who should receive this email?

Please provide the recipient's email address or name."""
    
    else:
        # We have both recipient and subject - generate email with AI
        if not settings.gemini_api_key or len(settings.gemini_api_key) < 20:
            # Fallback without AI
            response = f"""📧 **Email Draft**

**To:** {recipient}
**Subject:** {subject.title()}

---

Dear {recipient.split('@')[0].title() if '@' in recipient else recipient.title()},

I hope this email finds you well.

[Your message about {subject} goes here]

Please let me know if you have any questions.

Best regards,
{user_name}

---
*This is a template. For AI-generated content, configure the GEMINI_API_KEY.*"""
        else:
            # Use AI to generate email
            try:
                genai.configure(api_key=settings.gemini_api_key)
                model = genai.GenerativeModel('gemini-2.5-flash')
                
                prompt = f"""Generate a professional email based on these details:
                
Sender: {user_name}
Recipient: {recipient}
Subject/Topic: {subject}

Requirements:
- Write a clear, professional email body (2-3 paragraphs)
- Include appropriate greeting and closing
- Be concise but complete
- Use a friendly professional tone
- Don't include the subject line in the body

Generate ONLY the email body, starting with the greeting."""

                ai_response = model.generate_content(prompt)
                email_body = ai_response.text.strip()
                
                response = f"""📧 **AI-Generated Email Draft**

**To:** {recipient}
**Subject:** {subject.title()}

---

{email_body}

---

✅ **Next Steps:**
- Copy this email and send it from your email client
- Or go to **Email Settings** to configure SMTP and send directly

Would you like me to modify anything?"""
                
            except Exception as e:
                response = f"""📧 **Email Draft**

**To:** {recipient}
**Subject:** {subject.title()}

---

Dear {recipient.split('@')[0].title() if '@' in recipient else recipient.title()},

I hope this email finds you well.

I wanted to reach out regarding {subject}.

[Please add your message details here]

Please let me know if you have any questions or need clarification.

Best regards,
{user_name}

---
*AI generation encountered an error. This is a template.*"""
    
    state["tool_output"] = response
    return state


def ai_tool_node(state: AgentState) -> AgentState:
    """
    Node 2F: Handle general questions using Gemini AI.
    """
    if not settings.gemini_api_key or len(settings.gemini_api_key) < 20:
        # Fallback if no API key
        ctx = state["user_context"]
        name = ctx["user_name"].split()[0]
        state["tool_output"] = f"""Hi {name}, I'm TimeSheet AI.

I specialize in helping with timesheet, tasks, and expenses.

Your status:
- {ctx['pending_tasks']} pending tasks
- {ctx['hours_week']} hours this week
- {ctx['pending_expenses']} expenses pending

How can I help with your work?"""
        return state
    
    try:
        # Use LangChain's ChatGoogleGenerativeAI
        # Using gemini-2.5-flash as requested
        import time
        
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=settings.gemini_api_key,
            temperature=0.7
        )
        
        messages = [
            SystemMessage(content="""You are a helpful AI assistant.
Answer clearly and concisely. Do NOT use markdown formatting like ** or ##.
Use plain text only. Keep responses informative but under 250 words."""),
            HumanMessage(content=state["user_message"])
        ]
        
        # Try with retry for rate limits
        for attempt in range(3):
            try:
                response = llm.invoke(messages)
                state["tool_output"] = clean_text(response.content)
                break
            except Exception as retry_error:
                if "quota" in str(retry_error).lower() or "rate" in str(retry_error).lower():
                    if attempt < 2:
                        time.sleep(2)  # Wait and retry
                        continue
                raise retry_error
        
    except Exception as e:
        print(f"AI Error: {e}")
        # Provide clean fallback without self-promotion
        msg = state["user_message"].lower()
        
        # Handle common AI questions with clean answers
        if "what is ai" in msg or "artificial intelligence" in msg:
            state["tool_output"] = """AI (Artificial Intelligence) is technology that enables computers to perform tasks that typically require human intelligence.

Key aspects of AI include:

Machine Learning - Systems that learn from data and improve over time without being explicitly programmed.

Natural Language Processing - Understanding and generating human language.

Computer Vision - Analyzing and understanding images and videos.

Deep Learning - Neural networks with many layers that can recognize complex patterns.

AI is used in virtual assistants, recommendation systems, autonomous vehicles, medical diagnosis, and many other applications."""
        
        elif "who are you" in msg or "what are you" in msg:
            state["tool_output"] = """I'm TimeSheet AI, an intelligent assistant for this TimeSheet Management System.

I can help you with:
- Viewing your tasks and priorities
- Tracking hours and timesheets
- Managing expense reports
- Navigating the system features

Just ask me about your work data or how to use any feature."""
        
        else:
            state["tool_output"] = """I can help you with questions about your work data, tasks, timesheets, and expenses.

For general knowledge questions, I recommend using a search engine for more comprehensive information.

Try asking me things like:
- Show my pending tasks
- How many hours did I log this week?
- How do I submit an expense?"""
    
    return state


def response_formatter_node(state: AgentState) -> AgentState:
    """
    Node 3: Format and finalize the response.
    """
    state["final_response"] = clean_text(state.get("tool_output", "I'm not sure how to help with that."))
    return state


# =============================================================================
# CONDITIONAL EDGE ROUTER
# =============================================================================

def route_by_intent(state: AgentState) -> str:
    """
    Conditional edge: Route to appropriate tool node based on intent.
    """
    intent = state.get("intent", "general")
    
    if intent == "database":
        return "database_tool"
    elif intent == "help":
        return "help_tool"
    elif intent == "action":
        return "action_tool"
    elif intent == "greeting":
        return "greeting_tool"
    elif intent == "file_help":
        return "file_help_tool"
    elif intent == "email":
        return "email_tool"
    else:
        return "ai_tool"


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def clean_text(text: str) -> str:
    """Remove markdown formatting from text."""
    import re
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*[\*\•]\s*', '- ', text, flags=re.MULTILINE)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


# =============================================================================
# BUILD THE LANGGRAPH
# =============================================================================

def build_agent_graph() -> StateGraph:
    """
    Build the LangGraph state machine.
    
    Graph Structure:
    
    START
      │
      ▼
    ┌─────────────────┐
    │ Intent Classifier│ (Node 1: Router)
    └────────┬────────┘
             │
             ▼ (Conditional Edge)
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
    ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐
    │Database │  │  Help   │  │  Action  │  │ Greeting │  │ File Help │  │   AI    │
    │  Tool   │  │  Tool   │  │   Tool   │  │   Tool   │  │   Tool    │  │  Tool   │
    └────┬────┘  └────┬────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬────┘
         │            │            │             │              │             │
         └────────────┴────────────┴─────────────┴──────────────┴─────────────┘
                                          │
                                          ▼
                                  ┌───────────────┐
                                  │   Response    │ (Node 3: Formatter)
                                  │   Formatter   │
                                  └───────┬───────┘
                                          │
                                          ▼
                                         END
    """
    
    # Create the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("intent_classifier", intent_classifier_node)
    workflow.add_node("database_tool", database_tool_node)
    workflow.add_node("help_tool", help_tool_node)
    workflow.add_node("action_tool", action_tool_node)
    workflow.add_node("greeting_tool", greeting_tool_node)
    workflow.add_node("file_help_tool", file_help_tool_node)
    workflow.add_node("email_tool", email_tool_node)
    workflow.add_node("ai_tool", ai_tool_node)
    workflow.add_node("response_formatter", response_formatter_node)
    
    # Set entry point
    workflow.set_entry_point("intent_classifier")
    
    # Add conditional edges from intent classifier to tools
    workflow.add_conditional_edges(
        "intent_classifier",
        route_by_intent,
        {
            "database_tool": "database_tool",
            "help_tool": "help_tool",
            "action_tool": "action_tool",
            "greeting_tool": "greeting_tool",
            "file_help_tool": "file_help_tool",
            "email_tool": "email_tool",
            "ai_tool": "ai_tool"
        }
    )
    
    # Add edges from tools to formatter
    workflow.add_edge("database_tool", "response_formatter")
    workflow.add_edge("help_tool", "response_formatter")
    workflow.add_edge("action_tool", "response_formatter")
    workflow.add_edge("greeting_tool", "response_formatter")
    workflow.add_edge("file_help_tool", "response_formatter")
    workflow.add_edge("email_tool", "response_formatter")
    workflow.add_edge("ai_tool", "response_formatter")
    
    # Add edge from formatter to END
    workflow.add_edge("response_formatter", END)
    
    # Compile the graph
    return workflow.compile()


# Create the agent once at module load
agent = build_agent_graph()


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.get("/context")
async def get_context(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user context for AI features."""
    return fetch_user_context(current_user, db)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    message: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Main chat endpoint using LangGraph agent.
    """
    # Get user context
    context = fetch_user_context(current_user, db)
    
    # Initialize state
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
        # Run the graph
        result = agent.invoke(initial_state)
        
        return ChatResponse(
            response=result.get("final_response", "I'm not sure how to help."),
            context_used=result.get("intent", "unknown")
        )
        
    except Exception as e:
        print(f"Agent Error: {e}")
        return ChatResponse(
            response="Sorry, I encountered an error. Please try again.",
            context_used="error"
        )


@router.post("/analyze-file", response_model=FileAnalysisResponse)
async def analyze_file(
    file: UploadFile = File(...),
    purpose: str = Form(default="expense"),
    current_user: User = Depends(get_current_active_user)
):
    """Analyze uploaded file using AI."""
    
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large. Maximum 10MB.")
    
    file_type = "pdf" if file.content_type == "application/pdf" else "image"
    
    if not settings.gemini_api_key or len(settings.gemini_api_key) < 20:
        return FileAnalysisResponse(
            success=True,
            message="Demo mode - configure GEMINI_API_KEY for real analysis",
            extracted_data=ExtractedExpenseData(
                vendor_name="Sample Store",
                date=datetime.utcnow().strftime("%Y-%m-%d"),
                total_amount=100.0,
                description=f"Demo extraction from {file.filename}"
            ),
            file_type=file_type
        )
    
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        image_data = base64.b64encode(content).decode('utf-8')
        
        prompt = """Analyze this receipt/document and extract:
- Vendor/store name
- Date (YYYY-MM-DD format)
- Total amount (number only)
- Currency (EGP, USD, EUR, etc)
- Category (Food, Travel, Office Supplies, Transportation, Other)
- Brief description

Return as JSON with keys: vendor_name, date, total_amount, currency, category, description"""
        
        response = model.generate_content([
            prompt,
            {"mime_type": file.content_type, "data": image_data}
        ])
        
        import re
        json_match = re.search(r'\{[\s\S]*\}', response.text)
        if json_match:
            data = json.loads(json_match.group())
            return FileAnalysisResponse(
                success=True,
                message="File analyzed successfully",
                extracted_data=ExtractedExpenseData(**data),
                file_type=file_type
            )
        
        return FileAnalysisResponse(
            success=True,
            message="File analyzed",
            summary=clean_text(response.text),
            file_type=file_type
        )
        
    except Exception as e:
        return FileAnalysisResponse(
            success=False,
            message=f"Analysis failed: {str(e)}",
            file_type=file_type
        )


@router.post("/chat-with-file", response_model=ChatResponse)
async def chat_with_file(
    file: UploadFile = File(...),
    message: str = Form(default="What is in this file?"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Chat about an uploaded file using LangChain."""
    
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        return ChatResponse(
            response=f"Sorry, I cannot process {file.content_type} files. Use JPEG, PNG, or PDF.",
            context_used="file_error"
        )
    
    content = await file.read()
    
    if not settings.gemini_api_key or len(settings.gemini_api_key) < 20:
        return ChatResponse(
            response=f"I received your file {file.filename}. Configure GEMINI_API_KEY for AI analysis.",
            context_used="demo"
        )
    
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        image_data = base64.b64encode(content).decode('utf-8')
        
        prompt = f"""Analyze this image/document and respond to: {message}
Do NOT use markdown. Use plain text only."""
        
        response = model.generate_content([
            prompt,
            {"mime_type": file.content_type, "data": image_data}
        ])
        
        return ChatResponse(
            response=clean_text(response.text),
            context_used="file_analysis"
        )
        
    except Exception as e:
        return ChatResponse(
            response=f"Could not analyze the file: {str(e)}",
            context_used="file_error"
        )
