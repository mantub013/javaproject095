# AGENTS.md

This document describes the architecture and conventions for the Collaboard project. It is intended for AI agents working on this codebase in future sessions.

## Project Overview

Collaboard is a real-time collaborative whiteboard SPA. Users authenticate, create boards, draw together in real-time, and chat via a sidebar. Boards persist in Netlify Blobs.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (SSR + SPA) |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Auth | Netlify Identity (`@netlify/identity`) |
| Storage | Netlify Blobs (`@netlify/blobs`) |
| Icons | Lucide React |
| Language | TypeScript 5.7 strict mode |
| Deployment | Netlify |

## Directory Structure

```
src/
├── components/
│   ├── CallbackHandler.tsx       # Handles OAuth/confirm/recovery token redirects
│   └── whiteboard/
│       ├── Canvas.tsx            # HTML Canvas drawing component (core whiteboard)
│       ├── Toolbar.tsx           # Left-side tools/colors/brushes panel
│       └── ChatPanel.tsx         # Right-side chat sidebar
├── lib/
│   ├── auth.ts                   # getServerUser server function
│   ├── identity-context.tsx      # Client-side React context for auth state
│   └── types.ts                  # Shared TypeScript types (BoardData, DrawingElement, etc.)
├── middleware/
│   └── identity.ts               # TanStack Start auth middleware
└── routes/
    ├── __root.tsx                # Root layout: IdentityProvider + CallbackHandler
    ├── index.tsx                 # Redirects to /boards or /login
    ├── login.tsx                 # Login/signup page (headless Netlify Identity API)
    ├── boards.tsx                # Boards list page (create, delete, navigate)
    ├── boards.$boardId.tsx       # Whiteboard editor with Canvas + Toolbar + Chat
    └── api/
        ├── boards.ts             # GET list + POST create board
        ├── boards.$boardId.ts    # GET + PUT + DELETE single board
        └── boards.$boardId.sync.ts  # GET poll for changes + POST cursor position
```

## Data Model

Boards are stored in Netlify Blobs under the `whiteboards` store:
- Key pattern: `board:{userId}:{boardId}`
- Shape: `BoardData` from `src/lib/types.ts`

`BoardData` includes:
- `elements: DrawingElement[]` — all drawing elements
- `messages: ChatMessage[]` — chat history
- `cursors: Record<userId, CursorPosition>` — last known cursor per user
- `version: number` — incremented on every PUT (used for polling conflict detection)

## Real-Time Architecture

WebSocket support is not available on Netlify Functions. Real-time collaboration is implemented via **polling**:

1. Whiteboard editor polls `GET /api/boards/{id}/sync?since={version}` every **2 seconds**
2. Own cursor is sent via `POST /api/boards/{id}/sync` every **1.5 seconds**
3. Server prunes cursors not updated in the last 10 seconds
4. On version change, the client merges the remote board state (last-writer-wins)

## Canvas Architecture

`Canvas.tsx` renders a single `<canvas>` element and re-draws all elements on every state change:

- Background: fills with grid lines (dark/light mode aware)
- Elements: drawn in order via `drawElement()` (path, rect, circle, line, text, sticky)
- Cursors: drawn as colored dots with name labels
- Text/sticky editing: uses an absolutely-positioned `<textarea>` overlay
- Hit-testing: for the select tool, elements are tested in reverse Z order

Element types defined in `src/lib/types.ts`:
- `path` — freehand (array of points)
- `rect` — rectangle (x, y, width, height)
- `circle` — ellipse (cx, cy, rx, ry)
- `line` — straight line (x1, y1, x2, y2)
- `text` — text at position (renders via canvas fillText)
- `sticky` — sticky note (rect with word-wrapped text)

## Authentication

Uses Netlify Identity. Key files:
- `src/lib/identity-context.tsx` — `IdentityProvider` and `useIdentity()` hook
- `src/lib/auth.ts` — `getServerUser()` server function for SSR auth checks
- `src/components/CallbackHandler.tsx` — handles `#confirmation_token`, `#recovery_token`, etc.
- `.netlify/features/netlify-identity` — marker file that enables Identity on deploy

Authentication only works on deployed Netlify sites, not localhost.

## Conventions

- Components: PascalCase, functional React
- Routes: file-based with TanStack Router conventions (dots for path segments, `$` for params)
- Styling: Tailwind CSS utility classes; dark mode via prop drilling (`darkMode: boolean`)
- API routes: `src/routes/api/*.ts` use `server.handlers` pattern from TanStack Start
- Import alias: `@/` maps to `src/` (configured in `tsconfig.json`)
- No global state library; auth state via React Context, board state via `useState`

## Non-Obvious Decisions

- **Polling over WebSockets**: Netlify Functions don't support persistent connections, so polling was chosen. The 2s interval is a balance between responsiveness and API call cost.
- **Canvas re-render on state change**: The canvas is redrawn in a `useEffect` triggered by `elements` changes. React is the source of truth; no separate render loop.
- **Last-writer-wins merge**: Board state conflicts are resolved by accepting the remote board if its version is higher. OT/CRDT would be a future improvement.
- **Text/sticky as HTML overlay**: Text editing uses a positioned `<textarea>` over the canvas for native browser input, then commits the result as a canvas element on blur.
