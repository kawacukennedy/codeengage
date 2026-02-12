<div align="center">
  <img src="https://raw.githubusercontent.com/kawacukennedy/sunder/main/public/logo.png" width="120" alt="Sunder Logo" />
  <h1>Sunder</h1>
  <p><strong>AI‑powered collaborative platform for code snippets</strong></p>
</div>

<p align="center">
  <img src="https://img.shields.io/github/license/kawacukennedy/sunder?style=for-the-badge&color=8A2BE2" alt="License" />
  <img src="https://img.shields.io/github/v/release/kawacukennedy/sunder?style=for-the-badge&color=00BFFF" alt="Release" />
  <img src="https://img.shields.io/github/actions/workflow/status/kawacukennedy/sunder/ci.yml?branch=main&style=for-the-badge" alt="CI Status" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs Welcome" />
</p>

---

**Sunder** is a next-generation platform designed to sunder the barriers between writing, sharing, and understanding code. Leveraging advanced AI, it transforms static snippets into dynamic, collaborative assets that can be translated, analyzed, and pair-programmed in real-time.

## ✨ Key Features

- 🧠 **Neural Analysis**: Instant AI insights into security, performance, and readability.
- 🌐 **Global Translation**: Sundering language barriers—translate code snippets between 20+ languages instantly.
- 🤝 **Real-time Collaboration**: WebSocket-powered "rooms" for live code pairing and reviews.
- 🔐 **Security First**: Hybrid PIN-based authentication for high-sensitivity actions.
- ⚡ **Lightning Fast**: Built on Next.js 14 and Express for sub-millisecond responsiveness.

## 🚀 Quick Start

### Using Docker (Recommended)
```bash
git clone https://github.com/kawacukennedy/sunder.git
cd sunder
docker-compose up -d
```

### Manual Setup
1. **Frontend**: `cd frontend && npm install && npm run dev`
2. **Backend**: `cd backend && npm install && npm run dev`

> [!TIP]
> Use our **Mock AI Server** during development to skip Gemini API key requirements!
> `npm run dev:mock-ai`

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, Zustand, React Query, Tailwind CSS, Monaco Editor.
- **Backend**: Node.js, Express, Supabase (PostgreSQL), Redis.
- **Intelligence**: Google Gemini API, Piston Code Execution.

## 📂 Project Structure

- `frontend/`: Next.js application.
- `backend/`: Express.js API (logic in `src/`).
- `docs/`: Architecture and API references.
- `scripts/`: Development tools and DB migrations.

## 🤝 Contributing

We love contributors! Please see our **[CONTRIBUTING.md](CONTRIBUTING.md)** for detailed setup instructions and our **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** for our community standards.

## 📄 License & Acknowledgements

Sunder is licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for details.

Special thanks to the open-source community and the AI researchers whose work makes Sunder possible.
