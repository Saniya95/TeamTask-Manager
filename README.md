# Nexus — Team Task Manager

A full-stack, role-based Team Task Manager built with **Node.js**, **Express**, **MongoDB Atlas**, and **Vanilla JS** featuring a modern glassmorphic UI.

## Features

- **Authentication** — JWT-based Signup & Login
- **Role-Based Access Control (RBAC)**
  - **Admin** — Create projects, assign tasks to any member, view all tasks/projects
  - **Member** — View projects, view/update status of tasks assigned to them
- **Project & Team Management** — Admins create projects and manage team workload
- **Task Creation, Assignment & Status Tracking** — Track tasks through `pending → in-progress → completed`
- **Dashboard** — Real-time metrics (Total, Pending, Completed, Overdue tasks)
- **Responsive & Premium Design** — Glassmorphism, gradients, dark mode

## Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Backend   | Node.js + Express           |
| Database  | MongoDB Atlas (Mongoose ODM)|
| Auth      | JWT + bcrypt                |
| Frontend  | Vanilla HTML/CSS/JS         |
| Deploy    | Railway                     |

## Prerequisites

- Node.js v14+
- npm

## Running Locally

1. **Clone & Install**
   ```bash
   cd team-task-manager
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the project root:
   ```env
   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.wbgtti9.mongodb.net/Team_Task_Mannager?appName=Cluster0
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```

3. **Start the Server**
   ```bash
   npm start
   ```
   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open in Browser**
   Navigate to `http://localhost:3000`

## Testing the App

1. **Signup as Admin** — On the auth page, click "Sign up", choose "Project Admin", and register.
2. **Create Projects & Tasks** — Login, create a project, then assign tasks to members.
3. **Signup as Member** — Open an incognito window, sign up as "Team Member".
4. **Update Status** — Login as the member and update assigned tasks to "In Progress" or "Completed".

## API Endpoints

| Method | Endpoint                | Auth     | Access  | Description              |
|--------|-------------------------|----------|---------|--------------------------|
| POST   | `/api/auth/signup`      | Public   | All     | Register a new user      |
| POST   | `/api/auth/login`       | Public   | All     | Login & get JWT token    |
| GET    | `/api/users`            | Required | All     | List all users           |
| GET    | `/api/projects`         | Required | All     | List all projects        |
| POST   | `/api/projects`         | Required | Admin   | Create a project         |
| GET    | `/api/tasks`            | Required | All     | List tasks (RBAC filtered)|
| POST   | `/api/tasks`            | Required | Admin   | Create & assign a task   |
| PUT    | `/api/tasks/:id/status` | Required | All     | Update task status       |
| GET    | `/api/dashboard`        | Required | All     | Dashboard stats          |

## Deployment on Railway

1. Push this code to a **GitHub repository**.
2. Go to [Railway](https://railway.app/) → **New Project** → **Deploy from GitHub repo**.
3. Select the repository.
4. Add the following **Environment Variables** in Railway's dashboard:
   - `MONGO_URI` = your MongoDB Atlas connection string
   - `JWT_SECRET` = a strong random secret
   - `PORT` = `3000` (Railway auto-sets this, optional)
5. Railway will auto-detect `package.json` and run `npm start`.
6. Your app will be live at the Railway-assigned URL.

> **Note:** No Railway volume or SQLite is needed — the app uses MongoDB Atlas as a fully managed cloud database.

## Project Structure

```
team-task-manager/
├── server.js        # Express server + all API routes
├── database.js      # MongoDB connection + Mongoose models
├── package.json     # Dependencies & scripts
├── .env             # Environment variables (not committed)
├── .gitignore       # Ignores node_modules, .env, etc.
└── public/
    ├── index.html   # Frontend HTML
    ├── styles.css   # CSS (glassmorphism theme)
    └── app.js       # Frontend JavaScript
```
