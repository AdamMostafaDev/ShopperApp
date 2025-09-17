# Context Management Guide for Claude Code

## How to Use Documentation for Context Persistence

### 1. Session Context File
- Keep `docs/session-context.md` updated with current work status
- Update it at the end of major tasks or before starting new sessions
- Include: current branch, running services, completed work, pending tasks

### 2. Architecture Documentation
- Maintain `docs/architecture.md` with key system components
- Include: important file locations, data flow, API endpoints
- Update when making structural changes

### 3. Issue Tracking
- Use `docs/known-issues.md` for ongoing problems
- Include: reproduction steps, attempted fixes, current status
- Remove when issues are resolved

### 4. Development Notes
- Keep `docs/dev-notes.md` for technical discoveries
- Include: debugging insights, useful commands, gotchas
- Reference in future troubleshooting

## Starting a New Session

When starting a new Claude Code session:

1. **Read session context first**: "Please read docs/session-context.md to understand current project status"
2. **Update with new work**: Ask Claude to update the context file as work progresses
3. **Reference architecture**: Point Claude to relevant docs for understanding system design

## Benefits

- **No lost context**: Important information persists across sessions
- **Faster onboarding**: New sessions start with full context
- **Team collaboration**: Other developers can understand project state
- **Historical record**: Track decisions and changes over time

## Best Practices

### Content Management
- **Keep it concise**: Focus on current status, not detailed history
- **Archive completed work**: Move old tasks to separate files
- **Use multiple files**: Split by domain (bugs, features, architecture)
- **Prune regularly**: Remove outdated information

### Size Guidelines
- **Target**: Keep session-context.md under 500 lines
- **When to split**: If it exceeds 1000 lines, create archives
- **Archive pattern**: `docs/archive/session-YYYY-MM.md`

### Update Triggers
- After completing major features or bug fixes
- When switching between different areas of work
- Before potentially long/complex tasks
- When you explicitly request updates

## Example Usage

```
User: "Read docs/session-context.md and continue working on the payment flow bug"
Claude: [reads context] "I see you've already fixed the ৳NaN issue. Ready to test or work on the next item?"
```

This approach transforms your documentation into a persistent memory system for Claude Code sessions.