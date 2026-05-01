const API_URL = '/api';

// State
let state = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    isLogin: true
};

// DOM Elements
const authView = document.getElementById('auth-view');
const dashView = document.getElementById('dashboard-view');
const authForm = document.getElementById('auth-form');
const toggleAuth = document.getElementById('toggle-auth');
const logoutBtn = document.getElementById('logout-btn');

// Initialize
function init() {
    if (state.token && state.user) {
        showDashboard();
    } else {
        showAuth();
    }
}

// Authentication
toggleAuth.addEventListener('click', () => {
    state.isLogin = !state.isLogin;
    document.getElementById('auth-title').innerText = state.isLogin ? 'Welcome to Nexus' : 'Create an Account';
    document.getElementById('auth-btn').innerText = state.isLogin ? 'Sign In' : 'Sign Up';
    toggleAuth.innerHTML = state.isLogin ? "Don't have an account? <span>Sign up</span>" : "Already have an account? <span>Sign in</span>";
    
    document.getElementById('auth-name').classList.toggle('hidden', state.isLogin);
    document.getElementById('auth-role').classList.toggle('hidden', state.isLogin);
    if(state.isLogin) {
        document.getElementById('auth-name').removeAttribute('required');
    } else {
        document.getElementById('auth-name').setAttribute('required', 'true');
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    try {
        if (state.isLogin) {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            login(data.token, data.user);
        } else {
            const name = document.getElementById('auth-name').value;
            const role = document.getElementById('auth-role').value;
            const res = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert('Signup successful! Please login.');
            toggleAuth.click(); // Switch to login
        }
    } catch (err) {
        alert(err.message);
    }
});

function login(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    showDashboard();
}

logoutBtn.addEventListener('click', () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showAuth();
});

// Navigation
function showAuth() {
    authView.classList.remove('hidden');
    dashView.classList.add('hidden');
}

function showDashboard() {
    authView.classList.add('hidden');
    dashView.classList.remove('hidden');
    
    document.getElementById('user-greeting').innerText = `Hello, ${state.user.name}`;
    document.getElementById('user-role-badge').innerText = state.user.role;
    
    if (state.user.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        loadUsers();
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    }
    
    loadDashboard();
}

// API Calls
async function api(endpoint, options = {}) {
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${state.token}`
    };
    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (res.status === 401 || res.status === 403) {
        logoutBtn.click();
        throw new Error('Unauthorized');
    }
    return res.json();
}

async function loadDashboard() {
    try {
        const stats = await api('/dashboard');
        document.getElementById('stat-total').innerText = stats.total;
        document.getElementById('stat-pending').innerText = stats.pending;
        document.getElementById('stat-completed').innerText = stats.completed;
        document.getElementById('stat-overdue').innerText = stats.overdue;

        await loadProjects();
        await loadTasks();
    } catch (err) {
        console.error(err);
    }
}

async function loadProjects() {
    const projects = await api('/projects');
    const list = document.getElementById('projects-list');
    list.innerHTML = projects.map(p => `
        <div class="task-card">
            <div class="task-header">
                <div class="task-title">${p.name}</div>
            </div>
            <p style="color: var(--text-muted); font-size: 0.875rem">${p.description || 'No description'}</p>
            <div class="task-meta">
                <span>By: ${p.creator_name}</span>
            </div>
        </div>
    `).join('') || '<p style="color: var(--text-muted)">No projects found.</p>';

    // Update project select in task modal
    const select = document.getElementById('task-project');
    select.innerHTML = '<option value="" disabled selected>Select Project</option>' + 
        projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

async function loadTasks() {
    const tasks = await api('/tasks');
    const list = document.getElementById('tasks-list');
    list.innerHTML = tasks.map(t => `
        <div class="task-card">
            <div class="task-header">
                <div class="task-title">${t.title}</div>
                <span class="badge ${t.status}">${t.status}</span>
            </div>
            <p style="color: var(--text-muted); font-size: 0.875rem">${t.description || ''}</p>
            <div class="task-meta">
                <span>Project: ${t.project_name || 'N/A'}</span>
                <span>Assignee: ${t.assignee_name || 'Unassigned'}</span>
                <span>Due: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'None'}</span>
            </div>
            <div class="task-actions">
                <select onchange="updateTaskStatus('${t.id}', this.value)" ${state.user.role === 'member' && String(t.assigned_to) !== String(state.user.id) ? 'disabled' : ''}>
                    <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="in-progress" ${t.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
        </div>
    `).join('') || '<p style="color: var(--text-muted)">No tasks found.</p>';
}

async function loadUsers() {
    try {
        const users = await api('/users');
        const select = document.getElementById('task-assignee');
        select.innerHTML = '<option value="">Unassigned</option>' + 
            users.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
    } catch (err) {
        console.error(err);
    }
}

async function updateTaskStatus(taskId, status) {
    try {
        await api(`/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        loadDashboard(); // Refresh stats and lists
    } catch (err) {
        alert('Failed to update status');
        loadDashboard();
    }
}

// Modals
const setupModal = (btnId, modalId, closeClass) => {
    const btn = document.getElementById(btnId);
    const modal = document.getElementById(modalId);
    if(btn) btn.addEventListener('click', () => modal.classList.add('active'));
    modal.querySelector(closeClass).addEventListener('click', () => modal.classList.remove('active'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
};

setupModal('new-project-btn', 'project-modal', '.close-modal');
setupModal('new-task-btn', 'task-modal', '.close-modal');

// Form Submissions
document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('proj-name').value;
    const description = document.getElementById('proj-desc').value;
    try {
        await api('/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        document.getElementById('project-modal').classList.remove('active');
        e.target.reset();
        loadDashboard();
    } catch (err) {
        alert(err.message);
    }
});

document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-desc').value;
    const project_id = document.getElementById('task-project').value;
    const assigned_to = document.getElementById('task-assignee').value;
    const due_date = document.getElementById('task-due').value;
    
    try {
        await api('/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, project_id, assigned_to, due_date })
        });
        document.getElementById('task-modal').classList.remove('active');
        e.target.reset();
        loadDashboard();
    } catch (err) {
        alert(err.message);
    }
});

init();
