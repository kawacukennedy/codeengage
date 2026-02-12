# ADR 002: Using Supabase as the Data Layer

## Status
Accepted

## Context
Sunder needs a scalable database, user authentication, and object storage with minimal DevOps overhead.

## Decision
We adopted **Supabase** (PostgreSQL) as our primary data platform.

## Rationale
- **PostgreSQL**: Industry standard for reliable data storage.
- **Built-in Auth**: Standardizes user management and JWT issuance.
- **Real-time**: Supabase's real-time capabilities complement our custom WebSocket logic.
- **Storage**: Handles code assets and user avatars seamlessly.

## Consequences
- Requires developers to have a basic understanding of Supabase.
- Local development is slightly more complex if running the full Supabase stack (mitigated by our Docker Compose setup).
