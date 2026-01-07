# Chronicle - Implementation Plan

This document outlines the complete implementation roadmap for Chronicle, a blog application.

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Next.js 16 (App Router) | React 19, TypeScript |
| Database | PostgreSQL on Neon | Serverless, `neon-http` driver |
| ORM | Drizzle ORM | Type-safe, migrations via `drizzle-kit` |
| Auth | Auth.js v5 + Google OAuth | Drizzle adapter, JWT sessions |
| Images | Cloudflare R2 | S3-compatible, presigned URLs |
| Markdown | `@uiw/react-md-editor` | Dynamic import with `ssr: false` |
| UI | shadcn/ui + Tailwind 4 | new-york style, no custom styling |
| Deploy | Vercel | Edge-compatible |

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Username | Max 20 chars, alphanumeric + underscores | Simple, URL-safe |
| Post URLs | `/@username/slug` | User-centric, SEO-friendly |
| Post excerpts | User-written (optional) | More control for authors |
| Comment deletion | Author OR post owner | Flexible moderation |
| Image uploads | 5MB max | Balance between quality and storage |
| Search | PostgreSQL full-text (titles only) | Simple MVP, can expand later |

## Database Schema

### Tables

```
users
├── id: text (pk) - UUID
├── email: text (unique)
├── name: text
├── username: text (unique) - picked on first login
├── image: text - avatar URL
├── bio: text
├── emailVerified: timestamp
├── createdAt: timestamp
└── updatedAt: timestamp

posts
├── id: text (pk) - UUID
├── authorId: text (fk → users)
├── title: text - max 200 chars
├── slug: text (unique)
├── content: text - markdown
├── excerpt: text - max 300 chars, optional
├── coverImage: text - R2 URL
├── published: boolean
├── publishedAt: timestamp
├── createdAt: timestamp
└── updatedAt: timestamp

comments
├── id: text (pk) - UUID
├── postId: text (fk → posts)
├── authorId: text (fk → users)
├── content: text - markdown, max 2000 chars
├── createdAt: timestamp
└── updatedAt: timestamp

likes
├── userId: text (fk → users)
├── postId: text (fk → posts)
├── createdAt: timestamp
└── (composite pk: userId + postId)

accounts (Auth.js)
├── userId, provider, providerAccountId, etc.

sessions (Auth.js)
├── sessionToken, userId, expires
```

### Indexes

- `posts.slug` - unique index
- `posts.authorId` - for user's posts lookup
- `posts.published + publishedAt` - for homepage listing
- `comments.postId` - for post comments lookup
- `likes.postId` - for like counts

## File Structure

```
chronicle/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx              # Centered auth layout
│   │   ├── sign-in/page.tsx        # Google sign-in button
│   │   └── onboarding/page.tsx     # Username picker (first login)
│   │
│   ├── (main)/
│   │   ├── layout.tsx              # Navbar + footer
│   │   ├── page.tsx                # Homepage (newest posts)
│   │   ├── search/page.tsx         # Search results
│   │   └── [username]/
│   │       ├── page.tsx            # User profile
│   │       └── [slug]/page.tsx     # Post view + comments
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Dashboard layout (protected)
│   │   ├── dashboard/page.tsx      # My posts list
│   │   ├── new/page.tsx            # Create post
│   │   ├── edit/[slug]/page.tsx    # Edit post
│   │   └── settings/page.tsx       # Profile settings
│   │
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── upload/route.ts         # R2 presigned URLs
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                         # shadcn (do not modify)
│   ├── auth/
│   │   ├── sign-in-button.tsx
│   │   └── user-menu.tsx
│   ├── posts/
│   │   ├── post-card.tsx
│   │   ├── post-editor.tsx         # Markdown editor
│   │   ├── post-content.tsx        # Rendered markdown
│   │   └── post-actions.tsx        # Like button
│   ├── comments/
│   │   ├── comment-list.tsx
│   │   └── comment-form.tsx
│   ├── upload/
│   │   └── image-upload.tsx
│   └── layout/
│       ├── navbar.tsx
│       ├── footer.tsx
│       └── search-input.tsx
│
├── lib/
│   ├── db/
│   │   ├── index.ts                # Drizzle client
│   │   └── schema.ts               # All tables
│   ├── auth.ts                     # Auth.js config
│   ├── r2.ts                       # R2 client
│   ├── utils.ts                    # cn(), slugify, etc.
│   └── validators.ts               # Zod schemas
│
├── actions/
│   ├── posts.ts
│   ├── comments.ts
│   ├── likes.ts
│   ├── users.ts
│   └── search.ts
│
├── middleware.ts                   # Auth protection
└── drizzle.config.ts
```

## Implementation Phases

### Phase 1: Foundation

1. **Install dependencies**
   ```bash
   # Core
   bun add drizzle-orm @neondatabase/serverless next-auth@beta @auth/drizzle-adapter
   
   # R2/S3
   bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   
   # Markdown
   bun add @uiw/react-md-editor rehype-sanitize
   
   # Utilities
   bun add zod nanoid slugify
   
   # Dev
   bun add -D drizzle-kit
   ```

2. **Install shadcn components**
   ```bash
   bunx shadcn@latest add button input textarea label card avatar \
     dialog dropdown-menu skeleton toast form separator badge alert
   ```

3. **Create database schema** (`lib/db/schema.ts`)
   - Users table with username field
   - Posts table with slug, published status
   - Comments table with markdown content
   - Likes table with composite primary key
   - Auth.js required tables (accounts, sessions, verificationTokens)

4. **Create Drizzle config** (`drizzle.config.ts`)
   - PostgreSQL dialect
   - Neon connection

5. **Create Drizzle client** (`lib/db/index.ts`)
   - Use `drizzle-orm/neon-http`
   - Export `db` instance

6. **Create .env.example**

### Phase 2: Authentication

1. **Configure Auth.js** (`lib/auth.ts`)
   - Google OAuth provider
   - Drizzle adapter
   - Callbacks for session/JWT
   - Redirect new users to onboarding

2. **Create auth route** (`app/api/auth/[...nextauth]/route.ts`)

3. **Create middleware** (`middleware.ts`)
   - Protect `/dashboard/*` routes
   - Redirect unauthenticated users to sign-in

4. **Create auth UI**
   - `(auth)/layout.tsx` - centered layout
   - `(auth)/sign-in/page.tsx` - Google sign-in button
   - `(auth)/onboarding/page.tsx` - username picker form

5. **Create auth components**
   - `components/auth/sign-in-button.tsx`
   - `components/auth/user-menu.tsx` - avatar dropdown

6. **Push initial schema**
   ```bash
   bunx drizzle-kit push
   ```

### Phase 3: Post CRUD

1. **Create validators** (`lib/validators.ts`)
   - `usernameSchema` - 3-20 chars, alphanumeric + underscore
   - `postSchema` - title, content, excerpt, coverImage
   - `commentSchema` - content max 2000 chars

2. **Create post Server Actions** (`actions/posts.ts`)
   - `createPost(formData)` - create draft
   - `updatePost(slug, formData)` - update post
   - `deletePost(slug)` - delete post
   - `publishPost(slug)` - set published = true
   - `unpublishPost(slug)` - set published = false

3. **Create post queries** (`actions/posts.ts`)
   - `getPost(username, slug)` - single post with author
   - `getPostsByUser(username)` - user's posts
   - `getNewestPosts(page, limit)` - paginated newest
   - `getPostForEdit(slug)` - for edit page (owner only)

4. **Create markdown editor** (`components/posts/post-editor.tsx`)
   - Dynamic import with `ssr: false`
   - Image paste/upload integration
   - Preview mode

5. **Create dashboard pages**
   - `(dashboard)/layout.tsx` - protected layout
   - `(dashboard)/dashboard/page.tsx` - my posts list
   - `(dashboard)/new/page.tsx` - create post form
   - `(dashboard)/edit/[slug]/page.tsx` - edit post form

6. **Create post content renderer** (`components/posts/post-content.tsx`)
   - Use `MDEditor.Markdown` or `react-markdown`
   - `rehype-sanitize` for security

### Phase 4: Image Uploads (R2)

1. **Create R2 client** (`lib/r2.ts`)
   - S3Client configured for R2 endpoint
   - Helper for generating presigned URLs

2. **Create upload route** (`app/api/upload/route.ts`)
   - Validate file type (jpeg, png, gif, webp)
   - Validate file size (max 5MB)
   - Generate presigned PUT URL
   - Return URL and public path

3. **Create upload component** (`components/upload/image-upload.tsx`)
   - Drag-and-drop zone
   - Progress indicator
   - Preview after upload

4. **Integrate with editor**
   - Cover image upload in post form
   - Inline image upload via paste/button

5. **Configure R2 bucket**
   - Enable public access or custom domain
   - Set CORS policy for browser uploads

### Phase 5: Public Pages

1. **Create main layout** (`(main)/layout.tsx`)
   - Navbar with logo, search, auth
   - Footer

2. **Create navbar** (`components/layout/navbar.tsx`)
   - Logo link to home
   - Search input
   - User menu or sign-in button

3. **Create homepage** (`(main)/page.tsx`)
   - Newest posts grid/list
   - Pagination or "Load more"

4. **Create post card** (`components/posts/post-card.tsx`)
   - Cover image
   - Title, excerpt
   - Author avatar + name
   - Like count
   - Published date

5. **Create user profile** (`(main)/[username]/page.tsx`)
   - User info (avatar, name, bio)
   - User's published posts

6. **Create post view** (`(main)/[username]/[slug]/page.tsx`)
   - Full post content
   - Author info
   - Like button
   - Comments section

### Phase 6: Comments & Likes

1. **Create comment actions** (`actions/comments.ts`)
   - `addComment(postId, content)` - create comment
   - `deleteComment(commentId)` - delete (author or post owner)
   - `getComments(postId)` - list with authors

2. **Create like actions** (`actions/likes.ts`)
   - `toggleLike(postId)` - add or remove like
   - `getLikeCount(postId)` - count likes
   - `hasUserLiked(postId)` - check if current user liked

3. **Create comment components**
   - `components/comments/comment-list.tsx` - list with avatars
   - `components/comments/comment-form.tsx` - markdown input

4. **Create like button** (`components/posts/post-actions.tsx`)
   - Optimistic UI with `useOptimistic`
   - Heart icon, count display

### Phase 7: Search

1. **Create search action** (`actions/search.ts`)
   - PostgreSQL full-text search on titles
   - `plainto_tsquery` for user input
   - Return matching posts with authors

2. **Create search input** (`components/layout/search-input.tsx`)
   - Debounced input (300ms)
   - Navigate to `/search?q=...`

3. **Create search page** (`(main)/search/page.tsx`)
   - Display search results
   - Empty state for no results

### Phase 8: Settings & Polish

1. **Create settings page** (`(dashboard)/settings/page.tsx`)
   - Edit name, bio
   - Upload new avatar
   - View/change username (if allowed)

2. **Create user actions** (`actions/users.ts`)
   - `updateProfile(formData)` - update user info
   - `checkUsernameAvailable(username)` - for onboarding

3. **Add loading states**
   - Skeleton components for cards, lists
   - Loading.tsx files for route segments

4. **Add toast notifications**
   - Success/error feedback for actions
   - Use shadcn toast

5. **Add error handling**
   - Error.tsx files for route segments
   - Friendly error messages

## Validation Rules

### Username
- 3-20 characters
- Alphanumeric + underscores only: `^[a-zA-Z0-9_]+$`
- Reserved words: `settings`, `new`, `edit`, `dashboard`, `search`, `api`, `admin`, `auth`

### Posts
- Title: required, 1-200 chars
- Slug: auto-generated, unique per author
- Content: required (markdown)
- Excerpt: optional, max 300 chars
- Cover image: optional, valid URL

### Comments
- Content: required, 1-2000 chars (markdown)

### Images
- Max size: 5MB (5,242,880 bytes)
- Allowed types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`

## Environment Variables

```env
# Database (Neon)
DATABASE_URL=postgres://user:pass@ep-xxx.neon.tech/chronicle?sslmode=require

# Auth.js
AUTH_SECRET=                    # npx auth secret
AUTH_GOOGLE_ID=                 # Google Cloud Console
AUTH_GOOGLE_SECRET=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=                  # Custom domain or r2.dev URL
```

## Key Implementation Patterns

### Auth.js Onboarding Flow

```typescript
// In auth.ts callbacks
callbacks: {
  async signIn({ user }) {
    // Allow sign in, redirect handled in middleware
    return true;
  },
  async jwt({ token, user }) {
    if (user) {
      token.username = user.username;
    }
    return token;
  },
  async session({ session, token }) {
    session.user.username = token.username;
    return session;
  }
}

// In middleware.ts
if (session && !session.user.username && !pathname.startsWith('/onboarding')) {
  return NextResponse.redirect(new URL('/onboarding', request.url));
}
```

### Markdown Editor (SSR-safe)

```typescript
// components/posts/post-editor.tsx
'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { 
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-full" />
});
```

### R2 Presigned Upload

```typescript
// app/api/upload/route.ts
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from '@/lib/r2';

export async function POST(request: Request) {
  const { filename, contentType } = await request.json();
  
  // Validate
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!ALLOWED_TYPES.includes(contentType)) {
    return Response.json({ error: 'Invalid file type' }, { status: 400 });
  }
  
  const key = `uploads/${crypto.randomUUID()}-${filename}`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: MAX_SIZE, // Limit upload size
  });
  
  const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
  
  return Response.json({ presignedUrl, publicUrl });
}
```

### Search Query

```typescript
// actions/search.ts
import { sql } from 'drizzle-orm';

export async function searchPosts(query: string) {
  const results = await db
    .select()
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(
      and(
        eq(posts.published, true),
        sql`to_tsvector('english', ${posts.title}) @@ plainto_tsquery('english', ${query})`
      )
    )
    .orderBy(desc(posts.publishedAt))
    .limit(20);
  
  return results;
}
```

### Optimistic Like Button

```typescript
// components/posts/post-actions.tsx
'use client';
import { useOptimistic, useTransition } from 'react';
import { toggleLike } from '@/actions/likes';

export function LikeButton({ postId, initialLiked, initialCount }) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { liked: initialLiked, count: initialCount },
    (state, newLiked: boolean) => ({
      liked: newLiked,
      count: state.count + (newLiked ? 1 : -1),
    })
  );

  function handleClick() {
    startTransition(async () => {
      setOptimistic(!optimistic.liked);
      await toggleLike(postId);
    });
  }

  return (
    <Button variant="ghost" onClick={handleClick} disabled={isPending}>
      <Heart filled={optimistic.liked} />
      {optimistic.count}
    </Button>
  );
}
```
