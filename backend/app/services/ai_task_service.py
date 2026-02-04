"""AI-powered task management service using Gemini."""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import json

from app.models import Task, User, Project, Team, TimeEntry, Timesheet
from app.config import get_settings


class AITaskService:
    """AI-powered task management features."""
    
    def __init__(self, db: Session):
        self.db = db
        self.model = None
        self._init_model()
    
    def _init_model(self):
        """Initialize Gemini model if API key is available."""
        settings = get_settings()
        if settings.gemini_api_key and len(settings.gemini_api_key) > 20:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.gemini_api_key)
                self.model = genai.GenerativeModel('gemini-2.5-flash')
            except Exception as e:
                print(f"Failed to init AI model: {e}")
    
    def calculate_priority_score(self, task: Task) -> float:
        """Calculate AI priority score for a task (0-100)."""
        score = 50.0  # Base score
        
        # Priority weight
        priority_weights = {"urgent": 30, "high": 20, "medium": 0, "low": -10}
        score += priority_weights.get(task.priority, 0)
        
        # Due date urgency
        if task.due_date:
            days_until_due = (task.due_date - datetime.utcnow()).days
            if days_until_due < 0:  # Overdue
                score += 25
            elif days_until_due <= 1:
                score += 20
            elif days_until_due <= 3:
                score += 10
            elif days_until_due <= 7:
                score += 5
        
        # Dependencies - if blocking other tasks
        blocking_count = len(task.successor_dependencies) if hasattr(task, 'successor_dependencies') else 0
        score += blocking_count * 5
        
        # Project priority
        if task.project and task.project.priority:
            project_weights = {"critical": 10, "high": 5, "medium": 0, "low": -5}
            score += project_weights.get(task.project.priority, 0)
        
        return min(100, max(0, score))
    
    def predict_deadline_risk(self, task: Task) -> Dict[str, Any]:
        """Predict risk of missing deadline."""
        risk_score = 0.0
        risk_factors = []
        
        if not task.due_date:
            return {"risk_score": 0, "risk_level": "unknown", "factors": ["No deadline set"]}
        
        days_until_due = (task.due_date - datetime.utcnow()).days
        estimated = task.estimated_hours or 8
        actual = task.actual_hours or 0
        
        # Time pressure
        if days_until_due < 0:
            risk_score = 100
            risk_factors.append("Task is overdue")
        elif days_until_due <= 1 and actual < estimated * 0.5:
            risk_score += 40
            risk_factors.append("Less than half completed with 1 day left")
        elif days_until_due <= 3 and actual < estimated * 0.3:
            risk_score += 25
            risk_factors.append("Limited progress with deadline approaching")
        
        # Blocking dependencies
        if hasattr(task, 'predecessor_dependencies'):
            blocking = [d for d in task.predecessor_dependencies if d.is_blocking]
            incomplete_blockers = []
            for dep in blocking:
                pred = self.db.query(Task).filter(Task.id == dep.predecessor_id).first()
                if pred and pred.status not in ["completed", "cancelled"]:
                    incomplete_blockers.append(pred.name)
            if incomplete_blockers:
                risk_score += len(incomplete_blockers) * 15
                risk_factors.append(f"Blocked by {len(incomplete_blockers)} incomplete tasks")
        
        # Assignee workload
        if task.assignee_id:
            assignee_tasks = self.db.query(Task).filter(
                Task.assignee_id == task.assignee_id,
                Task.status.in_(["todo", "in_progress"]),
                Task.due_date <= task.due_date
            ).count()
            if assignee_tasks > 5:
                risk_score += 20
                risk_factors.append(f"Assignee has {assignee_tasks} tasks due before this")
        
        # Determine risk level
        if risk_score >= 70:
            level = "high"
        elif risk_score >= 40:
            level = "medium"
        else:
            level = "low"
        
        return {
            "risk_score": min(100, risk_score),
            "risk_level": level,
            "factors": risk_factors
        }
    
    def get_workload_optimization(self, team_id: str) -> Dict[str, Any]:
        """Get workload optimization suggestions for a team."""
        team = self.db.query(Team).filter(Team.id == team_id).first()
        if not team:
            return {"suggestions": [], "rebalance_needed": False}
        
        suggestions = []
        overloaded = []
        underutilized = []
        
        for member in team.members:
            if not member.is_active:
                continue
            
            user = self.db.query(User).filter(User.id == member.user_id).first()
            if not user:
                continue
            
            capacity = (member.allocation_percentage / 100) * (user.capacity_hours_week or 40)
            tasks = self.db.query(Task).filter(
                Task.assignee_id == user.id,
                Task.status.in_(["todo", "in_progress"])
            ).all()
            allocated = sum(t.estimated_hours or 2 for t in tasks)
            
            utilization = (allocated / capacity * 100) if capacity > 0 else 0
            
            if utilization > 110:
                overloaded.append({"user": user.full_name, "utilization": utilization, "tasks": len(tasks)})
            elif utilization < 50:
                underutilized.append({"user": user.full_name, "utilization": utilization, "available": capacity - allocated})
        
        # Generate suggestions
        if overloaded and underutilized:
            for over in overloaded:
                for under in underutilized:
                    suggestions.append({
                        "type": "rebalance",
                        "message": f"Consider moving tasks from {over['user']} ({over['utilization']:.0f}% utilized) to {under['user']} ({under['utilization']:.0f}% utilized)",
                        "priority": "high" if over['utilization'] > 130 else "medium"
                    })
        
        if overloaded:
            suggestions.append({
                "type": "capacity",
                "message": f"{len(overloaded)} team member(s) are overloaded. Consider extending deadlines or adding resources.",
                "priority": "high"
            })
        
        return {
            "suggestions": suggestions[:5],
            "rebalance_needed": len(overloaded) > 0 and len(underutilized) > 0,
            "overloaded_members": overloaded,
            "underutilized_members": underutilized
        }
    
    async def create_task_from_natural_language(self, text: str, user: User) -> Optional[Dict[str, Any]]:
        """Parse natural language to create a task."""
        if not self.model:
            return self._fallback_parse(text, user)
        
        try:
            prompt = f"""Parse this task description into structured data:
"{text}"

Extract and return JSON with these fields:
- name: task title (required)
- description: detailed description
- priority: low/medium/high/urgent
- due_date: YYYY-MM-DD format if mentioned
- estimated_hours: number if mentioned
- tags: array of relevant tags

Only return valid JSON, no other text."""
            
            response = self.model.generate_content(prompt)
            
            import re
            json_match = re.search(r'\{[\s\S]*\}', response.text)
            if json_match:
                data = json.loads(json_match.group())
                data["assignee_id"] = user.id
                data["owner_id"] = user.id
                data["status"] = "todo"
                return data
        except Exception as e:
            print(f"AI parse error: {e}")
        
        return self._fallback_parse(text, user)
    
    def _fallback_parse(self, text: str, user: User) -> Dict[str, Any]:
        """Fallback parsing without AI."""
        text_lower = text.lower()
        
        priority = "medium"
        if any(w in text_lower for w in ["urgent", "asap", "immediately"]):
            priority = "urgent"
        elif any(w in text_lower for w in ["important", "high priority"]):
            priority = "high"
        elif any(w in text_lower for w in ["low priority", "when possible"]):
            priority = "low"
        
        due_date = None
        if "today" in text_lower:
            due_date = datetime.utcnow().date().isoformat()
        elif "tomorrow" in text_lower:
            due_date = (datetime.utcnow() + timedelta(days=1)).date().isoformat()
        elif "next week" in text_lower:
            due_date = (datetime.utcnow() + timedelta(days=7)).date().isoformat()
        
        return {
            "name": text[:100],
            "description": text if len(text) > 100 else None,
            "priority": priority,
            "due_date": due_date,
            "assignee_id": user.id,
            "owner_id": user.id,
            "status": "todo"
        }
    
    async def get_ai_suggestions(self, task: Task) -> List[str]:
        """Get AI-powered suggestions for a task."""
        suggestions = []
        
        # Basic rule-based suggestions
        if not task.estimated_hours:
            suggestions.append("Add time estimate to improve planning accuracy")
        
        if not task.due_date:
            suggestions.append("Set a due date to track deadlines")
        
        if task.status == "in_progress":
            if task.actual_hours and task.estimated_hours:
                if task.actual_hours > task.estimated_hours * 0.8:
                    suggestions.append("Task is approaching time estimate - consider updating")
        
        if task.status in ["blocked", "waiting"]:
            suggestions.append("Update task status or add notes on what's blocking progress")
        
        # AI-enhanced suggestions if available
        if self.model and task.description:
            try:
                prompt = f"""Given this task:
Title: {task.name}
Description: {task.description}
Status: {task.status}
Priority: {task.priority}

Provide 2-3 brief, actionable suggestions to complete this task effectively. Keep each under 100 characters."""
                
                response = self.model.generate_content(prompt)
                if response.text:
                    ai_suggestions = [s.strip() for s in response.text.split('\n') if s.strip() and len(s) < 150]
                    suggestions.extend(ai_suggestions[:3])
            except Exception:
                pass
        
        return suggestions[:5]
