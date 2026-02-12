# Contributing to Sunder

First off, thank you for considering contributing to Sunder! It's people like you who make Sunder a great tool for everyone.

This guide will walk you through the process of setting up your development environment and submitting your first contribution.

---

## 📋 Code of Conduct

By participating in this project, you agree to abide by our **[Code of Conduct](CODE_OF_CONDUCT.md)**. Please report any unacceptable behavior to [conduct@sunder.app].

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: v18 or higher.
- **Docker & Docker Compose**: For running the database, cache, and mock services.
- **Git**: For version control.
- **Supabase CLI** (Optional but recommended): For database migrations.

### Local Development Setup

1. **Fork the Repository**: Create a fork of the `sunder` repository to your own GitHub account.
2. **Clone your Fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/sunder.git
   cd sunder
   ```
3. **Environment Variables**:
   Copy the `.env.example` file to `.env` in both the root, `frontend/`, and `backend/` directories.
   ```bash
   cp .env.example .env
   # Ensure you configure necessary keys if not using mocks
   ```
4. **Spin up Dependencies**:
   Use Docker Compose to start PostgreSQL, Redis, and the Mock AI server.
   ```bash
   docker-compose up -d
   ```
5. **Install Dependencies**:
   ```bash
   # Root
   npm install
   # Frontend
   cd frontend && npm install
   # Backend
   cd ../backend && npm install
   ```
6. **Start Development Servers**:
   ```bash
   # Frontend (from frontend/)
   npm run dev
   # Backend (from backend/)
   npm run dev
   ```

---

## 🌿 Branching & Commits

### Branch Naming Convention

Always create a new branch for your work. We use the following prefixes:
- `feat/`: New features (e.g., `feat/monaco-integration`)
- `fix/`: Bug fixes (e.g., `fix/auth-leak`)
- `docs/`: Documentation changes (e.g., `docs/api-update`)
- `refactor/`: Code refactoring without behavior changes.
- `perf/`: Performance improvements.

### Conventional Commits

We strictly follow the **[Conventional Commits](https://www.conventionalcommits.org/)** specification. 
Example: `feat(editor): add neural auto-save indicator`

---

## 🚀 Pull Request Process

1. **Keep it Small**: Focus on one feature or bug fix per PR.
2. **Update Tests**: Include unit tests for any new logic.
3. **Link Issues**: Reference the issue your PR resolves (e.g., `Closes #123`).
4. **Status Checks**: Ensure all CI checks (lint, test, build) pass.
5. **Review**: At least one maintainer must approve the PR before merging.

## 🧪 Testing

- **Unit Tests**: `npm test`
- **End-to-End**: We use Playwright for E2E. Run `npm run test:e2e`.
- **Linting**: We enforce ESLint and Prettier rules. Run `npm run lint`.

## 🎨 Style Guide

- Use **Functional Components** with hooks for React.
- Follow **Atomic Design** principles for UI components.
- Use **Tailwind CSS** for styling.
- Ensure all public functions have **JSDoc/TSDoc** comments.

---

## ❓ Need Help?

Feel free to open a **[Discussion](https://github.com/kawacukennedy/sunder/discussions)** or join our **[Discord](https://discord.gg/sunder)**!
