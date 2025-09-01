# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Start Protocol

**IMPORTANT**: Always review this CLAUDE.md file at the start of every session to understand project-specific rules and conventions before taking any actions.

## Feature Development Protocol

**MANDATORY**: Before implementing any new feature, you MUST:
1. Create a detailed step-by-step plan using the TodoWrite tool
2. Present the plan to the user for approval before proceeding
3. Only begin implementation after user confirms the approach
4. This applies to ALL new features, components, or significant changes

## Common Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

### Development Server Management
When making changes and restarting the development server:
- Always kill existing localhost instance before starting a new one
- Use `Ctrl+C` to stop the current dev server, then run `npm run dev` again
- Avoid running multiple instances on different ports (3001, 3002, etc.)
- Keep development focused on the primary localhost instance

 

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

## Web Scraping & Search

The project uses a custom scraper API system for product search and data extraction:
- Search functionality leverages web scraping rather than traditional product APIs
- Product searches are performed via scraping major e-commerce sites
- Rate limiting and caching are implemented to manage scraper performance
- Anti-bot detection measures are in place for reliable data extraction

## Architecture Overview

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode enabled
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Prisma adapter
- **Styling**: Tailwind CSS v4
- **Web Scraping**: Puppeteer, Cheerio, JSDOM for product data extraction

### Key Directory Structure
- `/src/app/` - Next.js App Router pages and API routes
- `/src/components/` - Reusable React components
- `/src/lib/` - Shared utilities and configurations
- `/src/data/` - Static data and mock content
- `/src/types/` - TypeScript type definitions
- `/prisma/` - Database schema and migrations

### State Management
- **Cart State**: React Context API (`src/lib/cart-context.tsx`)
- **User Authentication**: NextAuth.js sessions
- **Database**: Prisma Client with connection pooling

### Web Scraping System
The application features a sophisticated product capture system:
- **Multi-platform Support**: Amazon, Walmart, eBay product extraction
- **Anti-bot Protection**: Rotating user agents and Puppeteer stealth mode
- **Rate Limiting**: Flexible rate limiting to prevent IP blocking
- **Caching**: Smart caching layer for scraped product data
- **Error Handling**: Comprehensive error handling with fallback strategies

### Security Features
- **Authentication**: Secure user authentication with password hashing (Argon2)
- **Rate Limiting**: API endpoint protection against abuse
- **Audit Logging**: Comprehensive audit trail for user actions
- **Input Validation**: Zod schema validation for all inputs
- **CSRF Protection**: Built-in NextAuth.js CSRF protection

### API Routes
- `/api/auth/[...nextauth]` - NextAuth.js authentication endpoints
- `/api/auth/signup` - User registration
- `/api/capture-product` - Product URL scraping and data extraction
- `/api/search` - Product search functionality

### Path Aliases
Uses `@/*` for `./src/*` imports throughout the codebase.

### Development Notes
- Uses Turbopack for faster development builds
- ESLint configured with Next.js TypeScript rules
- Strict TypeScript configuration with proper path mapping
- Database migrations tracked in `/prisma/migrations/`

### Testing & Quality
Run `npm run lint` before committing changes to ensure code quality standards.