<!-- GSD:project-start source:PROJECT.md -->
## Project

**IceFlow SaaS**

Web-based order and inventory management system for ice factories. Replaces pen-and-paper/Zalo workflows with fast digital order entry, printed delivery slips, and automated inventory/debt tracking for 10-15 person operations with 2-4 delivery trucks handling 50-100 orders/day.

**Target users:**
- Office staff (order entry + phone) — primary power users
- Drivers (view delivery list on phone) — read-only web-view
- Accountants (confirm deliveries + track debt) — reconciliation
- Factory owner (reports + debt overview) — decision-maker

**Core Value:** **Speed over everything.** Staff taking phone calls under pressure must enter orders faster than writing by hand (30 seconds). If the system is slower than pen-and-paper, staff rejects it and returns to chaos.

### Constraints

- **Solo developer**: One codebase (Next.js/React), no native mobile
- **Staff tech literacy**: Office staff comfortable with web; drivers minimal tech — web-view must be dead simple
- **Peak season load**: System must handle 2x normal order volume without slowdown
- **Print reliability**: Delivery slips must print consistently from Chrome on office thermal printer
- **No offline support needed**: Always-online operation acceptable
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

**Frontend:**
- Next.js 15+ (App Router, Server Actions, RSC)
- TanStack Query (data fetching, caching)
- Zustand (lightweight client state — order entry hot path)
- React Hook Form + Zod (form validation)
- Tailwind CSS + shadcn/ui components

**Backend:**
- Next.js API Routes / Server Actions
- Supabase (PostgreSQL hosted database)
- Prisma ORM (type-safe database access)

**Key Libraries:**
- Fuse.js (fuzzy search for customer lookup)
- @tanstack/react-table (future data tables)
- Zod (runtime validation, input schemas)

**Infrastructure:**
- Supabase Auth (future phases)
- Vercel (target deployment)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| next-best-practices | Next.js best practices - file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, bundling | `.agents/skills/next-best-practices/SKILL.md` |
| ui-ux-pro-max | "UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app. Elements: button, modal, navbar, sidebar, card, table, form, and chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient. Integrations: shadcn/ui MCP for component search and examples." | `.agents/skills/ui-ux-pro-max/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
