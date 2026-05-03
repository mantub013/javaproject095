# Collaboard

A real-time collaborative whiteboard application built with TanStack Start and deployed on Netlify. Multiple users can draw, annotate, and chat on shared boards simultaneously.

## Features

- **Freehand drawing** with configurable colors and brush sizes
- **Shapes**: rectangles, circles, and lines
- **Text boxes** and **sticky notes** with editable content
- **Real-time cursors** showing all active users on the board
- **User authentication** via Netlify Identity (email/password signup)
- **Save and load** whiteboard sessions using Netlify Blobs
- **Export** as PNG or print to PDF
- **Chat panel** for team collaboration
- **Dark/light mode** toggle
- **Undo/redo** history
- **Zoom** in and out
- Responsive layout that works on desktop and tablet

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Auth | Netlify Identity (`@netlify/identity`) |
| Storage | Netlify Blobs |
| Language | TypeScript 5.7 (strict mode) |
| Deployment | Netlify |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

> **Note:** Netlify Identity authentication only works on a deployed Netlify site (not localhost). The app will render but login/signup will fail without a deployed backend.

For full local testing including auth, use the Netlify CLI:

```bash
npx netlify dev
```

### Build

```bash
npm run build
```

## Deployment

Deploy to Netlify by connecting this repository. Netlify Identity is automatically enabled on deploy (the `.netlify/features/netlify-identity` marker is committed).

After first deploy, configure Identity in the Netlify dashboard:
- **Project configuration → Identity**: Enable if not auto-enabled
- **Auto-confirm**: Enable for development (skips email confirmation)

## Usage

1. Sign up at `/login` with email and password
2. Confirm your email (or enable auto-confirm in Netlify dashboard)
3. Create a new board from the boards list
4. Use the toolbar on the left to select tools, colors, and brush sizes
5. Share the board URL with collaborators — cursors appear in real-time (polling every 2s)
6. Use the chat panel (bubble icon in header) to communicate
7. Export via the download button (PNG) or PDF button
