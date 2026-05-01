require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const { connectDB, User, Project, Task } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// check if user is logged in
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid token' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
};

// auth stuff
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    try {
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ error: 'Email already exists' });

        const hashedPwd = await bcrypt.hash(password, 10);
        const userRole = role === 'admin' ? 'admin' : 'member';
        const user = await User.create({ name, email, password: hashedPwd, role: userRole });
        res.status(201).json({ message: 'User created', userId: user._id });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { id: user._id.toString(), role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/users', authenticate, async (req, res) => {
    try {
        const users = await User.find({}, 'name email role');
        // Map _id to id for frontend compatibility
        const mapped = users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// project routes
app.get('/api/projects', authenticate, async (req, res) => {
    try {
        const projects = await Project.find().populate('created_by', 'name');
        const mapped = projects.map(p => ({
            id: p._id,
            name: p.name,
            description: p.description,
            created_by: p.created_by?._id,
            creator_name: p.created_by?.name || 'Unknown',
            created_at: p.createdAt
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/projects', authenticate, requireAdmin, async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });
    try {
        const project = await Project.create({ name, description, created_by: req.user.id });
        res.status(201).json({ message: 'Project created', projectId: project._id });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// tasks logic
app.get('/api/tasks', authenticate, async (req, res) => {
    try {
        let filter = {};
        // Members only see tasks assigned to them. Admins see all tasks.
        if (req.user.role === 'member') {
            filter.assigned_to = req.user.id;
        }
        const tasks = await Task.find(filter)
            .populate('project_id', 'name')
            .populate('assigned_to', 'name');

        const mapped = tasks.map(t => ({
            id: t._id,
            title: t.title,
            description: t.description,
            status: t.status,
            project_id: t.project_id?._id,
            project_name: t.project_id?.name || 'Unknown',
            assigned_to: t.assigned_to?._id,
            assignee_name: t.assigned_to?.name || 'Unassigned',
            due_date: t.due_date,
            created_at: t.createdAt
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/tasks', authenticate, requireAdmin, async (req, res) => {
    const { title, description, project_id, assigned_to, due_date } = req.body;
    if (!title || !project_id) return res.status(400).json({ error: 'Title and Project ID are required' });
    try {
        const task = await Task.create({
            title,
            description,
            project_id,
            assigned_to: assigned_to || null,
            due_date: due_date || null
        });
        res.status(201).json({ message: 'Task created', taskId: task._id });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/tasks/:id/status', authenticate, async (req, res) => {
    const { status } = req.body;
    if (!['pending', 'in-progress', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Ensure members only update their own tasks
        if (req.user.role === 'member' && task.assigned_to?.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this task' });
        }

        task.status = status;
        await task.save();
        res.json({ message: 'Task updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// get dashboard stats
app.get('/api/dashboard', authenticate, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Members see their own stats, Admins see global stats
        const userFilter = req.user.role === 'member' ? { assigned_to: req.user.id } : {};

        const total     = await Task.countDocuments(userFilter);
        const pending   = await Task.countDocuments({ ...userFilter, status: 'pending' });
        const completed = await Task.countDocuments({ ...userFilter, status: 'completed' });
        const overdue   = await Task.countDocuments({
            ...userFilter,
            due_date: { $lt: today },
            status: { $ne: 'completed' }
        });

        res.json({ total, pending, completed, overdue });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Catch-all route to serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server after DB connection
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
