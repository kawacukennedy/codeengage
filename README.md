# CodeEngage - Developer Code Snippets Platform

A modern, developer-focused web application for saving, sharing, and discovering code snippets with advanced collaboration, code analysis, and productivity features. Built with PHP, MySQL, HTML, and Tailwind CSS.

## 🚀 Features

- **User Authentication**: Secure login/signup with JWT and session management
- **Snippet Management**: Create, edit, version, fork, and share code snippets
- **Real-time Collaboration**: HTTP long polling for collaborative editing
- **Code Analysis**: Automatic complexity calculation, security scanning, and performance suggestions
- **Advanced Search**: Full-text search with filters and semantic matching
- **Gamification**: Achievements, points system, and leaderboards
- **Modern UI**: Dark theme, responsive design, keyboard shortcuts
- **API-First**: RESTful API for frontend/backend separation
- **PWA Ready**: Progressive web app capabilities

## 🏗️ Architecture

### Decoupled Monolith Design
- **Backend**: PHP 8.0+ with MySQL 8.0+
- **Frontend**: Vanilla JavaScript with modern ES6+
- **Database**: Comprehensive relational schema with proper indexing
- **API**: RESTful JSON API with JWT authentication
- **Deployment**: Supports both single-server and separate hosting

## 📁 Project Structure

```
codeengage/
├── codeengage-frontend/          # Frontend application
│   ├── public/
│   │   ├── index.html           # SPA entry point
│   │   └── .htaccess           # Apache rewrites
│   ├── src/
│   │   ├── css/                # Stylesheets
│   │   ├── js/
│   │   │   ├── modules/        # JavaScript modules
│   │   │   └── pages/          # Page-specific logic
│   │   └── templates/         # HTML templates
│   └── assets/                 # Static assets
│
├── codeengage-backend/           # Backend API
│   ├── public/
│   │   ├── index.php           # API entry point
│   │   └── .htaccess           # API routing
│   ├── app/
│   │   ├── Controllers/Api/    # API controllers
│   │   ├── Services/           # Business logic
│   │   ├── Repositories/       # Data access layer
│   │   ├── Models/             # Data models
│   │   ├── Middleware/         # Request middleware
│   │   ├── Exceptions/         # Custom exceptions
│   │   └── Helpers/           # Utility classes
│   ├── config/                 # Configuration files
│   ├── migrations/             # Database migrations
│   └── storage/               # Logs, cache, uploads
│
├── shared/                    # Shared resources
│   ├── documentation/          # Project docs
│   └── deployment/            # Deployment configs
│
└── specs.json                 # Project specifications
```

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd codeengage
   ```

2. **Backend Setup**
   ```bash
   cd codeengage-backend
   cp config/.env.example config/.env
   # Edit .env with your database credentials
   
   # Install dependencies (if using Composer)
   composer install
   
   # Run database migrations
   php scripts/migrate.php run
   
   # Start PHP development server
   php -S localhost:8000 -t public
   ```

3. **Frontend Setup**
    - [x] Project Structure
    - [x] Core Modules (Router, Auth, API Client)
    - [x] Pages (Dashboard, Snippets, Profile, Admin)
    - [x] HTML Templates
    - [x] Unit Tests
   ```bash
   cd codeengage-frontend
   
   # Install dependencies (if using npm)
   npm install
   
   # Start development server
   npm run dev
   # Or serve with any static server
   ```

4. **Database Setup**
   - Create MySQL database: `codeengage_db`
   - Import schema using migrations
   - Configure connection in `config/.env`

### Database Configuration

```sql
CREATE DATABASE codeengage_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'codeengage_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON codeengage_db.* TO 'codeengage_user'@'localhost';
FLUSH PRIVILEGES;
```

## 🔧 Configuration

### Backend Environment Variables

```bash
# Application
APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost
APP_KEY=base64:your-32-character-key-here

# Database
DB_HOST=localhost
DB_NAME=codeengage_db
DB_USER=codeengage_user
DB_PASSWORD=secure_password

# Authentication
SESSION_DRIVER=file
JWT_SECRET=your-jwt-secret-key-here

# API
CORS_ALLOWED_ORIGINS=*
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
```

### Frontend Environment Variables

```bash
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=CodeEngage
VITE_APP_VERSION=1.0.0
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate user |
| POST | `/api/auth/register` | Create new user |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/refresh` | Refresh JWT token |

### Snippet Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/snippets` | List snippets with filtering |
| POST | `/api/snippets` | Create new snippet |
| GET | `/api/snippets/{id}` | Get snippet details |
| PUT | `/api/snippets/{id}` | Update snippet |
| DELETE | `/api/snippets/{id}` | Delete snippet |
| POST | `/api/snippets/{id}/fork` | Fork snippet |

### Response Format

```json
{
  "success": true,
  "message": "Success",
  "data": { ... },
  "timestamp": 1640995200
}
```

## 🚀 Deployment Options

### Option 1: Single Server (Traditional)

Upload both frontend and backend to same hosting:
- Frontend: `/public_html/`
- Backend: `/public_html/api/`

### Option 2: Separate Hosting (Recommended)

- **Frontend**: Cloudflare Pages, Netlify, or Vercel
- **Backend**: InfinityFree, Heroku, or any PHP hosting

### Option 3: Docker

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🔒 Security Features

- **Password Hashing**: Argon2ID with cost factor 12
- **JWT Authentication**: Secure token-based authentication
- **Session Security**: HttpOnly + Secure cookies
- **CSRF Protection**: Token-based CSRF validation
- **Rate Limiting**: IP-based request throttling
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Protection**: Prepared statements everywhere
- **XSS Protection**: Output escaping and CSP headers

## 🎯 Performance Features

- **Database Optimization**: Proper indexing and query optimization
- **Caching Strategy**: Multi-layer caching (APCu, file, browser)
- **Asset Optimization**: Minified CSS/JS, compressed images
- **Lazy Loading**: On-demand resource loading
- **Service Worker**: Offline capabilities

## 🎮 Gamification System

- **Achievement System**: Event-based achievement unlocking
- **Points System**: Weighted points for different actions
- **Leaderboards**: Daily, weekly, monthly rankings
- **Badge System**: Tiered achievement badges

## 📱 Mobile Features

- **Responsive Design**: Mobile-first approach
- **Touch Interactions**: Touch-optimized UI elements
- **PWA Support**: Installable on mobile devices
- **Offline Mode**: Basic offline functionality

## 🛠️ Development Commands

```bash
# Backend
php scripts/migrate.php run          # Run migrations
php scripts/migrate.php rollback        # Rollback migrations
php scripts/migrate.php status         # Check migration status

# Frontend (if using npm)
npm run dev                          # Development server
npm run build                        # Production build
npm run preview                      # Preview production build
```

## 🧪 Testing

```bash
# Backend tests
./vendor/bin/phpunit

## 💻 Frontend Development

The frontend is built with vanilla JavaScript, HTML, and CSS, following a component-based architecture without heavy frameworks.

### Structure

- `src/js/app.js`: Main entry point
- `src/js/modules/`: Core modules (Router, Auth, API Client, Editor)
- `src/js/pages/`: Page components (Dashboard, Snippets, Profile, Admin)
- `src/js/utils/`: Utility functions
- `src/templates/`: HTML templates for pages
- `src/css/`: Styles including Tailwind-like utility classes

### Running Locally

1.  Navigate to the `codeengage-frontend` directory.
2.  Install dependencies (optional, for development tools):
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm start
    ```
4.  Open `http://localhost:3000` (or the port shown) in your browser.

### Running Tests

To run the frontend unit tests:

```bash
npm test
```
```

## 📊 Monitoring

- **Health Checks**: `/api/health` endpoint
- **Logging**: Structured JSON logging
- **Error Tracking**: Comprehensive error logging
- **Performance**: Query time tracking
- **Audit Logs**: Complete audit trail

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Credits

- **UI Framework**: Tailwind CSS
- **Icons**: Heroicons
- **Fonts**: Inter & Fira Mono
- **Database**: MySQL 8.0
- **Backend**: PHP 8.0
- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3 (Utility-first)

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Join our community Discord

## 🗺️ Roadmap

- [ ] Advanced code visualization
- [ ] Git integration
- [ ] Team/organization features
- [ ] Advanced collaboration features
- [ ] Mobile app
- [ ] API rate limiting improvements
- [ ] Advanced analytics dashboard
- [ ] Code execution sandbox
- [ ] Plugin system

---

Built with ❤️ for developers by developers.