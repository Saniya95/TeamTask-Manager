const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://teamtaskmanager:Team%400001@cluster0.wbgtti9.mongodb.net/Team_Task_Mannager?appName=Cluster0';

async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB Atlas successfully.');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
}

// define collections for mongo

const userSchema = new mongoose.Schema({
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role:     { type: String, enum: ['admin', 'member'], default: 'member' }
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status:      { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
    project_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    due_date:    { type: Date, default: null }
}, { timestamps: true });

const User    = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);
const Task    = mongoose.model('Task', taskSchema);

module.exports = { connectDB, User, Project, Task };
