import mongoose from "mongoose";

const TaskSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    dueDate: {
        type: Date,
        default: null
    },
    agentID: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed'],
        default: 'Pending'
    },
    isAIGenerated: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Task = mongoose.model("Task", TaskSchema);
export default Task;
