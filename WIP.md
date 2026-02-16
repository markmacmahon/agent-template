# Work In Progress - Nexo Agent Template

## Current Status

**Stable** - Foundation runtime with webhook routing, SSE streaming, conversation threading, Partner API, and dashboard for managing agents.

## Recent Changes

### 2026-02-16 - Incubator folder for experimental code

- **Incubator structure:** New `incubator/` folder for experimental scripts, tools, and Claude Code skills with lighter standards than core (documentation required, tests optional).
- **Templates:** Working examples for scripts (`example-script.py`, `example-db-query.py`) and skills (`example-skill/`).
- **Documentation:** Comprehensive `incubator/README.md` with guidelines, graduation path, and cleanup policy.
- **Philosophy:** Bias toward action over perfection - encourages rapid iteration while maintaining minimum documentation standards.

### 2026-02-16 - Scalable test data pattern

- **Standardized credentials:** All test users use domain `@nexo.xyz` and password `NexoPass#99`.
- **Persona pattern:** Email format `{persona}@nexo.xyz` (e.g., `tester@nexo.xyz`) for easy addition of new test users.
- **Seed script:** `make seed` creates test data idempotently with `TEST_PERSONAS` array structure for scalable expansion.
- **Updated all E2E tests** to use new credentials.

### 2026-02-16 - Fresh setup verification and fixes

- **Docker naming:** Added `name: nexo` to docker-compose.yml (containers/volumes now use `nexo` prefix instead of `agent-template`).
- **Migration fix:** Resolved duplicate `customer_id` column conflict in migration `e4a06651998f`.
- **Makefile additions:** Added missing `docker-migrate-db` and `seed` targets.
- **Documentation gaps:** Added Playwright browser installation step and test data seeding to README and AGENTS.md.

### 2026-02-16 - Partner API (App ID + Secret) and credentials UI

- **Partner API auth:** Routes under `/apps/{app_id}/...` (subscribers, threads, messages) accept **X-App-Id** + **X-App-Secret** when the app has a webhook secret; no login required. JWT still supported. Config: `WEBHOOK_HEADER_APP_SECRET` (default `X-App-Secret`). Backend tests: app-secret success (subscribers, threads, messages) and wrong secret → 401.
- **Create app:** When webhook is selected, optional **App ID & Secret (optional)** section with secret field and Generate; CTA **Create app & save credentials**. Frontend unit test for webhook section.
- **Edit app:** **App ID & Secret** section (App ID + copy, webhook secret + Generate/Copy/Clear); CTA **Save app & credentials**. Partner API doc on edit page: when app has secret, shows App ID + Secret flow (no login step); otherwise JWT flow.
- **Docs:** `docs/system-overview.md` updated (authorization, Partner API, config, API quick start, E2E count).
- **E2E:** Subscribers flow test for edit page Webhook mode (App ID & Secret, Save app & credentials visible).

### 2026-02-15 - Docs and terminology

- **Docs:** Removed standalone Subscribers doc; Subscribers summary and 3-panel layout moved into README. No "inbox" terminology.
- **E2E:** Comment in subscribers-flow.spec.ts updated (3-panel layout).

### 2026-02-15 - Dashboard and apps table

- **Dedicated app page** at `/dashboard/apps/[id]` (hub: Chat, Subscribers, Edit App). App name in list links to app page; Edit via dropdown or app page.
- **Dashboard** landing (title, agent apps copy, Go to Apps CTA). Sidebar retained.
- **Apps table:** Chat and Subscribers as icon links; actions dropdown (Edit App, Delete). App name link with hover underline/primary.

## Key Architecture Decisions

### i18n Error-Key Contract

Backend returns raw i18n keys in HTTP errors; frontend `translateError()` maps to English. See root `AGENTS.md`.

### i18n file locations

| File | Purpose |
|------|---------|
| `frontend/i18n/keys.ts` | All UI text + backend error key translations |
| `backend/app/i18n/keys.py` | Backend-internal strings only |

### Database Connection Pooling

Two strategies via `DATABASE_POOL_CLASS`:
- `"null"` (default) - No pooling, serverless-friendly (Vercel, Lambda)
- `"queue"` - Connection pool for traditional servers (Docker, VPS, Kubernetes)

## Test Counts (Current)

| Suite | Count |
|-------|-------|
| Backend (pytest) | 154 |
| Frontend (jest) | 178 |
| E2E (playwright) | 15 |
| Example smoke tests | 4 (Python + Node webhook servers) |

Run: `make test-backend`, `make test-frontend`, `make test-e2e`, `make test-examples`

---

## Next Major Feature: Runtime Context Injection

**Goal:** Transform agents from stateless message handlers into contextually-aware services with access to shared user state.

### The Problem Today

Apps (agents) currently receive only:
- The current message
- Conversation history (recent messages in the thread)
- Basic metadata (app_id, thread_id, customer_id)

**What's missing:**
- User profile and preferences
- Cross-session memory (e.g., past purchases, favorite items, dietary restrictions)
- Conversation context (pending actions, recent topics)
- Shared state between agents (handoff data, persistent memory)

This limits agents to stateless, reactive responses without understanding the broader user context.

### The Vision: Stateful Agent Orchestration

See `docs/system-overview.md` (lines 72-218) for detailed architecture diagrams and payload examples.

**Shared State Layer** provides:
1. **User Profile** - Demographics, preferences, settings (e.g., name, language, dietary restrictions, default party size)
2. **Shared Memory** - Persistent cross-session data (e.g., favorite restaurants, past bookings, purchase history)
3. **Conversation Context** - Session-scoped data (e.g., recent topics, pending actions, current workflow state)
4. **Agent Handoff State** - Data passed between agents during orchestration

**Runtime State Injection:** Webhook payloads will include a `state` object with relevant context based on permissions:

```json
{
  "message": { "content": "Book a table for 2 tomorrow" },
  "state": {
    "user_profile": {
      "name": "Alice Chen",
      "preferences": { "dietary_restrictions": ["vegetarian"] }
    },
    "shared_memory": {
      "favorite_restaurants": [...],
      "last_booking": {...}
    }
  },
  "agent_config": {
    "state_access": ["user_profile", "shared_memory"],
    "can_write": ["shared_memory", "conversation_context"]
  }
}
```

**State Write-Back:** Agents can update shared state in their responses:

```json
{
  "reply": "Would you like Bella Vista or Sakura?",
  "state_updates": {
    "shared_memory": {
      "pending_booking": { "date": "2024-03-15", "party_size": 2 }
    },
    "conversation_context": {
      "pending_actions": ["confirm_restaurant_choice"]
    }
  }
}
```

### Technical Implementation Scope

This is a large, multi-phase feature. Key areas:

#### 1. Data Models & Schema

**New models:**
- `UserProfile` - Extends User with demographics, preferences (JSONB)
- `SharedMemory` - Key-value store per subscriber (app_id, customer_id, namespace, key, value_json)
- `ConversationContext` - Session-scoped state per thread (thread_id, context_json)

**Indexes:**
- `(app_id, customer_id, namespace, key)` on SharedMemory for fast lookups
- `thread_id` on ConversationContext

**Migrations:** Alembic migrations to add these tables.

#### 2. State Management APIs

**User Profile:**
- `GET /users/me/profile` - Read own profile
- `PATCH /users/me/profile` - Update profile (preferences, demographics)

**Shared Memory (per app + subscriber):**
- `GET /apps/{app_id}/subscribers/{subscriber_id}/memory` - List memory entries (namespace filter)
- `GET /apps/{app_id}/subscribers/{subscriber_id}/memory/{key}` - Get specific entry
- `PUT /apps/{app_id}/subscribers/{subscriber_id}/memory/{key}` - Set/update entry
- `DELETE /apps/{app_id}/subscribers/{subscriber_id}/memory/{key}` - Remove entry

**Conversation Context (per thread):**
- `GET /threads/{thread_id}/context` - Read context
- `PATCH /threads/{thread_id}/context` - Merge updates into context

**Authorization:**
- Dashboard users (JWT) can manage their own profile and their apps' subscriber memory
- Partner API (X-App-Id + X-App-Secret) can read/write state based on agent permissions
- Agents cannot access state they don't have permissions for

#### 3. Permission System

**App-level configuration** (`apps.config_json`):

```json
{
  "integration_mode": "webhook",
  "state_permissions": {
    "read": ["user_profile", "shared_memory", "conversation_context"],
    "write": ["shared_memory", "conversation_context"]
  }
}
```

**Permission scopes:**
- `user_profile` - Read-only user demographics and preferences
- `shared_memory` - Persistent cross-session data (read/write)
- `conversation_context` - Session-scoped thread data (read/write)
- `agent_handoff` - (Future) Data passed during multi-agent workflows

**Validation:**
- Service layer enforces permissions before injecting state
- Write-back validates agent has write permission for each namespace
- Deny by default - agents must explicitly request permissions

#### 4. State Injection & Write-Back

**ChatOrchestrator changes:**

1. **Pre-webhook:** Query state based on app permissions
   - Load user_profile from User model
   - Load shared_memory from SharedMemory table (filtered by app_id, customer_id)
   - Load conversation_context from ConversationContext table (by thread_id)

2. **Inject state into webhook payload:**
   - Add `state` object with permitted data
   - Add `agent_config` with read/write permissions

3. **Post-webhook:** Process state updates from response
   - Extract `state_updates` from agent response
   - Validate write permissions
   - Persist updates to SharedMemory / ConversationContext
   - Transaction safety - atomic updates

**New service:** `StateService` handles:
- State resolution (fetch relevant state for an agent)
- State injection (build state object from permissions)
- State persistence (write back agent updates)
- Permission enforcement (read/write checks)

#### 5. Dashboard UI

**App Edit Page additions:**

New section: **State Access Configuration**
- Checkboxes for state scopes: User Profile (read-only), Shared Memory (read/write), Conversation Context (read/write)
- Info tooltips explaining each scope
- Preview of what webhook payload will include
- Saved in `apps.config_json.state_permissions`

**Subscribers Page enhancements:**

- **Memory tab** - View/edit shared memory for a subscriber (key-value list with namespace filter)
- **Context inspector** - View current conversation context for selected thread
- **State history** - Audit log of state updates (who/when/what changed)

**New page: User Profile Settings**
- `/dashboard/profile` - User can set their own preferences
- Used when testing apps in the chat interface (user becomes a subscriber)

#### 6. Testing Strategy

**Backend tests:**
- `test_user_profile.py` - CRUD operations on user profiles
- `test_shared_memory.py` - Memory APIs with namespace isolation
- `test_conversation_context.py` - Thread context persistence
- `test_state_injection.py` - Orchestrator injects correct state based on permissions
- `test_state_writeback.py` - Agent updates persist correctly
- `test_permissions.py` - Permission enforcement (deny unauthorized access)

**Frontend tests:**
- State access configuration UI
- Memory viewer/editor components
- Context inspector component

**E2E tests:**
- Configure agent with state permissions
- Send message, verify webhook receives state
- Agent writes back state updates
- Verify state persisted and visible in subsequent messages

### Implementation Phases

**Phase 1: Data Layer (2-3 weeks)**
- Models, migrations, basic CRUD APIs
- StateService skeleton
- Backend tests for models and APIs

**Phase 2: Injection & Write-Back (2 weeks)**
- ChatOrchestrator integration
- State injection into webhook payloads
- State write-back from agent responses
- Permission enforcement
- Backend integration tests

**Phase 3: Dashboard UI (1-2 weeks)**
- App edit: state permissions configuration
- Subscribers: memory viewer/editor
- User profile settings page
- Frontend tests

**Phase 4: Documentation & Examples (1 week)**
- Update system-overview.md with state APIs
- Add example webhook that uses state (booking agent with memory)
- Update Partner API docs with state access
- Migration guide for existing apps

**Phase 5: Polish & Hardening (ongoing)**
- Performance optimization (state query caching)
- Audit logging for state changes
- Privacy controls (user consent for data sharing)
- State namespace conventions and best practices
- Multi-agent handoff (future extension)

### Open Questions

1. **State schema flexibility:** Should shared_memory be pure JSONB key-value, or do we need schema validation per namespace?
2. **State size limits:** What's the max size for a memory entry? Total memory per subscriber?
3. **State versioning:** Do we need to track versions/history of state changes?
4. **Privacy & GDPR:** How do users control what state agents can access? Consent UI?
5. **State expiry:** Should conversation_context auto-expire after thread inactivity?
6. **Cross-app state:** Should multiple apps share user profile? Or isolated per app?
7. **Default state:** Should new subscribers get default/template state? (e.g., onboarding context)

### References

- **Architecture docs:** `docs/system-overview.md` lines 72-218 (Planned Evolution section)
- **Current webhook payload:** lines 125-148
- **Planned stateful payload:** lines 159-218
- **Vision statement:** README.md lines 7-17

---

## Next Major Feature: Projects, Teams & Admin

**Goal:** Enable team collaboration, multi-user workspaces, and platform administration for production deployments.

### The Problem Today

**Single-user model:**
- Each user owns their apps independently
- No way to share apps or collaborate with teammates
- No team workspaces or shared resources
- No admin capabilities for platform operators
- No usage tracking or quotas

**What's needed for production:**
- **Team collaboration** - Multiple users working on the same apps
- **Projects/Workspaces** - Logical grouping of apps with team access
- **Role-based permissions** - Owner, Admin, Editor, Viewer roles
- **Platform administration** - User management, usage analytics, system health
- **Audit logging** - Track who did what and when
- **Usage quotas** - Limit API calls, storage, message volume per team

### Technical Implementation Scope

This is a foundational feature that touches most of the system. Key areas:

#### 1. Data Models & Schema

**New models:**
- `Project` - Workspace for grouping apps (id, name, description, owner_user_id, created_at)
- `ProjectMember` - User membership in projects (project_id, user_id, role, joined_at)
- `AuditLog` - Activity tracking (id, project_id, user_id, action, resource_type, resource_id, metadata_json, created_at)

**Modified models:**
- `App` - Add `project_id` (nullable initially for migration compatibility)
- `User` - Add `is_admin` flag for platform admins

**Roles (enum):**
- `owner` - Full control, can delete project, manage members
- `admin` - Can manage apps, settings, and add/remove members (except owner)
- `editor` - Can create/edit/delete apps, view subscribers, send messages
- `viewer` - Read-only access to apps and conversations

**Indexes:**
- `project_id` on apps for fast project app listing
- `(project_id, user_id)` on project_members for membership checks
- `(project_id, created_at)` on audit_log for activity feeds
- `(user_id, created_at)` on audit_log for user activity

**Migrations:**
- Add Project and ProjectMember tables
- Add AuditLog table
- Add project_id to apps (nullable)
- Add is_admin to users
- Backfill: create default project for each existing user, assign their apps

#### 2. Authorization & Permissions

**New dependency:** `get_project_membership(current_user, project_id) -> ProjectMember | None`
- Fetches user's membership in a project
- Returns None if not a member
- Raises 403 if user doesn't have required role

**Permission checks per role:**

| Action | Owner | Admin | Editor | Viewer |
|--------|-------|-------|--------|--------|
| View apps | ✓ | ✓ | ✓ | ✓ |
| Create app | ✓ | ✓ | ✓ | ✗ |
| Edit app | ✓ | ✓ | ✓ | ✗ |
| Delete app | ✓ | ✓ | ✓ | ✗ |
| View subscribers | ✓ | ✓ | ✓ | ✓ |
| Send messages | ✓ | ✓ | ✓ | ✗ |
| Add members | ✓ | ✓ | ✗ | ✗ |
| Remove members | ✓ | ✓ | ✗ | ✗ |
| Change roles | ✓ | ✓ (not owner) | ✗ | ✗ |
| Edit project settings | ✓ | ✓ | ✗ | ✗ |
| Delete project | ✓ | ✗ | ✗ | ✗ |

**Partner API (X-App-Id + X-App-Secret):**
- Currently app-scoped only
- With projects: validate app belongs to a project with the secret
- Add optional X-Project-Id header for multi-project partners

#### 3. Projects API

**CRUD endpoints:**
- `POST /projects` - Create project (current user becomes owner)
- `GET /projects` - List projects where user is a member
- `GET /projects/{id}` - Get project details
- `PATCH /projects/{id}` - Update project (requires admin/owner)
- `DELETE /projects/{id}` - Delete project (requires owner, cascades apps)

**Team management:**
- `GET /projects/{id}/members` - List members with roles
- `POST /projects/{id}/members` - Add member (requires admin/owner)
- `PATCH /projects/{id}/members/{user_id}` - Update member role (requires admin/owner)
- `DELETE /projects/{id}/members/{user_id}` - Remove member (requires admin/owner)
- `POST /projects/{id}/invitations` - (Future) Invite by email

**Activity:**
- `GET /projects/{id}/activity` - Audit log for project (paginated)

**Modified app endpoints:**
- `GET /apps/` - Filter by project_id, or return all user's accessible apps
- `POST /apps/` - Requires project_id in request body
- Apps now scoped to projects (user must be project member with editor+ role)

#### 4. Platform Admin API

**New routes (requires `is_admin=true`):**

**User management:**
- `GET /admin/users` - List all users (search, filter, paginated)
- `GET /admin/users/{id}` - Get user details + projects + activity
- `PATCH /admin/users/{id}` - Update user (suspend, grant admin, etc.)
- `DELETE /admin/users/{id}` - Delete user and cascade projects

**Usage analytics:**
- `GET /admin/usage/summary` - Platform-wide metrics (users, projects, apps, messages)
- `GET /admin/usage/projects` - Top projects by message volume
- `GET /admin/usage/webhooks` - Webhook call statistics

**System health:**
- `GET /admin/health` - Database connections, queue depths, error rates
- `GET /admin/logs` - Recent errors and warnings (filterable)

**Audit logs:**
- `GET /admin/audit` - Global audit log (all projects, all users)

#### 5. Audit Logging Service

**New service:** `AuditService` automatically logs actions:

**Actions tracked:**
- `project.created`, `project.updated`, `project.deleted`
- `member.added`, `member.role_changed`, `member.removed`
- `app.created`, `app.updated`, `app.deleted`
- `message.sent` (user messages only, not every assistant reply)
- `admin.user_updated`, `admin.user_deleted`

**Metadata examples:**
```json
{
  "action": "app.created",
  "user_id": "uuid",
  "project_id": "uuid",
  "resource_type": "app",
  "resource_id": "uuid",
  "metadata": {
    "app_name": "Booking Agent",
    "integration_mode": "webhook"
  },
  "created_at": "2024-03-15T10:30:00Z"
}
```

**Integration points:**
- Called from service layer (not route handlers) for cleaner testing
- Async fire-and-forget (don't block request on audit write)
- Retention policy (e.g., keep 90 days, archive older)

#### 6. Dashboard UI

**New pages:**

**`/dashboard/projects`** - Project list
- Card grid showing user's projects
- Create new project button
- Project stats (apps count, members count, last activity)

**`/dashboard/projects/[id]`** - Project detail/hub
- Overview: name, description, created date
- Quick stats: apps, members, recent activity
- Links to: Apps, Members, Activity, Settings

**`/dashboard/projects/[id]/apps`** - Apps within project
- Replaces current `/dashboard/apps` route
- Same table/grid layout
- Project breadcrumb

**`/dashboard/projects/[id]/members`** - Team management
- Member list with roles (Owner badge, role dropdown)
- Add member button (search by email)
- Remove member action (can't remove owner or self)
- Change role action (owner can promote to admin)

**`/dashboard/projects/[id]/activity`** - Audit log viewer
- Timeline of recent actions
- Filter by action type, user, date range
- Export to CSV

**`/dashboard/projects/[id]/settings`** - Project settings
- Edit name, description
- Danger zone: delete project

**`/dashboard/admin`** - Platform admin panel (if `user.is_admin`)
- User management table
- Usage dashboard (charts, metrics)
- System health overview
- Global audit log

**Navigation changes:**
- Sidebar: "My Projects" instead of "Apps"
- Projects selector dropdown in header
- Current project context throughout dashboard

#### 7. Migration Strategy

**Backward compatibility:**
1. Projects are optional at first - existing single-user workflows still work
2. Create default project for each existing user on first login
3. Migrate their apps to default project
4. User sees "Personal Project" in projects list
5. Can create additional projects for team collaboration

**Gradual rollout:**
- Phase 1: Add projects data model, default projects, keep UI unchanged
- Phase 2: Enable projects UI behind feature flag
- Phase 3: Make projects required for new users
- Phase 4: Eventually deprecate project-less mode

#### 8. Testing Strategy

**Backend tests:**
- `test_projects_crud.py` - Project CRUD operations
- `test_project_members.py` - Membership management, role changes
- `test_authorization.py` - Permission checks for each role
- `test_admin_api.py` - Admin endpoints (requires is_admin)
- `test_audit_logging.py` - Audit events fire correctly
- `test_project_deletion.py` - Cascade behavior
- `test_migration.py` - Default project creation

**Frontend tests:**
- Projects list and detail pages
- Member management UI
- Role permission enforcement
- Activity log viewer
- Admin dashboard components

**E2E tests:**
- Create project, add apps, invite member
- Member with editor role can edit app
- Member with viewer role cannot edit
- Owner can delete project
- Admin panel functionality (user management, analytics)

### Implementation Phases

**Phase 1: Data Layer & Basic Projects (2-3 weeks)**
- Models, migrations (Project, ProjectMember, AuditLog)
- Project CRUD APIs
- Member management APIs
- Default project creation for existing users
- Backend tests

**Phase 2: Authorization & Permissions (1-2 weeks)**
- Role-based permission checks
- Update app routes to require project membership
- Partner API adjustments
- Backend integration tests

**Phase 3: Dashboard UI - Projects (2 weeks)**
- Projects list and detail pages
- Member management UI
- Activity log viewer
- Project settings
- Frontend tests

**Phase 4: Dashboard UI - Update Navigation (1 week)**
- Migrate from apps-centric to projects-centric UI
- Update sidebar, breadcrumbs, routing
- Project context throughout dashboard

**Phase 5: Platform Admin (2 weeks)**
- Admin API endpoints
- Admin dashboard UI
- User management interface
- Usage analytics and health monitoring

**Phase 6: Audit Logging (1 week)**
- AuditService implementation
- Integrate into all state-changing operations
- Retention and archival policy

**Phase 7: Polish & Migration (1 week)**
- Migration guide for existing users
- Documentation updates
- Feature announcement
- Support for moving apps between projects

### Open Questions

1. **Default project naming:** "Personal Project", "My Workspace", or user's name?
2. **Project limits:** Max projects per user? Max members per project?
3. **Billing integration:** Should projects be the billing entity? Usage quotas per project?
4. **Invitations:** Email-based invites vs. add-by-email-immediately?
5. **App transfer:** Should we allow moving apps between projects? Permission requirements?
6. **Audit retention:** 90 days default? Configurable per project?
7. **Role customization:** Fixed roles only, or custom role definitions?
8. **Multi-project apps:** Can a single app belong to multiple projects? (Likely no)
9. **Guest users:** Invite external users without full account? (e.g., view-only clients)
10. **Admin roles:** Should there be different levels of platform admin? (super-admin, support, etc.)

### Related Features (Future)

- **Usage quotas:** Enforce limits on API calls, message volume, storage per project
- **Billing:** Integrate with Stripe for paid plans (per project or per user?)
- **SSO/SAML:** Enterprise authentication for team workspaces
- **Project templates:** Quick-start templates for common use cases
- **Notification preferences:** Per-project notification settings (email, Slack)
- **Webhooks for events:** Notify external systems of project events (new member, app created, etc.)

---

## Backlog (Lower Priority)

- Optional: file attachments in messages
- Optional: message actions (edit, delete, reactions)
- Optional: markdown rendering in chat
- Optional: search across conversations
- Optional: keyboard navigation shortcuts
