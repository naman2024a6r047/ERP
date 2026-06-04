# ERP - School Management System

A comprehensive, full-stack Enterprise Resource Planning (ERP) platform for School Management. Built using modern web technologies to streamline administrative workflows, enhance teacher-student-parent collaboration, and provide clean dashboard analytics.

## 🚀 Features

- **Admin Dashboard**: Comprehensive statistics, user management (Students, Teachers, Parents), and system configuration.
- **Student Portal**: Access to attendance records, assignments, grades, and schedules.
- **Teacher Portal**: Attendance marking, grade inputs, schedule management, and performance tracking.
- **Parent Portal**: Monitor child's attendance, fees, and performance.
- **Interactive UI**: Fully responsive interface built with Tailwind CSS.

---

## 🛠️ Tech Stack

**Frontend:** React.js, Tailwind CSS, React Router  
**Backend:** Node.js, Express.js, Sequelize ORM  
**Database:** MySQL  
**Deployment:** Hostinger Node.js (via GitHub)

---

## 📁 Project Structure

```text
ERP/
├── package.json         # Root orchestrator (install + build scripts)
├── .gitignore           # Git ignore rules
├── client/              # React frontend application
│   ├── src/             # React source code
│   ├── public/          # Static assets
│   ├── build/           # Production build (auto-generated)
│   └── package.json     # Client dependencies
└── server/              # Node/Express backend API
    ├── server.js         # Entry point (serves API + React build)
    ├── routes/           # API route handlers
    ├── models/           # Sequelize database models
    ├── middleware/        # Auth, RBAC, rate limiting
    └── package.json      # Server dependencies
```

---

## ⚙️ Local Development

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- MySQL database

### Quick Start
```bash
# Clone the repository
git clone https://github.com/naman2024a6r047/ERP.git
cd ERP

# Install all dependencies (client + server)
npm run build

# Create environment files
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit both .env files with your actual values

# Seed the database (first time only)
npm run seed

# Start the server (serves both API + React frontend)
npm start
```

### Development Mode (separate terminals)
```bash
# Terminal 1: Start backend with auto-reload
npm run dev:server

# Terminal 2: Start React dev server
npm run dev:client
```

---

## 🚀 Hostinger Deployment (via GitHub)

### One-Time Setup

1. **Push code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **In Hostinger Panel** → Go to **Websites** → Your domain → **Node.js**:
   - **Node.js version**: 18 or higher
   - **Repository**: Connect your GitHub account → Select `naman2024a6r047/ERP`
   - **Branch**: `main`
   - **Root directory**: `/` (the project root)
   - **Startup file**: `server/server.js`
   - Click **Deploy**

3. **Set Environment Variables** in Hostinger's Node.js panel:
   - Copy all values from `server/.env.example` and fill in your production values
   - The critical ones are: `NODE_ENV`, `PORT`, `DB_*`, `JWT_SECRET`, `EMAIL_*`

4. **Create MySQL Database** in Hostinger:
   - Go to **Databases** → **MySQL Databases**
   - Create a database and user
   - Update `DB_NAME`, `DB_USER`, `DB_PASS` in the environment variables

### Updating (After Code Changes)

Simply push to GitHub — Hostinger will auto-deploy:
```bash
git add .
git commit -m "Your update message"
git push origin main
```

If auto-deploy is not enabled, click **Pull & Deploy** in the Hostinger Node.js panel.

---

## 🔒 Security

- `.env` files are **never committed** to Git (contains DB passwords, JWT secrets, etc.)
- `.env.example` files are tracked as safe templates
- All API routes are protected with JWT authentication and role-based access control (RBAC)
- Rate limiting is enabled globally (200 requests per 15 minutes per IP)
- Helmet.js is used for HTTP security headers

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm start` | Start the production server |
| `npm run build` | Install all deps + build React client |
| `npm run dev:server` | Start backend with nodemon (auto-reload) |
| `npm run dev:client` | Start React dev server on port 3001 |
| `npm run seed` | Seed the database with initial data |
| `npm run install:all` | Install both client and server dependencies |
