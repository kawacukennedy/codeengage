# ADR 001: Choosing Next.js + Express Architecture

## Status
Accepted

## Context
Sunder requires a highly interactive frontend with SEO capabilities and a robust backend for AI orchestration and real-time collaboration.

## Decision
We chose **Next.js 14** for the frontend and a separate **Express.js** API for the backend.

## Rationale
- **Next.js**: Provides excellent DX, Server Components for performance, and a clear path for Vercel deployment.
- **Express.js**: Offers maximum flexibility for managing WebSockets and long-running AI streaming requests without the constraints of serverless function timeouts.
- **Separation**: Decoupling allows independent scaling and makes it easier for contributors to focus on either the UI or the intelligence engine.

## Consequences
- Requires managing two separate processes during local development.
- Needs a robust CORS strategy and shared authentication logic.
