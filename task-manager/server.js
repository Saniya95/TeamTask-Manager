const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const { dbAsync } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// Auth Middleware
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

// =======================
// AUTH ENDPOINTS
// =======================
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    try {
        const hashedPwd = await bcrypt.hash(password, 10);
        const userRole = role === 'admin' ? 'admin' : 'member';
        const result = await dbAsync.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`, [name, email, hashedPwd, userRole]);
        res.status(201).json({ message: 'User created', userId: result.lastID });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await dbAsync.get(`SELECT * FROM users WHERE email = ?`, [email]);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/users', authenticate, async (req, res) => {
    try {
        const users = await dbAsync.all(`SELECT id, name, email, role FROM users`);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// =======================
// PROJECTS ENDPOINTS
// =======================
app.get('/api/projects', authenticate, async (req, res) => {
    try {
        const projects = await dbAsync.all(`SELECT p.*, u.name as creator_name FROM projects p JOIN users u ON p.created_by = u.id`);
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/projects', authenticate, requireAdmin, async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });
    try {
        const result = await dbAsync.run(`INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)`, [name, description, req.user.id]);
        res.status(201).json({ message: 'Project created', projectId: result.lastID });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// =======================
// TASKS ENDPOINTS
// =======================
app.get('/api/tasks', authenticate, async (req, res) => {
    try {
        let sql = `SELECT t.*, p.name as project_name, u.name as assignee_name 
                   FROM tasks t 
                   LEFT JOIN projects p ON t.project_id = p.id 
                   LEFT JOIN users u ON t.assigned_to = u.id`;
        const params = [];
        // Members only see tasks assigned to them. Admins see all tasks.
        if (req.user.role === 'member') {
            sql += ` WHERE t.assigned_to = ?`;
            params.push(req.user.id);
        }
        const tasks = await dbAsync.all(sql, params);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/tasks', authenticate, requireAdmin, async (req, res) => {
    const { title, description, project_id, assigned_to, due_date } = req.body;
    if (!title || !project_id) return res.status(400).json({ error: 'Title and Project ID are required' });
    try {
        const result = await dbAsync.run(`INSERT INTO tasks (title, description, project_id, assigned_to, due_date) VALUES (?, ?, ?, ?, ?)`, 
            [title, description, project_id, assigned_to || null, due_date]);
        res.status(201).json({ message: 'Task created', taskId: result.lastID });
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
        const task = await dbAsync.get(`SELECT * FROM tasks WHERE id = ?`, [req.params.id]);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        
        // Ensure members only update their own tasks
        if (req.user.role === 'member' && task.assigned_to !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this task' });
        }

        await dbAsync.run(`UPDATE tasks SET status = ? WHERE id = ?`, [status, req.params.id]);
        res.json({ message: 'Task updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// =======================
// DASHBOARD ENDPOINTS
// =======================
app.get('/api/dashboard', authenticate, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Members see their own stats, Admins see global stats
        const userCondition = req.user.role === 'member' ? `WHERE assigned_to = ${req.user.id}` : '';
        const overdueCondition = req.user.role === 'member' ? `AND assigned_to = ${req.user.id}` : '';

        const [totalTasks] = await dbAsync.all(`SELECT COUNT(*) as count FROM tasks ${userCondition}`);
        const [pendingTasks] = await dbAsync.all(`SELECT COUNT(*) as count FROM tasks WHERE status='pending' ${overdueCondition}`);
        const [completedTasks] = await dbAsync.all(`SELECT COUNT(*) as count FROM tasks WHERE status='completed' ${overdueCondition}`);
        const [overdueTasks] = await dbAsync.all(`SELECT COUNT(*) as count FROM tasks WHERE due_date < ? AND status != 'completed' ${overdueCondition}`, [today]);

        res.json({
            total: totalTasks.count,
            pending: pendingTasks.count,
            completed: completedTasks.count,
            overdue: overdueTasks.count
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Catch-all route to serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
