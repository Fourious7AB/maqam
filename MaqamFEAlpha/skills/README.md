

## Available Skills

### 1. `maqam-frontend-dev`

**Location:** `skills/software-development/maqam-frontend-dev/SKILL.md`

**What it covers:**
- Project structure and architecture
- Authentication and authorization patterns
- Role-based access control (RBAC) implementation
- API integration patterns
- Development workflows
- Common pitfalls and debugging guides
- Code style guidelines

**When to use:**
- Developing new features for the admin CRM
- Implementing authentication/authorization
- Debugging role-based access issues
- Onboarding new developers
- Understanding the codebase structure

## How to Use

### With Hermes Agent

When chatting with Hermes Agent, you can reference skills like this:

```
@skill:maqam-frontend-dev How do I add a new admin feature?
```

Or simply ask questions and Hermes will automatically load relevant skills:

```
How does authentication work in this project?
```

```
I need to add a new role. What files do I need to modify?
```

### Manual Reference

You can also read the skill files directly:

```bash
# View the main skill
cat skills/software-development/maqam-frontend-dev/SKILL.md
```

## Built-in Hermes Skills

In addition to project-specific skills, Hermes has built-in skills that are useful for this project:

### `react-auth-implementation`
Documents the exact authentication pattern we implemented:
- Separation of authentication vs authorization
- Login handler patterns (what NOT to do)
- Protected route guards
- API response normalization

### `systematic-debugging`
Structured debugging approach:
- 4-phase debugging process
- Root cause analysis before fixing
- Verification procedures

### `github`
GitHub CLI workflows:
- Creating PRs
- Managing issues
- Code reviews

### `requesting-code-review`
Pre-commit review process:
- Security scanning
- Quality gates
- Auto-fix suggestions

## Creating New Skills

As your project evolves, you can add more skills:

1. **Identify a recurring workflow** that would benefit from documentation
2. **Create a new skill file** in the appropriate category:
   ```
   skills/<category>/<skill-name>/SKILL.md
   ```
3. **Follow the skill format** (see `maqam-frontend-dev/SKILL.md` as template)
4. **Commit to version control** so the whole team benefits

### Skill Categories

```
skills/
├── software-development/    # Code patterns, workflows
├── testing/                # Testing strategies
├── deployment/             # Deployment processes
├── design/                 # Design systems, UI patterns
└── documentation/          # Documentation standards
```

## Skill Format

Each skill should have:

```markdown
---
name: skill-name
description: Brief one-liner (under 60 chars).
version: 1.0.0
author: Team Name, Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [relevant, tags]
    related_skills: [other-skill-name]
---

# Skill Title

Brief introduction.

## When to Use
- Bullet points of when to load this skill

## Quick Reference
- Common commands/patterns

## Procedures
1. Step-by-step workflows

## Pitfalls
- Known issues and gotchas

## Verification
- How to verify success
```

## Benefits of Using Skills

1. **Consistency** - Everyone follows the same patterns
2. **Faster Onboarding** - New developers get up to speed quickly
3. **Better AI Assistance** - Hermes gives more accurate help
4. **Living Documentation** - Updates as the project evolves
5. **Knowledge Preservation** - Team knowledge doesn't leave with developers

## Examples

### Example 1: Adding Authentication to a New Feature

```
Me: I need to add authentication to the new booking feature

Hermes: [Loads maqam-frontend-dev skill]
Based on the project's authentication patterns, here's what you need:

1. Import the auth store:
   import { useAuthStore } from '../store/authStore';

2. Check authentication in your component:
   const { user, accessToken } = useAuthStore();
   if (!accessToken) return <Navigate to="/admin/login" />;

3. Add role-based checks if needed:
   if (!['admin', 'sales_agent'].includes(user?.role)) {
     return <AccessDenied />;
   }

Would you like me to implement this for your booking feature?
```

### Example 2: Debugging Login Issues

```
Me: Login is successful but user isn't redirected to dashboard

Hermes: [Loads maqam-frontend-dev and react-auth-implementation skills]
This is a common issue. Let me check your login handler...

[Analyzes code]

Found the issue: You're checking user role in the login handler,
which blocks navigation. According to our authentication pattern,
role checks should happen in ProtectedRoute.jsx, not in the login
handler.

Here's the fix: [provides specific code changes]
```

## Maintenance

Skills should be updated when:
- New patterns are established
- Architecture changes
- Common pitfalls are discovered
- APIs are updated
- New features are added

Update the skill file and commit the changes so everyone benefits.

## Questions?

If you have questions about using Hermes Skills:
1. Ask Hermes: "How do I use skills?"
2. Read: https://hermes-agent.nousresearch.com/docs/skills
3. Check built-in skills: Open Hermes and type `/skills list`

---

**Created:** 2026-09-04  
**Last Updated:** 2026-09-04  
**Maintainer:** Maqam Development Team
