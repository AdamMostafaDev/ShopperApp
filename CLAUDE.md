# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## SESSION START PROTOCOL

**CRITICAL**: Always review this CLAUDE.md file at the start of EVERY session to understand project-specific rules and conventions before taking any actions.

## ABSOLUTE CORE RULE - NEVER VIOLATE THIS

**DO EXACTLY WHAT THE USER TELLS YOU TO DO - NOTHING MORE, NOTHING LESS**

- NEVER make changes without explicit user instructions
- NEVER assume what the user wants
- NEVER be proactive beyond what is asked
- ALWAYS wait for instructions after completing a task
- STOP and WAIT for user input after finishing ANY task

## Feature Development Protocol

**MANDATORY**: Before implementing any new feature, you MUST:
1. Create a detailed step-by-step plan using the TodoWrite tool
2. Present the plan to the user for approval before proceeding
3. Only begin implementation after user confirms the approach
4. This applies to ALL new features, components, or significant changes
5. **AFTER COMPLETING ANY FEATURE - STOP AND WAIT FOR INSTRUCTIONS**

## Task Management Protocol

**REQUIRED**: For all multi-step tasks or complex requests:
1. **Present tasks as checklists** - Show the user a markdown checklist of all tasks to be completed
2. **Use TodoWrite tool** - Track progress using the TodoWrite tool throughout the work
3. **Check off tasks** - Cross off completed items in your responses as you finish them
4. **Keep user informed** - Update the user on progress by showing the updated checklist

Example format:
```
## Tasks to Complete:
- [x] ~~Fix sign-in redirect issue~~
- [x] ~~Update price display to show BDT~~
- [ ] Add currency conversion
- [ ] Test end-to-end functionality
```

### Development Server Management
When making changes and restarting the development server:
- Always kill existing localhost instance before starting a new one
- Use `Ctrl+C` to stop the current dev server, then run `npm run dev` again
- Avoid running multiple instances on different ports (3001, 3002, etc.)
- Keep development focused on the primary localhost instance

## Code Quality Protocol

**MANDATORY**: After making ANY code changes:
1. **Always check for compile errors** - Use `npm run build` or check the dev server output for TypeScript/compilation errors
2. **Never assume changes worked** - Verify the code compiles without errors before moving to the next task
3. **Fix errors immediately** - Do not proceed with other tasks if there are compilation errors
4. **Check related files** - When editing one file, check that related imports/exports still work

**This applies especially to**:
- API routes (route.ts files)
- Page components (page.tsx files) 
- TypeScript interface changes
- Import/export modifications

 

## Database Management

The project uses Prisma with PostgreSQL:
- `npx prisma migrate dev` - Apply migrations in development
- `npx prisma generate` - Generate Prisma client after schema changes
- `npx prisma studio` - Open Prisma Studio GUI
- `npx prisma db push` - Push schema changes without creating migrations

**CRITICAL SAFETY RULE**: NEVER run destructive database commands without explicit user permission:
- NEVER use `prisma migrate reset`, `prisma db reset`, or any commands that delete data
- NEVER use `--force` flags on database operations
- ALWAYS ask for explicit user consent before any destructive actions
- When in doubt, ask the user before proceeding with any database operations

**CRITICAL CODING RULE**: NEVER add default/fallback values without explicit user permission:
- NEVER add hardcoded defaults like "1kg", "USD", etc. without being asked
- ALWAYS ask the user what default behavior they want
- NEVER assume what fallback values should be used
- If data is missing, either ask the user or throw an error - don't guess

**CRITICAL DATABASE AND CODE CONVENTIONS**:
- **ID fields ALWAYS come first** in database schemas and models - this is basic database convention
- Follow proper field ordering: ID, foreign keys, core business fields, optional fields, timestamps, relations
- Maintain consistent naming conventions throughout the codebase
- Follow established patterns in existing code before creating new patterns
- Database schemas should be readable from left to right in logical order



### Testing & Quality
Run `npm run lint` before committing changes to ensure code quality standards.

## CRITICAL DEPLOYMENT SAFETY RULES

**NEVER RUN THESE COMMANDS - THEY KILL CLAUDE PROCESSES:**
- `Stop-Process -Name node -Force` (PowerShell)
- `taskkill /f /im node.exe` (Windows)
- `killall node` (Unix/Linux)
- Any command that forcefully kills ALL node processes

**SAFE NODE SERVICE MANAGEMENT FOR NEXT.JS DEPLOYMENT:**

### Step 1: Check Running Node Processes
```bash
# List all node processes with details
powershell "Get-Process node | Select-Object Id,ProcessName,StartTime,Path"
```

### Step 2: Identify Next.js Development Server Process
```bash
# Find Next.js dev server (usually runs on port 3000)
powershell "netstat -ano | findstr :3000"
```

### Step 3: Kill ONLY the Next.js Development Server
```bash
# Kill by specific PID (replace XXXX with actual PID from Step 2)
powershell "Stop-Process -Id XXXX -Force"

# OR use Ctrl+C in the terminal where npm run dev is running
```

### Step 4: Clean Restart Next.js Application
```bash
# 1. Start fresh development server
npm run dev

# 2. If needed, regenerate Prisma client
npx prisma generate

# 3. If database schema changed, apply migrations
npx prisma migrate dev
```

### Alternative Safe Approach (Terminal-based)
1. Open the terminal where `npm run dev` is running
2. Press `Ctrl+C` to gracefully stop the development server
3. Wait for the process to fully terminate
4. Run `npm run dev` again to restart

**WHY THIS MATTERS:**
- Claude Code runs on Node.js processes
- Killing all node processes terminates Claude and interrupts your session
- Always target specific processes by PID or use graceful shutdown methods