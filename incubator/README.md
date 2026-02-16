# Incubator

Experimental code, ad-hoc scripts, and Claude Code skills that aren't (yet) part of the core application.

## Philosophy

**Core Principle: Bias toward action over perfection.**

This folder exists to encourage experimentation and rapid iteration without the overhead of core standards. Code here can be rough, break things, or never graduate - and that's okay.

## What Goes Here

### ✅ Good Fit for Incubator
- Claude Code skills being developed or tested
- Ad-hoc automation scripts for common tasks
- Experimental features exploring new ideas
- Data migration or transformation utilities
- Development tools and helpers
- Proof-of-concept implementations
- Personal productivity scripts shared with the team

### ❌ Should Go Elsewhere
- Production application code → `backend/` or `frontend/`
- Stable examples for users → `examples/`
- Core database migrations → `backend/alembic_migrations/`
- Shared configuration → root or respective directories

## Standards (Intentionally Light)

The bar is deliberately lower here, but not zero:

### Required
1. **README or docstring** - Every script/skill must explain what it does and how to use it
2. **No secrets** - Don't commit credentials, API keys, or sensitive data
3. **Dependencies documented** - List what needs to be installed (can be in README)
4. **Safe by default** - Destructive operations should require confirmation or use `--force` flag

### Encouraged (But Not Required)
- Tests (any framework, any coverage)
- Type hints (helpful but not enforced)
- Error handling (nice to have)
- Code formatting (run `make precommit` if you want, but not mandatory)
- Idempotent operations (can be run multiple times safely)

### Not Required
- TDD workflow
- Full test coverage
- Strict type checking
- Code review for initial addition

## Organization

```
incubator/
├── README.md (this file)
├── skills/              # Claude Code skills
│   └── my-skill/
│       ├── README.md    # What it does, how to use it
│       └── skill.py     # Skill implementation
└── scripts/             # Ad-hoc scripts
    └── my-script.py     # Self-documented script
```

### Naming Conventions
- Use descriptive names: `migrate-users-to-v2.py` not `script.py`
- For skills: folder name = skill command name (e.g., `skills/analyze-logs/` → `/analyze-logs`)
- Include date in one-off scripts: `2026-02-export-legacy-data.py`

### Writing Conventions
Follow the project's writing style (see root `AGENTS.md` for details):
- **No em dashes** - Use hyphens (-) instead of em dashes (—) in all documentation and code comments
- **Clear, concise language** - Avoid jargon, explain acronyms on first use
- **Active voice** - "The script processes data" not "Data is processed by the script"
- **Code examples** - Show don't tell - include working examples when possible

## Documentation Template

Every script should start with a docstring or have a README:

```python
#!/usr/bin/env python3
"""
Brief: What this script does in one sentence.

Usage:
    python script_name.py [arguments]

Example:
    python migrate_users.py --dry-run
    python migrate_users.py --execute

Prerequisites:
    - Database running (make docker-up-db)
    - Backend dependencies (cd backend && uv sync)

Author: Your Name
Created: 2026-02-16
Status: Experimental / Working / Deprecated
"""
```

For Claude Code skills, include a `README.md` in the skill folder:

```markdown
# Skill Name

Brief description of what this skill does.

## Usage

\`\`\`bash
/skill-name [arguments]
\`\`\`

## Examples

...

## Prerequisites

...
```

## Graduation Path

When experimental code proves valuable and matures, it can graduate to core:

### Graduation Criteria
1. **Proven useful** - Used regularly by team or users
2. **Stable** - Not changing frequently, no known major bugs
3. **Documented** - Clear docs on what it does and how to use it
4. **Tested** - Has meaningful test coverage
5. **Code quality** - Follows core standards (TDD, types, formatting)
6. **Maintained** - Someone commits to maintaining it

### Graduation Process
1. Create issue proposing graduation
2. Refactor to meet core standards (TDD, full tests, types)
3. Move to appropriate location (`backend/`, `frontend/`, `examples/`)
4. Update relevant docs (AGENTS.md, README.md)
5. Add to CI if appropriate

### Where Graduated Code Goes
- **Utility scripts** → `backend/scripts/` or `frontend/scripts/`
- **Backend features** → `backend/app/`
- **Frontend features** → `frontend/`
- **User-facing examples** → `examples/`
- **Skills that should be official** → Consider contributing to Claude Code

## Cleanup Policy

**Inactive code can be removed.**

- No activity for 6+ months → Add "Deprecated" notice to README
- No activity for 12+ months → Can be deleted (preserved in git history)
- Broken code → Fix or remove
- Superseded by core feature → Remove or archive

## Examples

### Good Examples

**✓ Ad-hoc script with clear docs:**
```python
#!/usr/bin/env python3
"""Export all user emails for marketing campaign."""
import sys
sys.path.insert(0, 'backend')
from app.database import async_session_maker
# ... implementation with basic error handling
```

**✓ Experimental Claude Code skill:**
```
incubator/skills/analyze-chat-patterns/
├── README.md           # Clear explanation
├── skill.py           # Main implementation
└── requirements.txt   # Extra dependencies if needed
```

### Poor Examples

**✗ No documentation:**
```python
# script.py - What does this do? No one knows!
import stuff
stuff.do_things()
```

**✗ Hardcoded secrets:**
```python
API_KEY = "sk-1234567890abcdef"  # Never commit this!
```

**✗ Destructive without confirmation:**
```python
# Deletes all users without asking!
delete_all_users()
```

## Tips for Success

1. **Start here, iterate fast** - Don't over-engineer on day 1
2. **Document as you go** - Future you will thank present you
3. **Share early** - Imperfect code shared is better than perfect code not shared
4. **Graduate when ready** - Don't force it, but don't let good code languish
5. **Clean up regularly** - Remove deprecated experiments periodically
6. **Ask for help** - Rough code + question is better than no code

## FAQ

**Q: Do I need approval to add something to incubator?**
A: No. Add it, document it, share it. If it's questionable, discuss it.

**Q: Can I modify someone else's incubator code?**
A: Yes, but add a note. Consider discussing with the original author first.

**Q: Should I write tests?**
A: If it makes you confident, yes. If it slows experimentation, no. Use judgment.

**Q: What if my experiment breaks main/CI?**
A: Fix it immediately or remove it. Incubator code should not break core.

**Q: How do I run incubator code safely?**
A: Read the README/docstring first. Use dry-run flags. Test on dev data. Back up if destructive.

**Q: Can I use different languages/tools here?**
A: Yes! Bash, Python, Node, whatever works. Just document dependencies.

## Contributing

The whole point of this folder is low friction. Don't ask for permission - just:

1. Create your script/skill
2. Add clear documentation
3. Commit and push
4. Share with team if useful

If it's useful, others will use it. If it's not, it can be cleaned up later. That's the process.
