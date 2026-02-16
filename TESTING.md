# Testing the Chat UI

## Quick Start

```bash
# Terminal 1: Backend (auto-kills port 8000)
make start-backend

# Terminal 2: Frontend (auto-kills port 3000)
make start-frontend

# Visit: http://localhost:3000
```

## Test Flow

1. **Register/Login** at http://localhost:3000
2. **Create App**: Dashboard → Create New App → Leave as "Simulator" mode
3. **Open Chat**: Click "Chat" button on your app
4. **Send Message**: Type "Hello" and press Enter

### Expected Behavior

✅ **Modern UI**:
- Clean, centered chat layout (not cramped)
- Rounded input box with shadow
- Circular send button in bottom-right
- Hidden sidebar by default (click ☰ to show)

✅ **Streaming**:
- Message appears on right (blue bubble)
- Response streams on left character-by-character
- Animated cursor during streaming (█)
- Input disabled while streaming

✅ **Interactions**:
- Enter sends, Shift+Enter adds newline
- Input auto-resizes (44px-200px)
- Auto-scrolls to bottom
- Scroll-to-bottom button when scrolled up

## Troubleshooting

### Port Already in Use?

**Always use Make targets** - they auto-kill orphan processes:
```bash
make start-backend   # Kills :8000 first
make start-frontend  # Kills :3000 first
```

### TypeScript Errors?

**This should auto-regenerate!** The watcher should handle it automatically:

1. **Backend watcher** (`backend/watcher.py`):
   - Watches `main.py`, `schemas.py`, `routes/*.py`
   - On change → runs `commands.generate_openapi_schema`
   - Generates `local-shared-data/openapi.json`

2. **Frontend watcher** (`frontend/watcher.js`):
   - Watches `local-shared-data/openapi.json`
   - On change → runs `pnpm run generate-client`
   - Generates `lib/openapi-client/` TypeScript types

If watchers aren't running, manually regenerate:
```bash
cd frontend
pnpm run generate-client
cd ..
make start-frontend
```

### Streaming Not Working?

1. Check backend is running: http://localhost:8000/docs
2. Check browser console for errors (F12)
3. Check Network tab for SSE connection

## Testing Checklist

- [ ] Send first message → creates thread
- [ ] Message streams character-by-character
- [ ] Can send multiple messages
- [ ] Input clears after send
- [ ] Sidebar toggles with ☰ button
- [ ] Scroll-to-bottom button works
- [ ] Works on mobile (DevTools → Toggle device)

## Architecture

### Chat Flow
```
User sends message
    ↓
ChatContainer → Creates thread + user message
    ↓
Calls: GET /apps/{id}/threads/{thread_id}/run/stream
    ↓
Backend → Orchestrator → Simulator (default)
    ↓
SSE events stream to frontend:
  - meta: { source: "simulator" }
  - delta: { text: "chunk" } (multiple)
  - done: { status: "completed" }
    ↓
Frontend displays streaming text with cursor
    ↓
On done: Message persisted to database
```

### OpenAPI Auto-Sync Flow
```
Backend code changes (routes/schemas)
    ↓
backend/watcher.py detects change
    ↓
Runs: commands.generate_openapi_schema
    ↓
Generates: local-shared-data/openapi.json
    ↓
frontend/watcher.js detects openapi.json change
    ↓
Runs: pnpm run generate-client
    ↓
Generates: lib/openapi-client/*.ts
    ↓
Frontend has updated types automatically!
```

**Key**: Both watchers run when you use `make start-backend` and `make start-frontend`.

## Files Changed

**New**:
- `frontend/hooks/use-chat-stream.ts` - SSE streaming
- `frontend/hooks/use-scroll.ts` - Scroll management

**Modified**:
- `frontend/components/chat-container.tsx` - Main orchestration
- `frontend/components/message-list.tsx` - Display + streaming
- `frontend/components/message-input.tsx` - Modern input

**Backend**: No changes! Uses existing `/run/stream` endpoint.

## Common Issues

| Problem | Solution |
|---------|----------|
| Port conflict | Use `make start-backend` / `make start-frontend` |
| Missing exports | `cd frontend && pnpm run generate-client` |
| No streaming | Check backend running, check console |
| Sidebar not showing | Click ☰ button in header |

---

For more details, see:
- `frontend/AGENTS.md` - Frontend development guide
- `backend/AGENTS.md` - Backend development guide
- `WIP.md` - Latest changes and features
