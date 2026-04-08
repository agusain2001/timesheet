-- =============================================================================
-- LightIDEA Timesheet & Project Management System
-- Database Schema (SQLite)
-- Generated: 2026-03-27
-- =============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- =============================================================================
-- SECTION 1: CORE IDENTITY & AUTHENTICATION
-- =============================================================================

-- Organizations that own workspaces and users
CREATE TABLE IF NOT EXISTS organizations (
    id                  VARCHAR(36)     NOT NULL,
    name                VARCHAR(255)    NOT NULL,
    slug                VARCHAR(100),
    logo_url            VARCHAR(500),
    tax_id              VARCHAR(100),
    website             VARCHAR(500),
    industry            VARCHAR(100),
    address             TEXT,
    city                VARCHAR(100),
    state               VARCHAR(100),
    country             VARCHAR(100),
    zip_code            VARCHAR(20),
    phone               VARCHAR(50),
    email               VARCHAR(255),
    subscription_plan   VARCHAR(50),
    max_users           INTEGER,
    max_projects        INTEGER,
    is_verified         BOOLEAN,
    is_active           BOOLEAN,
    created_at          DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_organizations_slug ON organizations (slug);

-- ─────────────────────────────────────────────────────────
-- Workspaces (sub-spaces within an Organisation)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
    id              VARCHAR(36)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    slug            VARCHAR(100),
    description     TEXT,
    owner_id        VARCHAR(36),
    logo_url        VARCHAR(500),
    settings        JSON,
    is_active       BOOLEAN,
    created_at      DATETIME,
    updated_at      DATETIME,
    organization_id TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (owner_id) REFERENCES users (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_workspaces_slug ON workspaces (slug);

-- ─────────────────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                          VARCHAR(36)     NOT NULL,
    email                       VARCHAR(255)    NOT NULL,
    password_hash               VARCHAR(255)    NOT NULL,
    full_name                   VARCHAR(255)    NOT NULL,
    role                        VARCHAR(50),
    department_id               VARCHAR(36),
    avatar_url                  VARCHAR(500),
    position                    VARCHAR(255),
    phone                       VARCHAR(50),
    bio                         TEXT,
    skills                      JSON,
    expertise_level             VARCHAR(20),
    working_hours_start         VARCHAR(10),
    working_hours_end           VARCHAR(10),
    timezone                    VARCHAR(50),
    availability_status         VARCHAR(20),
    capacity_hours_week         FLOAT,
    notification_preferences    JSON,
    ui_preferences              JSON,
    settings                    JSON,
    is_active                   BOOLEAN,
    last_login_at               DATETIME,
    created_at                  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    organization_id             TEXT,
    -- Email verification fields
    email_verified              INTEGER         DEFAULT 0,
    user_status                 TEXT            DEFAULT 'approved',
    email_verification_token    TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (department_id) REFERENCES departments (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);

-- ─────────────────────────────────────────────────────────
-- MFA Settings per user
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mfa_settings (
    id          VARCHAR(36)     NOT NULL,
    user_id     VARCHAR(36)     NOT NULL,
    secret_key  VARCHAR(100),
    is_enabled  VARCHAR(10),    -- 'true' / 'false' stored as text
    backup_codes JSON,
    verified_at DATETIME,
    last_used_at DATETIME,
    created_at  DATETIME,
    updated_at  DATETIME,
    PRIMARY KEY (id),
    UNIQUE (user_id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- ─────────────────────────────────────────────────────────
-- Workspace Members (user ↔ workspace link)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
    id              VARCHAR(36)     NOT NULL,
    workspace_id    VARCHAR(36)     NOT NULL,
    user_id         VARCHAR(36)     NOT NULL,
    role            VARCHAR(50),
    permissions     JSON,
    is_active       BOOLEAN,
    joined_at       DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
    FOREIGN KEY (user_id)      REFERENCES users (id)
);

-- ─────────────────────────────────────────────────────────
-- User Invites
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_invites (
    id              VARCHAR(36)     NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    token           VARCHAR(100)    NOT NULL,
    role            VARCHAR(50),
    team_id         VARCHAR(36),
    workspace_id    VARCHAR(36),
    status          VARCHAR(20),
    expires_at      DATETIME        NOT NULL,
    invited_by_id   VARCHAR(36)     NOT NULL,
    accepted_at     DATETIME,
    created_at      DATETIME,
    PRIMARY KEY (id),
    UNIQUE (token),
    FOREIGN KEY (team_id)        REFERENCES teams (id),
    FOREIGN KEY (workspace_id)   REFERENCES workspaces (id),
    FOREIGN KEY (invited_by_id)  REFERENCES users (id)
);

-- =============================================================================
-- SECTION 2: ROLES & PERMISSIONS (RBAC)
-- =============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id              VARCHAR(36)     NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    display_name    VARCHAR(200)    NOT NULL,
    description     VARCHAR(500),
    workspace_id    VARCHAR(36),
    is_system       BOOLEAN,
    is_default      BOOLEAN,
    level           VARCHAR(20),
    created_at      DATETIME,
    updated_at      DATETIME,
    created_by      VARCHAR(36),
    PRIMARY KEY (id),
    UNIQUE (name),
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
    FOREIGN KEY (created_by)   REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS permissions (
    id              VARCHAR(36)     NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    display_name    VARCHAR(200)    NOT NULL,
    description     VARCHAR(500),
    resource_type   VARCHAR(50)     NOT NULL,
    action          VARCHAR(50)     NOT NULL,
    category        VARCHAR(50),
    is_system       BOOLEAN,
    created_at      DATETIME,
    PRIMARY KEY (id),
    UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_permission_resource_action ON permissions (resource_type, action);

CREATE TABLE IF NOT EXISTS role_permissions (
    id              VARCHAR(36)     NOT NULL,
    role_id         VARCHAR(36)     NOT NULL,
    permission_id   VARCHAR(36)     NOT NULL,
    grant_type      VARCHAR(10),    -- 'allow' | 'deny'
    created_at      DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (role_id)       REFERENCES roles (id),
    FOREIGN KEY (permission_id) REFERENCES permissions (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permission_unique ON role_permissions (role_id, permission_id);

CREATE TABLE IF NOT EXISTS user_roles (
    id          VARCHAR(36)     NOT NULL,
    user_id     VARCHAR(36)     NOT NULL,
    role_id     VARCHAR(36)     NOT NULL,
    scope_type  VARCHAR(20),    -- 'workspace' | 'project' | etc.
    scope_id    VARCHAR(36),
    valid_from  DATETIME,
    valid_until DATETIME,
    created_at  DATETIME,
    assigned_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY (user_id)     REFERENCES users (id),
    FOREIGN KEY (role_id)     REFERENCES roles (id),
    FOREIGN KEY (assigned_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_scope ON user_roles (user_id, role_id, scope_type, scope_id);

CREATE TABLE IF NOT EXISTS resource_permissions (
    id              VARCHAR(36)     NOT NULL,
    user_id         VARCHAR(36)     NOT NULL,
    resource_type   VARCHAR(50)     NOT NULL,
    resource_id     VARCHAR(36)     NOT NULL,
    actions         JSON,
    grant_type      VARCHAR(10),
    created_at      DATETIME,
    granted_by      VARCHAR(36),
    expires_at      DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id)    REFERENCES users (id),
    FOREIGN KEY (granted_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_resource_permission_user ON resource_permissions (user_id, resource_type, resource_id);

-- Per-user, per-page explicit access grants
CREATE TABLE IF NOT EXISTS user_page_access (
    id          VARCHAR(36) NOT NULL,
    user_id     VARCHAR(36) NOT NULL,
    page_key    VARCHAR(50) NOT NULL,
    is_granted  BOOLEAN,
    granted_by  VARCHAR(36),
    created_at  DATETIME,
    updated_at  DATETIME,
    PRIMARY KEY (id),
    CONSTRAINT uq_user_page_access UNIQUE (user_id, page_key),
    FOREIGN KEY (user_id)    REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_user_page_access_user ON user_page_access (user_id);

-- Audit log for permission changes
CREATE TABLE IF NOT EXISTS permission_audit_logs (
    id          VARCHAR(36)     NOT NULL,
    action      VARCHAR(50)     NOT NULL,
    actor_id    VARCHAR(36)     NOT NULL,
    actor_ip    VARCHAR(45),
    target_type VARCHAR(50),
    target_id   VARCHAR(36),
    details     JSON,
    created_at  DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (actor_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_actor_date ON permission_audit_logs (actor_id, created_at);

-- =============================================================================
-- SECTION 3: ORGANISATIONAL STRUCTURE
-- =============================================================================

-- ─────────────────────────────────────────────────────────
-- Departments
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    id              VARCHAR(36)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    notes           TEXT,
    created_at      DATETIME,
    organization_id TEXT,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS department_managers (
    id              VARCHAR(36)     NOT NULL,
    department_id   VARCHAR(36)     NOT NULL,
    user_id         VARCHAR(36)     NOT NULL,
    is_primary      BOOLEAN,
    start_date      DATE,
    end_date        DATE,
    created_at      DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (department_id) REFERENCES departments (id),
    FOREIGN KEY (user_id)       REFERENCES users (id)
);

-- ─────────────────────────────────────────────────────────
-- Teams
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
    id                      VARCHAR(36)     NOT NULL,
    name                    VARCHAR(255)    NOT NULL,
    description             TEXT,
    parent_team_id          VARCHAR(36),
    department_id           VARCHAR(36),
    lead_id                 VARCHAR(36),
    capacity_hours_week     FLOAT,
    color                   VARCHAR(20),
    icon                    VARCHAR(50),
    settings                JSON,
    is_active               BOOLEAN,
    created_at              DATETIME,
    updated_at              DATETIME,
    organization_id         TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (parent_team_id) REFERENCES teams (id),
    FOREIGN KEY (department_id)  REFERENCES departments (id),
    FOREIGN KEY (lead_id)        REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS team_members (
    id                      VARCHAR(36)     NOT NULL,
    team_id                 VARCHAR(36)     NOT NULL,
    user_id                 VARCHAR(36)     NOT NULL,
    role                    VARCHAR(50),
    allocation_percentage   FLOAT,
    start_date              DATE,
    end_date                DATE,
    is_active               BOOLEAN,
    created_at              DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (team_id) REFERENCES teams (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- ─────────────────────────────────────────────────────────
-- Clients
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
    id              VARCHAR(36)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    alias           VARCHAR(50),
    region          VARCHAR(100),
    business_sector VARCHAR(100),
    address         TEXT,
    contact_numbers JSON,
    contacts        JSON,
    notes           TEXT,
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    organization_id TEXT,
    PRIMARY KEY (id)
);

-- ─────────────────────────────────────────────────────────
-- Cost Centers
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_centers (
    id              VARCHAR(36)         NOT NULL,
    name            VARCHAR(255)        NOT NULL,
    code            VARCHAR(50)         NOT NULL,
    description     VARCHAR(500),
    department_id   VARCHAR(36),
    budget_amount   NUMERIC(12, 2),
    budget_period   VARCHAR(20),
    is_active       BOOLEAN,
    created_at      DATETIME            DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            DEFAULT CURRENT_TIMESTAMP,
    organization_id TEXT,
    PRIMARY KEY (id),
    UNIQUE (code),
    FOREIGN KEY (department_id) REFERENCES departments (id)
);

-- =============================================================================
-- SECTION 4: PROJECT MANAGEMENT
-- =============================================================================

-- ─────────────────────────────────────────────────────────
-- Projects
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id                      VARCHAR(36)     NOT NULL,
    name                    VARCHAR(255)    NOT NULL,
    code                    VARCHAR(50),
    description             TEXT,
    client_id               VARCHAR(36),
    department_id           VARCHAR(36),
    team_id                 VARCHAR(36),
    business_owner_id       VARCHAR(36),
    priority                VARCHAR(20),    -- 'low' | 'medium' | 'high' | 'critical'
    status                  VARCHAR(20),    -- 'active' | 'on_hold' | 'completed' | 'cancelled'
    budget                  FLOAT,
    budget_currency         VARCHAR(10),
    actual_cost             FLOAT,
    start_date              DATE,
    end_date                DATE,
    actual_start_date       DATE,
    actual_end_date         DATE,
    progress_percentage     INTEGER,
    contacts                JSON,
    notes                   TEXT,
    settings                JSON,
    custom_fields           JSON,
    ai_health_score         FLOAT,
    ai_risk_factors         JSON,
    created_at              DATETIME,
    updated_at              DATETIME,
    organization_id         TEXT,
    PRIMARY KEY (id),
    UNIQUE (code),
    FOREIGN KEY (client_id)          REFERENCES clients (id),
    FOREIGN KEY (department_id)      REFERENCES departments (id),
    FOREIGN KEY (team_id)            REFERENCES teams (id),
    FOREIGN KEY (business_owner_id)  REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS project_managers (
    id          VARCHAR(36)     NOT NULL,
    project_id  VARCHAR(36)     NOT NULL,
    user_id     VARCHAR(36)     NOT NULL,
    role        VARCHAR(50),
    start_date  DATE,
    end_date    DATE,
    created_at  DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (user_id)    REFERENCES users (id)
);

-- ─────────────────────────────────────────────────────────
-- Project Phases
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_phases (
    id          VARCHAR(36)     NOT NULL,
    project_id  VARCHAR(36)     NOT NULL,
    name        VARCHAR(255)    NOT NULL,
    description TEXT,
    "order"     INTEGER,
    start_date  DATE,
    end_date    DATE,
    status      VARCHAR(20),
    color       VARCHAR(20),
    created_at  DATETIME,
    updated_at  DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- ─────────────────────────────────────────────────────────
-- Epics
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS epics (
    id          VARCHAR(36)     NOT NULL,
    project_id  VARCHAR(36)     NOT NULL,
    phase_id    VARCHAR(36),
    name        VARCHAR(255)    NOT NULL,
    description TEXT,
    color       VARCHAR(20),
    priority    VARCHAR(20),
    status      VARCHAR(20),
    start_date  DATE,
    target_date DATE,
    "order"     INTEGER,
    created_at  DATETIME,
    updated_at  DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (phase_id)   REFERENCES project_phases (id)
);

-- ─────────────────────────────────────────────────────────
-- Milestones
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
    id              VARCHAR(36)     NOT NULL,
    project_id      VARCHAR(36)     NOT NULL,
    phase_id        VARCHAR(36),
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    due_date        DATE            NOT NULL,
    completed_date  DATE,
    is_completed    BOOLEAN,
    color           VARCHAR(20),
    created_at      DATETIME,
    updated_at      DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (phase_id)   REFERENCES project_phases (id)
);

-- ─────────────────────────────────────────────────────────
-- Project Templates
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_templates (
    id                  VARCHAR(36)     NOT NULL,
    name                VARCHAR(255)    NOT NULL,
    description         TEXT,
    default_status      VARCHAR(20),
    phases              JSON,
    epics               JSON,
    milestones          JSON,
    task_templates      JSON,
    default_settings    JSON,
    is_active           BOOLEAN,
    created_by_id       VARCHAR(36),
    created_at          DATETIME,
    updated_at          DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (created_by_id) REFERENCES users (id)
);

-- =============================================================================
-- SECTION 5: TASKS
-- =============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id                  VARCHAR(36)     NOT NULL,
    name                VARCHAR(255)    NOT NULL,
    description         TEXT,
    task_type           VARCHAR(20),    -- 'task' | 'bug' | 'feature' | 'story'
    project_id          VARCHAR(36),
    epic_id             VARCHAR(36),
    phase_id            VARCHAR(36),
    parent_task_id      VARCHAR(36),    -- for subtasks
    department_id       VARCHAR(36),
    team_id             VARCHAR(36),
    assignee_id         VARCHAR(36),    -- primary assignee
    owner_id            VARCHAR(36),    -- task creator/owner
    priority            VARCHAR(20),    -- 'low' | 'medium' | 'high' | 'critical'
    status              VARCHAR(20),    -- 'todo' | 'in_progress' | 'review' | 'done'
    start_date          DATETIME,
    due_date            DATETIME,
    completed_at        DATETIME,
    estimated_hours     FLOAT,
    actual_hours        FLOAT,
    custom_fields       JSON,
    tags                JSON,
    "order"             INTEGER,
    ai_priority_score   FLOAT,
    ai_risk_score       FLOAT,
    ai_suggestions      JSON,
    created_at          DATETIME,
    updated_at          DATETIME,
    organization_id     TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (project_id)     REFERENCES projects (id),
    FOREIGN KEY (epic_id)        REFERENCES epics (id),
    FOREIGN KEY (phase_id)       REFERENCES project_phases (id),
    FOREIGN KEY (parent_task_id) REFERENCES tasks (id),
    FOREIGN KEY (department_id)  REFERENCES departments (id),
    FOREIGN KEY (team_id)        REFERENCES teams (id),
    FOREIGN KEY (assignee_id)    REFERENCES users (id),
    FOREIGN KEY (owner_id)       REFERENCES users (id)
);

-- Multiple assignees per task
CREATE TABLE IF NOT EXISTS task_assignees (
    id              VARCHAR(36)     NOT NULL,
    task_id         VARCHAR(36)     NOT NULL,
    user_id         VARCHAR(36)     NOT NULL,
    role            VARCHAR(50),
    assigned_by_id  VARCHAR(36),
    assigned_at     DATETIME,
    is_primary      BOOLEAN,
    PRIMARY KEY (id),
    FOREIGN KEY (task_id)        REFERENCES tasks (id),
    FOREIGN KEY (user_id)        REFERENCES users (id),
    FOREIGN KEY (assigned_by_id) REFERENCES users (id)
);

-- Task-to-task dependency graph
CREATE TABLE IF NOT EXISTS task_dependencies (
    id              VARCHAR(36)     NOT NULL,
    predecessor_id  VARCHAR(36)     NOT NULL,
    successor_id    VARCHAR(36)     NOT NULL,
    dependency_type VARCHAR(10),    -- 'FS' | 'SS' | 'FF' | 'SF'
    lag_days        INTEGER,
    is_blocking     BOOLEAN,
    created_at      DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (predecessor_id) REFERENCES tasks (id),
    FOREIGN KEY (successor_id)   REFERENCES tasks (id)
);

-- Comments on tasks
CREATE TABLE IF NOT EXISTS task_comments (
    id                  VARCHAR(36)     NOT NULL,
    task_id             VARCHAR(36)     NOT NULL,
    user_id             VARCHAR(36)     NOT NULL,
    content             TEXT            NOT NULL,
    mentions            JSON,
    parent_comment_id   VARCHAR(36),
    is_edited           BOOLEAN,
    is_deleted          BOOLEAN,
    created_at          DATETIME,
    updated_at          DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (task_id)           REFERENCES tasks (id),
    FOREIGN KEY (user_id)           REFERENCES users (id),
    FOREIGN KEY (parent_comment_id) REFERENCES task_comments (id)
);

-- Emoji reactions on task comments
CREATE TABLE IF NOT EXISTS comment_reactions (
    id          VARCHAR(36)     NOT NULL,
    comment_id  VARCHAR(36)     NOT NULL,
    user_id     VARCHAR(36)     NOT NULL,
    reaction    VARCHAR(50)     NOT NULL,
    created_at  DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (comment_id) REFERENCES task_comments (id),
    FOREIGN KEY (user_id)    REFERENCES users (id)
);

-- File attachments linked to tasks
CREATE TABLE IF NOT EXISTS task_attachments (
    id                  VARCHAR(36)     NOT NULL,
    task_id             VARCHAR(36)     NOT NULL,
    user_id             VARCHAR(36)     NOT NULL,
    filename            VARCHAR(255)    NOT NULL,
    original_filename   VARCHAR(255)    NOT NULL,
    file_path           VARCHAR(500)    NOT NULL,
    file_size           INTEGER,
    mime_type           VARCHAR(100),
    version             INTEGER,
    previous_version_id VARCHAR(36),
    is_deleted          BOOLEAN,
    created_at          DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (task_id)             REFERENCES tasks (id),
    FOREIGN KEY (user_id)             REFERENCES users (id),
    FOREIGN KEY (previous_version_id) REFERENCES task_attachments (id)
);

-- Change history for tasks
CREATE TABLE IF NOT EXISTS task_audit_logs (
    id          VARCHAR(36)     NOT NULL,
    task_id     VARCHAR(36)     NOT NULL,
    user_id     VARCHAR(36)     NOT NULL,
    action      VARCHAR(50)     NOT NULL,
    field_name  VARCHAR(100),
    old_value   TEXT,
    new_value   TEXT,
    extra_data  JSON,
    created_at  DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (task_id) REFERENCES tasks (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Scheduled reminders per task per user
CREATE TABLE IF NOT EXISTS task_reminders (
    id              VARCHAR(36)     NOT NULL,
    task_id         VARCHAR(36)     NOT NULL,
    user_id         VARCHAR(36)     NOT NULL,
    reminder_date   DATETIME        NOT NULL,
    message         TEXT,
    is_sent         BOOLEAN,
    sent_at         DATETIME,
    created_at      DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Reusable task blueprints
CREATE TABLE IF NOT EXISTS task_templates (
    id                      VARCHAR(36)     NOT NULL,
    name                    VARCHAR(255)    NOT NULL,
    description             TEXT,
    task_name_template      VARCHAR(255)    NOT NULL,
    task_description        TEXT,
    default_priority        VARCHAR(20),
    default_status          VARCHAR(20),
    estimated_hours         INTEGER,
    default_tags            JSON,
    custom_fields           JSON,
    subtasks                JSON,
    checklist               JSON,
    project_id              VARCHAR(36),
    team_id                 VARCHAR(36),
    is_global               BOOLEAN,
    is_active               BOOLEAN,
    created_by_id           VARCHAR(36),
    created_at              DATETIME,
    updated_at              DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (project_id)    REFERENCES projects (id),
    FOREIGN KEY (team_id)       REFERENCES teams (id),
    FOREIGN KEY (created_by_id) REFERENCES users (id)
);

-- =============================================================================
-- SECTION 6: CUSTOM FIELDS
-- =============================================================================

-- Per-project custom field definitions (dropdown, text, number, date …)
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id              VARCHAR     NOT NULL,
    project_id      VARCHAR     NOT NULL,
    name            VARCHAR(120) NOT NULL,
    field_type      VARCHAR(12)  NOT NULL,  -- 'text' | 'number' | 'date' | 'select' | ...
    options         JSON,
    is_required     BOOLEAN,
    display_order   VARCHAR,
    created_at      DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_custom_field_definitions_project_id ON custom_field_definitions (project_id);

-- Actual custom field values for each task
CREATE TABLE IF NOT EXISTS custom_field_values (
    id          VARCHAR     NOT NULL,
    task_id     VARCHAR     NOT NULL,
    field_id    VARCHAR     NOT NULL,
    value       TEXT,
    updated_at  DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (task_id)  REFERENCES tasks (id)                  ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES custom_field_definitions (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_custom_field_values_task_id ON custom_field_values (task_id);

-- =============================================================================
-- SECTION 7: TIMESHEETS & TIME TRACKING
-- =============================================================================

-- Weekly timesheets per user
CREATE TABLE IF NOT EXISTS timesheets (
    id              VARCHAR(36)     NOT NULL,
    user_id         VARCHAR(36)     NOT NULL,
    week_starting   DATE            NOT NULL,
    status          VARCHAR(20),    -- 'draft' | 'submitted' | 'approved' | 'rejected'
    total_hours     FLOAT,
    achievement     TEXT,
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    submitted_at    DATETIME,
    approved_at     DATETIME,
    organization_id TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Individual day-level entries within a timesheet
CREATE TABLE IF NOT EXISTS time_entries (
    id              VARCHAR(36)     NOT NULL,
    timesheet_id    VARCHAR(36)     NOT NULL,
    project_id      VARCHAR(36),
    task_id         VARCHAR(36),
    day             DATE            NOT NULL,
    hours           FLOAT,
    notes           TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (timesheet_id) REFERENCES timesheets (id),
    FOREIGN KEY (project_id)   REFERENCES projects (id),
    FOREIGN KEY (task_id)      REFERENCES tasks (id)
);

-- Freeform time logs (timer-stop records)
CREATE TABLE IF NOT EXISTS time_logs (
    id              VARCHAR(36)     NOT NULL,
    user_id         VARCHAR(36)     NOT NULL,
    task_id         VARCHAR(36),
    project_id      VARCHAR(36),
    date            DATETIME        NOT NULL,
    hours           FLOAT           NOT NULL,
    started_at      DATETIME,
    ended_at        DATETIME,
    notes           TEXT,
    is_billable     BOOLEAN,
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    organization_id TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id)    REFERENCES users (id),
    FOREIGN KEY (task_id)    REFERENCES tasks (id),
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- Currently running timers (at most one per user)
CREATE TABLE IF NOT EXISTS active_timers (
    id              VARCHAR(36)     NOT NULL,
    user_id         VARCHAR(36)     NOT NULL,
    task_id         VARCHAR(36),
    project_id      VARCHAR(36),
    started_at      DATETIME        NOT NULL,
    notes           TEXT,
    organization_id TEXT,
    PRIMARY KEY (id),
    UNIQUE (user_id),
    FOREIGN KEY (user_id)    REFERENCES users (id),
    FOREIGN KEY (task_id)    REFERENCES tasks (id),
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- Team/user capacity planning per week
CREATE TABLE IF NOT EXISTS capacities (
    id              VARCHAR(36)     NOT NULL,
    user_id         VARCHAR(36)     NOT NULL,
    week_starting   DATETIME        NOT NULL,
    available_hours FLOAT,
    allocated_hours FLOAT,
    logged_hours    FLOAT,
    organization_id TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- =============================================================================
-- SECTION 8: EXPENSES
-- =============================================================================

CREATE TABLE IF NOT EXISTS expense_categories (
    id                  VARCHAR(36)         NOT NULL,
    name                VARCHAR(100)        NOT NULL,
    code                VARCHAR(20)         NOT NULL,
    description         VARCHAR(500),
    icon                VARCHAR(50),
    color               VARCHAR(20),
    default_budget      NUMERIC(12, 2),
    requires_receipt    BOOLEAN,
    is_active           BOOLEAN,
    created_at          DATETIME            DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME            DEFAULT CURRENT_TIMESTAMP,
    organization_id     TEXT,
    PRIMARY KEY (id),
    UNIQUE (name),
    UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS expenses (
    id                          VARCHAR(36)     NOT NULL,
    user_id                     VARCHAR(36)     NOT NULL,
    title                       VARCHAR(255)    NOT NULL,
    description                 TEXT,
    project_id                  VARCHAR(36),
    cost_center_id              VARCHAR(36),
    total_amount                NUMERIC(12, 2),
    currency                    VARCHAR(10),
    vendor                      VARCHAR(255),
    payment_method              VARCHAR(30),
    status                      VARCHAR(20),    -- 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
    rejection_reason            TEXT,
    return_reason               TEXT,
    current_approval_level      INTEGER,
    required_approval_levels    INTEGER,
    created_at                  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    submitted_at                DATETIME,
    approved_at                 DATETIME,
    rejected_at                 DATETIME,
    paid_at                     DATETIME,
    organization_id             TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id)        REFERENCES users (id),
    FOREIGN KEY (project_id)     REFERENCES projects (id),
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers (id)
);

CREATE TABLE IF NOT EXISTS expense_items (
    id              VARCHAR(36)     NOT NULL,
    expense_id      VARCHAR(36)     NOT NULL,
    date            DATE            NOT NULL,
    expense_type    VARCHAR(30),
    category_id     VARCHAR(36),
    amount          NUMERIC(12, 2)  NOT NULL,
    currency        VARCHAR(10),
    currency_rate   NUMERIC(10, 4),
    description     TEXT,
    vendor          VARCHAR(255),
    attachment_url  VARCHAR(500),
    receipt_path    VARCHAR(500),
    ocr_data        JSON,
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (expense_id)  REFERENCES expenses (id)          ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES expense_categories (id)
);

CREATE TABLE IF NOT EXISTS expense_approvals (
    id          VARCHAR(36)     NOT NULL,
    expense_id  VARCHAR(36)     NOT NULL,
    approver_id VARCHAR(36)     NOT NULL,
    level       INTEGER,
    status      VARCHAR(20),
    decision_at DATETIME,
    comments    TEXT,
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (expense_id)  REFERENCES expenses (id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS expense_audit_logs (
    id          VARCHAR(36)     NOT NULL,
    expense_id  VARCHAR(36)     NOT NULL,
    user_id     VARCHAR(36)     NOT NULL,
    action      VARCHAR(50)     NOT NULL,
    old_values  JSON,
    new_values  JSON,
    ip_address  VARCHAR(50),
    user_agent  VARCHAR(500),
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (expense_id) REFERENCES expenses (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users (id)
);

-- Multi-level approval rule engine for expenses
CREATE TABLE IF NOT EXISTS approval_rules (
    id                  VARCHAR(36)         NOT NULL,
    name                VARCHAR(255)        NOT NULL,
    description         VARCHAR(500),
    min_amount          NUMERIC(12, 2),
    max_amount          NUMERIC(12, 2),
    category            VARCHAR(50),
    department_id       VARCHAR(36),
    required_levels     INTEGER,
    auto_approve        BOOLEAN,
    priority            INTEGER,
    is_active           BOOLEAN,
    created_at          DATETIME            DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME            DEFAULT CURRENT_TIMESTAMP,
    organization_id     TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (department_id) REFERENCES departments (id)
);

-- =============================================================================
-- SECTION 9: NOTIFICATIONS & CALENDAR
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id          VARCHAR(36)     NOT NULL,
    user_id     VARCHAR(36)     NOT NULL,
    type        VARCHAR(50)     NOT NULL,
    title       VARCHAR(255)    NOT NULL,
    message     TEXT,
    link        VARCHAR(500),
    icon        VARCHAR(50),
    data        JSON,
    is_read     BOOLEAN,
    is_archived BOOLEAN,
    created_at  DATETIME,
    read_at     DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id                  VARCHAR(36)     NOT NULL,
    user_id             VARCHAR(36)     NOT NULL,
    email_enabled       BOOLEAN,
    push_enabled        BOOLEAN,
    task_assigned       BOOLEAN,
    task_completed      BOOLEAN,
    task_due_soon       BOOLEAN,
    task_overdue        BOOLEAN,
    task_commented      BOOLEAN,
    task_mentioned      BOOLEAN,
    project_updates     BOOLEAN,
    team_updates        BOOLEAN,
    daily_digest        BOOLEAN,
    weekly_digest       BOOLEAN,
    digest_time         VARCHAR(10),
    created_at          DATETIME,
    updated_at          DATETIME,
    PRIMARY KEY (id),
    UNIQUE (user_id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS notification_rules (
    id                      VARCHAR(36)     NOT NULL,
    name                    VARCHAR(255)    NOT NULL,
    description             TEXT,
    trigger_type            VARCHAR(50)     NOT NULL,
    trigger_value           INTEGER,
    trigger_unit            VARCHAR(20),
    notify_assignee         BOOLEAN,
    notify_owner            BOOLEAN,
    notify_team_lead        BOOLEAN,
    notify_project_manager  BOOLEAN,
    notify_roles            JSON,
    escalate_to_id          VARCHAR(36),
    project_id              VARCHAR(36),
    team_id                 VARCHAR(36),
    is_active               BOOLEAN,
    created_at              DATETIME,
    updated_at              DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (escalate_to_id) REFERENCES users (id),
    FOREIGN KEY (project_id)     REFERENCES projects (id),
    FOREIGN KEY (team_id)        REFERENCES teams (id)
);

CREATE TABLE IF NOT EXISTS email_preferences (
    id                          VARCHAR(36)     NOT NULL,
    user_id                     VARCHAR(36)     NOT NULL,
    task_assignments            BOOLEAN,
    task_comments               BOOLEAN,
    task_mentions               BOOLEAN,
    task_due_reminders          BOOLEAN,
    task_overdue                BOOLEAN,
    project_updates             BOOLEAN,
    weekly_digest               BOOLEAN,
    daily_summary               BOOLEAN,
    approval_requests           BOOLEAN,
    system_alerts               BOOLEAN,
    reminder_enabled            BOOLEAN,
    reminder_days_before        JSON,
    reminder_time               VARCHAR(10),
    reminder_timezone           VARCHAR(50),
    digest_enabled              BOOLEAN,
    digest_frequency            VARCHAR(20),
    digest_day_of_week          INTEGER,
    digest_day_of_month         INTEGER,
    digest_time                 VARCHAR(10),
    digest_include_overdue      BOOLEAN,
    digest_include_upcoming     BOOLEAN,
    digest_include_completed    BOOLEAN,
    created_at                  DATETIME,
    updated_at                  DATETIME,
    PRIMARY KEY (id),
    UNIQUE (user_id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Sent e-mail audit trail
CREATE TABLE IF NOT EXISTS email_logs (
    id              VARCHAR(36)     NOT NULL,
    user_id         VARCHAR(36),
    recipient_email VARCHAR(255)    NOT NULL,
    recipient_name  VARCHAR(255),
    subject         VARCHAR(500)    NOT NULL,
    template_id     VARCHAR(100),
    status          VARCHAR(20),
    sent_at         DATETIME,
    error_message   TEXT,
    metadata_json   TEXT,
    created_at      DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Calendar events linked to tasks / projects / milestones
CREATE TABLE IF NOT EXISTS calendar_events (
    id                  VARCHAR(36)     NOT NULL,
    user_id             VARCHAR(36)     NOT NULL,
    title               VARCHAR(255)    NOT NULL,
    description         TEXT,
    start_time          DATETIME        NOT NULL,
    end_time            DATETIME        NOT NULL,
    all_day             BOOLEAN,
    location            VARCHAR(500),
    task_id             VARCHAR(36),
    project_id          VARCHAR(36),
    milestone_id        VARCHAR(36),
    external_id         VARCHAR(255),
    external_provider   VARCHAR(50),
    sync_status         VARCHAR(20),
    last_synced_at      DATETIME,
    is_recurring        BOOLEAN,
    recurrence_rule     VARCHAR(255),
    reminders           JSON,
    created_at          DATETIME,
    updated_at          DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id)      REFERENCES users (id),
    FOREIGN KEY (task_id)      REFERENCES tasks (id),
    FOREIGN KEY (project_id)   REFERENCES projects (id),
    FOREIGN KEY (milestone_id) REFERENCES milestones (id)
);

-- =============================================================================
-- SECTION 10: AUTOMATION & WEBHOOKS
-- =============================================================================

CREATE TABLE IF NOT EXISTS automation_rules (
    id                  VARCHAR(36)     NOT NULL,
    name                VARCHAR(255)    NOT NULL,
    description         TEXT,
    trigger_event       VARCHAR(50)     NOT NULL,
    trigger_conditions  JSON,
    actions             JSON            NOT NULL,
    project_id          VARCHAR(36),
    team_id             VARCHAR(36),
    priority            INTEGER,
    run_count           INTEGER,
    last_run_at         DATETIME,
    is_active           BOOLEAN,
    created_by_id       VARCHAR(36),
    created_at          DATETIME,
    updated_at          DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (project_id)    REFERENCES projects (id),
    FOREIGN KEY (team_id)       REFERENCES teams (id),
    FOREIGN KEY (created_by_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS automation_logs (
    id                  VARCHAR(36)     NOT NULL,
    rule_id             VARCHAR(36)     NOT NULL,
    trigger_entity_type VARCHAR(50)     NOT NULL,
    trigger_entity_id   VARCHAR(36)     NOT NULL,
    trigger_event       VARCHAR(50)     NOT NULL,
    conditions_met      JSON,
    actions_executed    JSON,
    status              VARCHAR(20),
    error_message       TEXT,
    execution_time_ms   INTEGER,
    created_at          DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (rule_id) REFERENCES automation_rules (id)
);

CREATE TABLE IF NOT EXISTS webhooks (
    id                  VARCHAR(36)     NOT NULL,
    name                VARCHAR(255)    NOT NULL,
    url                 VARCHAR(500)    NOT NULL,
    secret              VARCHAR(255),
    events              JSON            NOT NULL,
    workspace_id        VARCHAR(36),
    project_id          VARCHAR(36),
    headers             JSON,
    retry_count         INTEGER,
    timeout_seconds     INTEGER,
    is_active           BOOLEAN,
    last_triggered_at   DATETIME,
    failure_count       INTEGER,
    created_at          DATETIME,
    updated_at          DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
    FOREIGN KEY (project_id)   REFERENCES projects (id)
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id                  VARCHAR(36)     NOT NULL,
    webhook_id          VARCHAR(36)     NOT NULL,
    event_type          VARCHAR(50)     NOT NULL,
    payload             JSON,
    status_code         INTEGER,
    response_body       TEXT,
    response_time_ms    INTEGER,
    attempt_number      INTEGER,
    is_success          BOOLEAN,
    error_message       TEXT,
    created_at          DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (webhook_id) REFERENCES webhooks (id)
);

-- =============================================================================
-- SECTION 11: VIEWS, REPORTS & SAVED FILTERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS saved_views (
    id              VARCHAR(36)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    view_type       VARCHAR(50)     NOT NULL,   -- 'board' | 'list' | 'gantt' | 'calendar'
    is_default      BOOLEAN,
    is_shared       BOOLEAN,
    owner_id        VARCHAR(36)     NOT NULL,
    columns_json    TEXT,
    filters_json    TEXT,
    sorts_json      TEXT,
    grouping_json   TEXT,
    color_by        VARCHAR(50),
    created_at      DATETIME,
    updated_at      DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (owner_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS view_shares (
    id          VARCHAR(36)     NOT NULL,
    view_id     VARCHAR(36)     NOT NULL,
    user_id     VARCHAR(36)     NOT NULL,
    permission  VARCHAR(20),
    created_at  DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (view_id) REFERENCES saved_views (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS saved_filters (
    id              VARCHAR(36)     NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    description     VARCHAR(500),
    entity_type     VARCHAR(50)     NOT NULL,
    filter_config   JSON            NOT NULL,
    sort_config     JSON,
    view_type       VARCHAR(50),
    is_shared       VARCHAR(10),
    share_token     VARCHAR(100),
    user_id         VARCHAR(36)     NOT NULL,
    workspace_id    VARCHAR(36),
    created_at      DATETIME,
    updated_at      DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id)      REFERENCES users (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
    id              VARCHAR(36)     NOT NULL,
    name            VARCHAR(200)    NOT NULL,
    report_type     VARCHAR(50)     NOT NULL,
    report_config   JSON,
    export_format   VARCHAR(20),
    schedule_type   VARCHAR(20)     NOT NULL,   -- 'daily' | 'weekly' | 'monthly'
    schedule_day    VARCHAR(10),
    schedule_time   VARCHAR(10),
    recipients      JSON,
    is_active       VARCHAR(10),
    last_run_at     DATETIME,
    next_run_at     DATETIME,
    created_by_id   VARCHAR(36)     NOT NULL,
    workspace_id    VARCHAR(36),
    created_at      DATETIME,
    updated_at      DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (created_by_id) REFERENCES users (id),
    FOREIGN KEY (workspace_id)  REFERENCES workspaces (id)
);

-- =============================================================================
-- SECTION 12: INTEGRATIONS & FILE STORAGE
-- =============================================================================

CREATE TABLE IF NOT EXISTS integrations (
    id          VARCHAR(36)     NOT NULL,
    name        VARCHAR(255)    NOT NULL,
    type        VARCHAR(50)     NOT NULL,
    provider    VARCHAR(50)     NOT NULL,   -- 'github' | 'jira' | 'slack' | ...
    config      JSON,
    credentials JSON,
    workspace_id VARCHAR(36),
    user_id     VARCHAR(36),
    is_active   BOOLEAN,
    last_sync_at DATETIME,
    last_error  TEXT,
    created_at  DATETIME,
    updated_at  DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
    FOREIGN KEY (user_id)      REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS file_storage (
    id                  VARCHAR(36)     NOT NULL,
    filename            VARCHAR(255)    NOT NULL,
    original_filename   VARCHAR(255)    NOT NULL,
    file_path           VARCHAR(500)    NOT NULL,
    file_size           INTEGER,
    mime_type           VARCHAR(100),
    checksum            VARCHAR(64),
    provider            VARCHAR(50),
    bucket              VARCHAR(255),
    external_url        VARCHAR(500),
    uploaded_by_id      VARCHAR(36),
    workspace_id        VARCHAR(36),
    entity_type         VARCHAR(50),
    entity_id           VARCHAR(36),
    is_public           BOOLEAN,
    is_deleted          BOOLEAN,
    deleted_at          DATETIME,
    created_at          DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (uploaded_by_id) REFERENCES users (id),
    FOREIGN KEY (workspace_id)   REFERENCES workspaces (id)
);

-- =============================================================================
-- SECTION 13: AI / CHATBOT
-- =============================================================================

-- Persistent AI chat history per user
CREATE TABLE IF NOT EXISTS chat_history (
    id          VARCHAR         NOT NULL,
    user_id     VARCHAR         NOT NULL,
    role        VARCHAR         NOT NULL,   -- 'user' | 'assistant'
    content     TEXT            NOT NULL,
    attachments JSON,
    metadata    JSON,
    created_at  DATETIME        NOT NULL    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_chat_history_user_id ON chat_history (user_id);

-- =============================================================================
-- SECTION 14: SUPPORT
-- =============================================================================

CREATE TABLE IF NOT EXISTS support_requests (
    id              VARCHAR(36)     NOT NULL,
    user_id         VARCHAR(36)     NOT NULL,
    subject         VARCHAR(255),
    message         TEXT            NOT NULL,
    priority        VARCHAR(20)     DEFAULT 'normal',
    related_module  VARCHAR(50),
    image_url       VARCHAR(500),
    is_draft        BOOLEAN         DEFAULT 0,
    recipient_ids   TEXT,
    status          VARCHAR(20),
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    resolved_at     DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
