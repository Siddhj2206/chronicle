# Testing

Install dependencies with `bun install`. Tests require a **disposable PostgreSQL
database whose name ends in `_test`**. Integration tests and the seed script
truncate users (cascading to posts, sessions, comments, and likes) and verification
records. Never point them at a shared or production database.

Create `.env.test` (ignored by git), or export the same environment variables:

```dotenv
DATABASE_URL=postgres://chronicle:chronicle@localhost:5432/chronicle_test
BETTER_AUTH_SECRET=testing-only-secret-at-least-32-characters
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=dummy-google-client
GOOGLE_CLIENT_SECRET=dummy-google-secret
R2_ACCESS_KEY_ID=dummy
R2_SECRET_ACCESS_KEY=dummy
R2_BUCKET_NAME=test
R2_ENDPOINT=http://127.0.0.1:9
NEXT_PUBLIC_R2_DOMAIN=http://127.0.0.1:9
```

```bash
bun --env-file=.env.test x drizzle-kit push
bun run test                    # Vitest unit + real-Postgres integration tests
bun run db:seed                  # deterministic, destructive reset and seed
bun --env-file=.env.test run build
bunx playwright install chromium
bun run test:e2e                 # starts production server on port 3000
```

Vitest and Playwright load `.env.test` without overriding exported variables.
The seed creates `test_writer` and `test_reader`, two published articles, a draft,
and a comment. The article fixture is `/@test_writer/chronicle-testing`.
Seed before building so the statically cached home page includes the fixtures.
After running integration tests again, reseed before starting the browser tests.
The not-found smoke asserts the 404 UI rather than HTTP status, because App Router
can stream the not-found boundary after sending a 200 response.
No real OAuth or R2 credentials are needed: action tests mock session, cache, and
R2 content calls; browser tests use signed-out sessions and database content
fallback with a deliberately unreachable local R2 endpoint.

Add unit tests under `tests/unit`, integration suites under `tests/integration`,
and browser tests under `tests/e2e`. Reuse `tests/helpers/db.ts` for database
reset, users, posts, and FormData and `tests/helpers/session.ts` for sign-in
mocking. Call `resetDatabase()` before each integration test and `mockSession()`
explicitly; suites run serially against the same database. The shared setup mocks
`@/lib/session`, `next/cache`, and `@/lib/r2-content` without mocking Drizzle.
CI runs lint, TypeScript, schema push, Vitest, production build, seed, and Chromium
smoke tests. Playwright reports and traces are uploaded on failure.

# Chronicle

A writing and publishing workspace for long-form manuscripts. Chronicle separates
the private writing surface from the public reading surface: drafts are edited
behind an authenticated dashboard, and published work is served as a public
magazine with archives, search, comments, and likes.

Built as a personal project to work on a full-stack publishing stack end to end —
auth, editor, storage, full-text search, and a public read path that shares one
database with the write path.

Live: **[chronicle-lyart.vercel.app](https://chronicle-lyart.vercel.app)**

## What it does

- **Accounts and onboarding** — Google OAuth via Better Auth, with a `username`
  and `bio` on the user record and a first-run onboarding flow that assigns the
  public handle used in manuscript URLs.
- **Manuscript editor** — a Lexical rich-text editor with history, lists, links,
  and code blocks, converted to Markdown on every keystroke
  (`$convertToMarkdownString`) and back into editor nodes on load
  (`$convertFromMarkdownString`).
- **Draft and publish states** — manuscripts carry `published` / `publishedAt`,
  an excerpt, a cover image, and a view counter.
- **Public reading** — a magazine layout at `/`, per-author pages at
  `/<username>`, per-manuscript pages at `/<username>/<slug>`, and a paginated
  `/archive`.
- **Search** — Postgres full-text search over manuscripts with author and date
  filters and cursor pagination.
- **Comments and likes** — both writeable and deletable by the author, with
  comments threaded under a manuscript and likes keyed on `(userId, postId)`.
- **Settings** — profile editing, including changing the avatar that had been
  pinned by the auth provider.
- **Images** — drag-and-drop cover and avatar uploads through an upload route,
  restricted by size and MIME type.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4, shadcn/ui |
| Editor | Lexical (`@lexical/react`, `@lexical/markdown`) |
| Rendering | `react-markdown` + `remark-gfm` + `react-syntax-highlighter` |
| Database | PostgreSQL (Neon), Drizzle ORM, `postgres` driver |
| Auth | Better Auth with Google OAuth |
| Storage | Cloudflare R2 (S3-compatible) via `@aws-sdk/client-s3` |
| Validation | Zod + `react-hook-form` + `@hookform/resolvers` |
| Package manager | Bun |

## Implementation notes

A few decisions that are not obvious from the file tree.

### Manuscript bodies live in R2, not Postgres

Post content moved out of the database and into Cloudflare R2 as
`content/{postId}.md`, with only `post.contentPath` left in Postgres. The
`post.content` column is still written on every insert, carrying an inline
`// Keep in DB for now (migration period)` comment — so for now a body exists in
both places, and `getPostForEditWithContent` falls back to the Postgres copy when
R2 has nothing.

`scripts/migrate-content-to-r2.ts` performs the move, supports `--dry-run`, and
recomputes each post's search vector at the same time. Reads go through
`next/cache` (`unstable_cache` + `revalidateTag`) so a manuscript body is
fetched from R2 once per cache window rather than on every render.

The editor is bidirectional Markdown, not a rich-text blob: Lexical nodes are
serialized to Markdown with `$convertToMarkdownString` and rehydrated with
`$convertFromMarkdownString`, with `MarkdownShortcutPlugin` so `**bold**`-style
input works as you type and a custom transformer for Markdown image syntax.

### Search is hybrid, on purpose

`actions/search.ts` runs Postgres full-text search first:

```sql
to_tsvector('english', COALESCE(search_vector, title)) @@ plainto_tsquery('english', $1)
```

The search vector is stored as `text` and cast at query time, and it is
recomputed in SQL on write, so a manuscript's index cannot drift from its body.

The problem this solves: `plainto_tsquery('english', ...)` collapses **stop
words** to an empty `tsquery`. Searching for `where` or `the` would match
nothing at all. So the query also checks whether the parsed `tsquery` came back
empty and, if so, falls back to `ILIKE` across the title and excerpt. Filters
compose with either path — author, a date preset (`week` / `month` / `year`),
and keyset pagination on the post id.

### Writes are server actions, not route handlers

Posts, comments, likes, users, and search each live in their own module under
`actions/`. Route components stay declarative and call into these; there is no
API surface for writes.

### Route groups

- `(auth)` — sign-in and onboarding
- `(dashboard)` — manuscript list, settings, and their error boundary
- `(editor)` — new manuscript and `/edit/[slug]`, each with a `not-found`
- `(main)` — the public reading surface: home, author, manuscript, archive,
  search

`proxy.ts` handles auth gating for the app.

### Images

`app/api/upload/route.ts` accepts JPEG, PNG, GIF, and WebP up to 5 MB, enforced
in `lib/r2.ts` alongside the lazily-constructed S3 client. Public reads go
through `NEXT_PUBLIC_R2_DOMAIN` rather than proxying bytes through the app.

## Getting started

```bash
bun install
```

Copy `env.example` to `.env.local` and fill it in:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `NEXT_PUBLIC_APP_URL` | Public app origin (required for the auth client in production) |
| `BETTER_AUTH_SECRET` | Better Auth signing secret |
| `BETTER_AUTH_URL` | Auth base URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 credentials |
| `R2_BUCKET_NAME` | Manuscript-content and image bucket |
| `NEXT_PUBLIC_R2_DOMAIN` | Public domain for serving uploaded media |

Then run migrations and start the dev server:

```bash
bunx drizzle-kit migrate
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful scripts:

```bash
bunx tsx scripts/seed-posts.ts                       # seed sample manuscripts
bunx tsx scripts/migrate-content-to-r2.ts --dry-run  # preview the R2 move
```

## Linting and formatting

```bash
bun run lint          # oxlint
bun run lint:fix      # safe automatic lint fixes
bun run format        # oxfmt, write changes
bun run format:check  # CI formatting check
```

Oxlint preserves the supported Next core-web-vitals and TypeScript ESLint rules,
including React hooks and experimental React Compiler checks. Hook rules use the
`react` plugin, not a separate `react-hooks` plugin. The mount-time masthead date
has a targeted `react/purity` suppression to preserve its existing behavior.

The migration cannot retain Next's `no-location-assign-relative-destination`,
React's `no-deprecated`, or the React Compiler `config` and `gating` rules natively.
JSX usage rules are covered by unused-variable analysis and the modern JSX
transform. No ESLint runtime or compatibility plugins are retained.

Oxfmt uses double quotes, semicolons, two-space indentation, and an 80-column
print width. Import, package-key, and Tailwind class sorting are disabled to
preserve existing ordering; Oxfmt supports Tailwind sorting if desired later.
Generated shadcn components (`components/ui`), Drizzle migrations, and build/test
artifacts are excluded from formatting. Both tools also respect `.gitignore`.

## Project structure

```
chronicle/
├── actions/          server actions — posts, comments, likes, search, users
├── app/
│   ├── (auth)/       sign-in, onboarding
│   ├── (dashboard)/  manuscript list, settings
│   ├── (editor)/     new + edit/[slug]
│   ├── (main)/       public home, author, manuscript, archive, search
│   └── api/          auth catch-all + image upload
├── components/
│   ├── magazine/     public layout — masthead, hero/grid/list cards, sidebar
│   ├── posts/        Lexical editor, renderer, post actions
│   ├── comments/     list, form, content
│   ├── layout/       navbar, search input, image upload
│   └── ui/           shadcn/ui primitives
├── drizzle/          generated SQL migrations
├── lib/
│   ├── db/schema.ts  auth + application tables
│   ├── r2.ts         S3 client, upload constraints
│   └── r2-content.ts manuscript bodies in R2, cached
├── proxy.ts          auth gating
└── scripts/          seed + R2 migration
```

## Status

A personal project, built in short concentrated sessions rather than
continuously. The known loose end is the R2 content migration: `post.content` is
still written alongside `post.content_path`, so bodies exist in both places.

`AGENTS.md` in this repo predates the auth migration and still describes
Auth.js; the app uses Better Auth.