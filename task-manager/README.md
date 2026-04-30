# Nexus - Team Task Manager

Nexus is a full-stack, role-based Team Task Manager application built with Node.js, Express, SQLite, and Vanilla JS with a modern, glassmorphic UI.

## Features
- **Authentication**: JWT-based Signup/Login system.
- **Role-Based Access Control**:
  - **Admin**: Can create projects, assign tasks to any member, and view all tasks/projects.
  - **Member**: Can view projects, and view/update the status of tasks assigned specifically to them.
- **Project & Team Management**: Admins can create projects and see everyone's tasks.
- **Dashboard**: Real-time calculated metrics (Total, Pending, Completed, Overdue tasks).
- **Responsive & Premium Design**: Modern UI with vibrant gradients and glassmorphism.

## Requirements
- Node.js (v14 or higher)
- npm (Node Package Manager)

## Running Locally

1. **Install Dependencies**
   Navigate to the `task-manager` directory and run:
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```
   *(For development with auto-reload, use `npm run dev`)*

3. **Access the App**
   Open your browser and navigate to `http://localhost:3000`.

## Testing the App
1. **Signup as Admin**: On the auth page, click "Sign up", choose "Project Admin" as your role, and register.
2. **Create Projects & Tasks**: Login, create a new project, and assign tasks.
3. **Signup as Member**: Open an incognito window, signup as "Team Member".
4. **Update Status**: Login as the member and update your assigned tasks to "In Progress" or "Completed".

## Deployment (Railway)
This project is configured to easily deploy to [Railway](https://railway.app/).

1. Create a new GitHub repository and push this code to it.
2. Go to Railway, click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository.
4. Railway will automatically detect the `package.json` and start the server using `npm start`.
5. **Database Configuration**:
   - By default, this uses an SQLite database.
   - For production on Railway, it's highly recommended to add a **Railway Volume** mapped to `/data` so that your SQLite database persists across deployments.
   - Go to your Railway service settings -> Volumes -> Add Volume. Mount it to `/data`. The application will automatically detect the production environment and save the `database.sqlite` file there.

## Note regarding `code-review-graph`
During the setup of this project, I attempted to install and integrate the `code-review-graph` CLI as requested. However, your current development environment has network/proxy connectivity issues preventing package installations via pip and npm (`[Errno 11001] getaddrinfo failed`). 
Since I was unable to connect to the package registries, I've built the application code directly. You can run `pip install code-review-graph` and `code-review-graph install` on your local machine once you resolve your internet connectivity issues!
