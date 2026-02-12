# Sunder API Reference

All API requests should be made to: `https://api.sunder.app/api` (Production) or `http://localhost:5001/api` (Development).

## 🔐 Authentication

Most endpoints require a `Bearer` token in the `Authorization` header.

```http
Authorization: Bearer <your_access_token>
```

### POST `/auth/register`
Registers a new user.
- **Body**: `{ email, password, username, displayName, pin }`
- **Response**: `200 OK` with user data and access token.

### POST `/auth/login`
Authenticates a user using their 4-digit security PIN.
- **Body**: `{ email, pin }`
- **Response**: `200 OK` with user data and access token.

---

## 📄 Snippets

### GET `/snippets`
List public snippets.
- **Query Params**: `page`, `limit`, `language`, `tags`, `sort`, `search`.
- **Headers**: Returns `X-Total-Count`, `X-Page`, `X-Per-Page`.

### POST `/snippets`
Create a new snippet.
- **Body**: `{ title, description, code, language, tags, visibility, organization_id, is_template, template_variables }`
- **Response**: `201 Created` with snippet and AI analysis.

### PATCH `/snippets/:id`
Update a snippet. Auth required (author only).
- **Body**: Partial snippet object.

---

## 🤖 AI Features

### POST `/ai/generate`
Generate code from prompt.
- **Body**: `{ prompt, language, framework }`

### POST `/ai/translate`
Translate code between languages.
- **Body**: `{ code, source_language, target_language, options }`

### POST `/ai/pair`
Interactive AI pairing session.
- **Body**: `{ code, task, language, conversation_history, personality, options }`

---

## 💬 Collaboration

### POST `/collaboration/sessions`
Create a real-time collaboration session.
- **Body**: `{ snippet_id, settings }`
- **Response**: `201 Created` with `session_token` and `websocket_url`.

### GET `/collaboration/sessions/:token/updates`
Poll for session updates.
- **Query Params**: `since` (timestamp).

---

## 🛠️ System

### GET `/health`
Check system health and service status.
- **Response**: `200 OK` with uptime and service connectivity.
