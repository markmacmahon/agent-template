# Work In Progress - ChatBot Application Starter

## Current Focus

Preparing frontend for chat UI integration (from ai-chatbot reference project).

## Recent Changes

### 2026-02-14

- Migrated to unified `radix-ui` package, removed 7 individual `@radix-ui/react-*` packages
- Replaced `@radix-ui/react-icons` with `lucide-react`
- Converted `postcss.config.js` to ESM (`postcss.config.mjs`)
- Fixed dark mode variant to include `.dark` element itself
- Added `outline-ring/50` base default
- Aligned CSS variable format with ai-chatbot (hsl in vars, plain refs in @theme)

## Upcoming

- Install `ai` + `@ai-sdk/react` for chat functionality
- Build minimal chat page at `/dashboard/chat`
- Create `/api/chat` route to proxy to AI provider
- Wire chat to per-app context
