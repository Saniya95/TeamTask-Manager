# Nexus - Team Task Manager

A simple, role-based task management web app for teams. I built this to manage projects and track tasks between admins and team members.

## How it works

The app has two roles: Admin and Member. 
Admins can create projects, assign tasks to people, and see the global dashboard. Team members can only see the tasks assigned to them and update their progress (Pending, In Progress, Completed).

## Tech Stack

- Node.js & Express for the backend
- MongoDB Atlas (Mongoose) for the database
- Vanilla HTML/CSS/JS for the frontend
- JSON Web Tokens (JWT) for authentication

## Running it locally

1. Install the necessary dependencies:
   ```bash
   npm install
   ```

2. Make sure you have your `.env` file set up in the root folder. You'll need your MongoDB connection string and a secret key.
   ```
   MONGO_URI=your_mongo_url
   JWT_SECRET=your_secret_key
   PORT=3000
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` in your browser.

## Notes

The frontend is served completely statically from the `public` folder. If you want to make changes to the UI, you just need to edit the files there and refresh.
