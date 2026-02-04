"""
Report Service - Generates various reports including variance analysis.
Supports project variance, budget analysis, and timeline deviation reports.
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import logging
import json
import csv
import io

logger = logging.getLogger(__name__)


class ReportService:
    """
    Production report service for generating various project and task reports.
    Includes variance analysis, budget tracking, and team performance.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== Project Variance Reports ====================
    
    def get_project_variance_report(
        self,
        project_id: str,
        include_tasks: bool = True
    ) -> Dict[str, Any]:
        """
        Generate project variance report.
        Compares planned vs actual for hours, budget, and timeline.
        """
        from app.models import Project, Task
        from app.models.timesheet import TimeEntry
        
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {'error': 'Project not found'}
        
        # Calculate hours variance
        hours_data = self._calculate_hours_variance(project_id)
        
        # Calculate budget variance
        budget_data = self._calculate_budget_variance(project)
        
        # Calculate timeline variance
        timeline_data = self._calculate_timeline_variance(project)
        
        # Get task-level variances if requested
        task_variances = []
        if include_tasks:
            task_variances = self._get_task_variances(project_id)
        
        # Calculate overall health score
        health_score = self._calculate_project_health(
            hours_data, budget_data, timeline_data
        )
        
        return {
            'project_id': project_id,
            'project_name': project.name,
            'report_date': datetime.utcnow().isoformat(),
            'hours_variance': hours_data,
            'budget_variance': budget_data,
            'timeline_variance': timeline_data,
            'task_variances': task_variances,
            'health_score': health_score,
            'recommendations': self._generate_recommendations(
                hours_data, budget_data, timeline_data
            )
        }
    
    def _calculate_hours_variance(self, project_id: str) -> Dict[str, Any]:
        """Calculate hours variance for a project."""
        from app.models import Task
        from app.models.timesheet import TimeEntry
        
        # Get all project tasks
        tasks = self.db.query(Task).filter(Task.project_id == project_id).all()
        
        total_estimated = sum(t.estimated_hours or 0 for t in tasks)
        total_actual = 0
        
        for task in tasks:
            # Sum time entries for each task
            entries = self.db.query(func.sum(TimeEntry.hours)).filter(
                TimeEntry.task_id == task.id
            ).scalar() or 0
            total_actual += entries
        
        variance = total_actual - total_estimated
        variance_pct = (variance / total_estimated * 100) if total_estimated > 0 else 0
        
        return {
            'estimated_hours': round(total_estimated, 1),
            'actual_hours': round(total_actual, 1),
            'variance_hours': round(variance, 1),
            'variance_percentage': round(variance_pct, 1),
            'status': 'over' if variance > 0 else 'under' if variance < 0 else 'on_track'
        }
    
    def _calculate_budget_variance(self, project) -> Dict[str, Any]:
        """Calculate budget variance for a project."""
        planned_budget = float(project.budget or 0)
        actual_cost = float(project.actual_cost or 0)
        
        variance = actual_cost - planned_budget
        variance_pct = (variance / planned_budget * 100) if planned_budget > 0 else 0
        
        # Calculate burn rate
        if project.start_date and project.end_date:
            total_days = (project.end_date - project.start_date).days
            elapsed_days = (datetime.utcnow().date() - project.start_date).days
            elapsed_days = max(0, min(elapsed_days, total_days))
            
            expected_spend = (elapsed_days / total_days * planned_budget) if total_days > 0 else 0
            burn_variance = actual_cost - expected_spend
        else:
            expected_spend = 0
            burn_variance = 0
        
        return {
            'planned_budget': round(planned_budget, 2),
            'actual_cost': round(actual_cost, 2),
            'variance_amount': round(variance, 2),
            'variance_percentage': round(variance_pct, 1),
            'expected_spend': round(expected_spend, 2),
            'burn_variance': round(burn_variance, 2),
            'currency': project.budget_currency or 'USD',
            'status': 'over_budget' if variance > 0 else 'under_budget' if variance < 0 else 'on_budget'
        }
    
    def _calculate_timeline_variance(self, project) -> Dict[str, Any]:
        """Calculate timeline variance for a project."""
        from app.models import Task
        
        now = datetime.utcnow()
        
        # Get task completion stats
        total_tasks = self.db.query(Task).filter(Task.project_id == project.id).count()
        completed_tasks = self.db.query(Task).filter(
            Task.project_id == project.id,
            Task.status == 'completed'
        ).count()
        
        completion_pct = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Calculate expected completion percentage based on timeline
        if project.start_date and project.end_date:
            total_days = (project.end_date - project.start_date).days
            elapsed_days = (now.date() - project.start_date).days
            elapsed_days = max(0, elapsed_days)
            
            expected_pct = (elapsed_days / total_days * 100) if total_days > 0 else 0
            expected_pct = min(100, expected_pct)
            
            schedule_variance = completion_pct - expected_pct
            
            # Calculate projected end date
            if completion_pct > 0:
                days_per_percent = elapsed_days / completion_pct
                remaining_pct = 100 - completion_pct
                remaining_days = days_per_percent * remaining_pct
                projected_end = now + timedelta(days=remaining_days)
            else:
                projected_end = None
            
            days_variance = (project.end_date - projected_end.date()).days if projected_end else 0
        else:
            expected_pct = 0
            schedule_variance = 0
            projected_end = None
            days_variance = 0
        
        return {
            'start_date': project.start_date.isoformat() if project.start_date else None,
            'planned_end_date': project.end_date.isoformat() if project.end_date else None,
            'projected_end_date': projected_end.isoformat() if projected_end else None,
            'days_variance': days_variance,
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'completion_percentage': round(completion_pct, 1),
            'expected_percentage': round(expected_pct, 1),
            'schedule_variance': round(schedule_variance, 1),
            'status': 'behind' if schedule_variance < -10 else 'ahead' if schedule_variance > 10 else 'on_track'
        }
    
    def _get_task_variances(self, project_id: str) -> List[Dict[str, Any]]:
        """Get variance data for individual tasks."""
        from app.models import Task
        from app.models.timesheet import TimeEntry
        
        tasks = self.db.query(Task).filter(
            Task.project_id == project_id,
            Task.estimated_hours != None
        ).all()
        
        variances = []
        for task in tasks:
            estimated = task.estimated_hours or 0
            actual = self.db.query(func.sum(TimeEntry.hours)).filter(
                TimeEntry.task_id == task.id
            ).scalar() or 0
            
            variance = actual - estimated
            variance_pct = (variance / estimated * 100) if estimated > 0 else 0
            
            # Only include tasks with significant variance
            if abs(variance_pct) >= 10:
                variances.append({
                    'task_id': task.id,
                    'task_name': task.name,
                    'status': task.status,
                    'estimated_hours': round(estimated, 1),
                    'actual_hours': round(actual, 1),
                    'variance_hours': round(variance, 1),
                    'variance_percentage': round(variance_pct, 1)
                })
        
        # Sort by variance percentage (most over first)
        variances.sort(key=lambda x: x['variance_percentage'], reverse=True)
        
        return variances[:20]  # Top 20
    
    def _calculate_project_health(
        self,
        hours_data: Dict,
        budget_data: Dict,
        timeline_data: Dict
    ) -> Dict[str, Any]:
        """Calculate overall project health score."""
        # Score components (0-100)
        scores = {}
        
        # Hours score
        hours_var = abs(hours_data['variance_percentage'])
        scores['hours'] = max(0, 100 - hours_var * 2)
        
        # Budget score
        budget_var = abs(budget_data['variance_percentage'])
        scores['budget'] = max(0, 100 - budget_var * 2)
        
        # Timeline score
        schedule_var = abs(timeline_data['schedule_variance'])
        scores['timeline'] = max(0, 100 - schedule_var * 2)
        
        # Weighted average
        overall = (scores['hours'] * 0.3 + scores['budget'] * 0.3 + scores['timeline'] * 0.4)
        
        if overall >= 80:
            status = 'healthy'
            color = 'green'
        elif overall >= 60:
            status = 'at_risk'
            color = 'yellow'
        else:
            status = 'critical'
            color = 'red'
        
        return {
            'overall_score': round(overall, 1),
            'status': status,
            'color': color,
            'component_scores': {
                'hours': round(scores['hours'], 1),
                'budget': round(scores['budget'], 1),
                'timeline': round(scores['timeline'], 1)
            }
        }
    
    def _generate_recommendations(
        self,
        hours_data: Dict,
        budget_data: Dict,
        timeline_data: Dict
    ) -> List[Dict[str, Any]]:
        """Generate actionable recommendations based on variance data."""
        recommendations = []
        
        # Hours recommendations
        if hours_data['variance_percentage'] > 20:
            recommendations.append({
                'type': 'hours',
                'severity': 'high',
                'message': f"Project is {hours_data['variance_percentage']:.0f}% over estimated hours. Consider reviewing scope or adding resources.",
                'action': 'Review task estimates and identify scope creep'
            })
        elif hours_data['variance_percentage'] > 10:
            recommendations.append({
                'type': 'hours',
                'severity': 'medium',
                'message': f"Hours are trending {hours_data['variance_percentage']:.0f}% over estimate.",
                'action': 'Monitor closely and adjust estimates for remaining tasks'
            })
        
        # Budget recommendations
        if budget_data['status'] == 'over_budget':
            if budget_data['variance_percentage'] > 15:
                recommendations.append({
                    'type': 'budget',
                    'severity': 'high',
                    'message': f"Project is {budget_data['variance_percentage']:.0f}% over budget.",
                    'action': 'Escalate to stakeholders and consider scope reduction'
                })
            else:
                recommendations.append({
                    'type': 'budget',
                    'severity': 'medium',
                    'message': f"Budget variance of {budget_data['variance_percentage']:.0f}% detected.",
                    'action': 'Review upcoming expenses and find cost-saving opportunities'
                })
        
        # Timeline recommendations
        if timeline_data['status'] == 'behind':
            if timeline_data['schedule_variance'] < -20:
                recommendations.append({
                    'type': 'timeline',
                    'severity': 'high',
                    'message': f"Project is significantly behind schedule ({timeline_data['schedule_variance']:.0f}% variance).",
                    'action': 'Consider adding resources or negotiating deadline extension'
                })
            else:
                recommendations.append({
                    'type': 'timeline',
                    'severity': 'medium',
                    'message': f"Project is behind schedule by {abs(timeline_data['schedule_variance']):.0f}%.",
                    'action': 'Prioritize critical path tasks and reduce scope if possible'
                })
        
        return recommendations
    
    # ==================== Other Report Types ====================
    
    def get_team_performance_report(
        self,
        team_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Generate team performance report."""
        from app.models import Team, Task, User
        from app.models.team import TeamMember
        from app.models.timesheet import TimeEntry
        
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        team = self.db.query(Team).filter(Team.id == team_id).first()
        if not team:
            return {'error': 'Team not found'}
        
        # Get team members
        members = self.db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
        member_ids = [m.user_id for m in members]
        
        member_stats = []
        for member in members:
            user = self.db.query(User).filter(User.id == member.user_id).first()
            if not user:
                continue
            
            # Tasks completed
            completed = self.db.query(Task).filter(
                Task.assignee_id == member.user_id,
                Task.completed_at >= start_date,
                Task.completed_at <= end_date
            ).count()
            
            # Hours logged
            hours = self.db.query(func.sum(TimeEntry.hours)).filter(
                TimeEntry.user_id == member.user_id,
                TimeEntry.date >= start_date.date(),
                TimeEntry.date <= end_date.date()
            ).scalar() or 0
            
            # Active tasks
            active = self.db.query(Task).filter(
                Task.assignee_id == member.user_id,
                Task.status.in_(['todo', 'in_progress', 'review'])
            ).count()
            
            member_stats.append({
                'user_id': user.id,
                'name': user.full_name,
                'tasks_completed': completed,
                'hours_logged': round(hours, 1),
                'active_tasks': active,
                'capacity_hours': user.capacity_hours_week or 40
            })
        
        # Sort by tasks completed
        member_stats.sort(key=lambda x: x['tasks_completed'], reverse=True)
        
        return {
            'team_id': team_id,
            'team_name': team.name,
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'total_members': len(member_stats),
            'total_tasks_completed': sum(m['tasks_completed'] for m in member_stats),
            'total_hours_logged': round(sum(m['hours_logged'] for m in member_stats), 1),
            'member_stats': member_stats
        }
    
    async def generate_report(
        self,
        report_type: str,
        user_id: str,
        params: Optional[Dict] = None
    ) -> str:
        """Generate report data as string (for scheduled reports)."""
        params = params or {}
        
        if report_type == 'project_variance':
            data = self.get_project_variance_report(params.get('project_id', ''))
        elif report_type == 'team_performance':
            data = self.get_team_performance_report(params.get('team_id', ''))
        else:
            data = {'error': f'Unknown report type: {report_type}'}
        
        return json.dumps(data, indent=2, default=str)
    
    # ==================== Export ====================
    
    def export_report_csv(self, report_data: Dict[str, Any]) -> str:
        """Export report data as CSV."""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Flatten nested data for CSV
        def flatten(data, prefix=''):
            rows = []
            if isinstance(data, dict):
                for key, value in data.items():
                    if isinstance(value, (dict, list)):
                        rows.extend(flatten(value, f"{prefix}{key}_"))
                    else:
                        rows.append([f"{prefix}{key}", str(value)])
            elif isinstance(data, list):
                for i, item in enumerate(data):
                    rows.extend(flatten(item, f"{prefix}{i}_"))
            return rows
        
        rows = flatten(report_data)
        
        # Write header
        writer.writerow(['Field', 'Value'])
        
        # Write data
        for row in rows:
            writer.writerow(row)
        
        return output.getvalue()
    
    def export_report_json(self, report_data: Dict[str, Any]) -> str:
        """Export report data as JSON."""
        return json.dumps(report_data, indent=2, default=str)
