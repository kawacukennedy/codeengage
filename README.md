# CodeEngage

A modern, developer-focused web app for saving, sharing, and discovering code snippets. Built with PHP, MySQL, HTML, and Tailwind CSS.

---

## 🚀 Live Site
[https://codeengage.free.nf](https://codeengage.free.nf)

---

## ✨ Features
- User authentication (signup, login, logout, profile)
- Create, view, edit, and delete code snippets
- Responsive, dark-themed UI with developer-friendly design
- Sidebar navigation with keyboard hints
- Sticky, modern footer with social links
- MySQL database for persistent storage

---

## 🛠️ Local Setup

1. **Clone or download this repository.**
2. **Set up a local web server** (e.g., XAMPP, MAMP, or WAMP) with PHP and MySQL.
3. **Import the database:**
   - Open phpMyAdmin.
   - Create a new database (e.g., `codeengage_dev`).
   - Import `codeengage.sql` into the new database.
4. **Configure database connection:**
   - Edit `codeengage/includes/db.php` and set your local MySQL credentials and database name.
5. **Start your local server** and visit the app (e.g., `http://localhost/codeengage/pages/index.php`).

---


## 📂 Project Structure
```
codeengage/
  includes/         # Shared PHP includes (db, auth, sidebar, header)
  pages/            # All main app pages (dashboard, login, signup, profile, upload, edit, etc.)
  codeengage.sql    # MySQL database schema and seed data
```

---

## 🙏 Credits
- UI: Tailwind CSS, Fira Mono & Inter fonts
- Icons: [Heroicons](https://heroicons.com/)
- Hosting: [InfinityFree](https://infinityfree.net/)

---

## 📝 License
This project is for educational and demo purposes. Feel free to use, modify, and share! 
