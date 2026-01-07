# AGENTS.md - Chronicle Blog Application

This file provides guidance for AI coding agents working in this repository.

## Important Guidelines

- **Always consult official documentation** before implementing new features, especially for UI components (shadcn/ui), Auth.js, Drizzle ORM, and other third-party libraries
- Refer to `PLAN.md` for the detailed implementation roadmap and architecture decisions

## Project Overview

Chronicle is a blog application built with Next.js 16 (App Router), React 19, and TypeScript.
Users can create accounts via Google OAuth, publish markdown blogs, and interact via likes/comments.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + shadcn/ui (new-york style)
- **Database**: PostgreSQL on Neon + Drizzle ORM
- **Auth**: Auth.js v5 (next-auth@beta) with Google OAuth
- **Storage**: Cloudflare R2 (S3-compatible)
- **Package Manager**: Bun

## Commands

```bash
# Development
bun dev              # Start dev server (http://localhost:3000)
bun build            # Production build
bun start            # Start production server
bun lint             # Run ESLint

# Database (Drizzle)
bunx drizzle-kit generate   # Generate migrations from schema changes
bunx drizzle-kit migrate    # Apply migrations to database
bunx drizzle-kit push       # Push schema directly (dev/prototyping)
bunx drizzle-kit studio     # Open Drizzle Studio GUI

# shadcn/ui
bunx shadcn@latest add <component>   # Add a component (e.g., button, card)
```

## Project Structure

```
chronicle/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth pages (sign-in, onboarding)
│   ├── (main)/             # Public pages (home, posts, profiles)
│   ├── (dashboard)/        # Protected pages (my posts, settings)
│   └── api/                # API routes (auth, upload)
├── components/
│   ├── ui/                 # shadcn/ui components (do not edit directly)
│   ├── auth/               # Auth components (user-menu, sign-in-button)
│   ├── posts/              # Post components (card, editor, content)
│   ├── comments/           # Comment components
│   └── layout/             # Layout components (navbar, footer)
├── lib/
│   ├── db/                 # Drizzle client and schema
│   ├── auth.ts             # Auth.js configuration
│   ├── r2.ts               # Cloudflare R2 client
│   ├── utils.ts            # Utility functions (cn, etc.)
│   └── validators.ts       # Zod validation schemas
├── actions/                # Server Actions for mutations
└── middleware.ts           # Auth middleware for route protection
```

## Code Style Guidelines

### Imports

Order imports in this sequence, separated by blank lines:
1. React/Next.js imports
2. Third-party libraries
3. Internal aliases (@/*)
4. Relative imports
5. Type imports (use `import type` when importing only types)

```typescript
import { useState } from "react";
import Image from "next/image";

import { z } from "zod";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { PostCard } from "./post-card";

import type { Post } from "@/lib/db/schema";
```

### Path Aliases

Always use the `@/*` alias for imports from the project root. Never use relative paths like `../../`.

```typescript
// Good
import { auth } from "@/lib/auth";

// Bad
import { auth } from "../../lib/auth";
```

### Components

- Use function declarations for components, not arrow functions
- Place "use client" directive at the top of client components
- Export components as named exports, not default exports (except pages)
- Co-locate component-specific types in the same file

```typescript
"use client";

import { Button } from "@/components/ui/button";

interface PostCardProps {
  title: string;
  excerpt: string;
}

export function PostCard({ title, excerpt }: PostCardProps) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{excerpt}</p>
    </div>
  );
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (components) | kebab-case | `post-card.tsx` |
| Files (utilities) | kebab-case | `validators.ts` |
| Components | PascalCase | `PostCard` |
| Functions | camelCase | `createPost` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase | `PostWithAuthor` |
| Database tables | snake_case | `user_posts` |
| CSS classes | Tailwind utilities | `className="flex items-center"` |

### TypeScript

- Enable strict mode (already configured)
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use `unknown` over `any`; avoid `any` unless absolutely necessary
- Define return types for exported functions

```typescript
interface User {
  id: string;
  name: string;
}

type Status = "draft" | "published";

export async function getUser(id: string): Promise<User | null> {
  // ...
}
```

### Server Actions

- Place Server Actions in the `actions/` directory
- Use `"use server"` directive at the top of the file
- Validate all inputs with Zod
- Return typed results, not throwing errors to the client

```typescript
"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const parsed = createPostSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  // Create post...
  return { success: true, slug: "new-post" };
}
```

### Error Handling

- Use try/catch for async operations that may fail
- Return error objects from Server Actions, don't throw
- Use Zod's `safeParse` for validation (returns result, doesn't throw)
- Log errors server-side, show user-friendly messages client-side

### Styling

- Use Tailwind CSS utility classes exclusively
- Use the `cn()` helper from `@/lib/utils` for conditional classes
- Prefer shadcn/ui components over custom implementations
- Do not modify files in `components/ui/` directly
- **Do not add custom styles to shadcn/ui components** - use them as-is without additional styling

```typescript
import { cn } from "@/lib/utils";

<div className={cn("flex items-center", isActive && "bg-primary")} />
```

### Database (Drizzle)

- Define schemas in `lib/db/schema.ts`
- Use the Drizzle client from `lib/db/index.ts`
- Prefer query builder over raw SQL
- Use transactions for multi-step operations

### Authentication

- Use `auth()` from `@/lib/auth` in Server Components
- Use `useSession()` from `next-auth/react` in Client Components
- Wrap client components needing auth in `SessionProvider`
- Protect routes via `middleware.ts`

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL` - Neon PostgreSQL connection string
- `AUTH_SECRET` - Auth.js secret (generate with `npx auth secret`)
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth credentials
- `R2_*` - Cloudflare R2 credentials and bucket config
