import express from "express";
import Task from "../models/task.model.js";

const router = express.Router();

// Get all tasks (in a real app, filter by req.user.agentID)
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ dueDate: 1, createdAt: -1 });
        res.status(200).json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
});

// Create a new task
router.post('/', async (req, res) => {
    try {
        const { title, description, dueDate, isAIGenerated } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }

        const newTask = new Task({
            title,
            description,
            dueDate: dueDate ? new Date(dueDate) : null,
            isAIGenerated: isAIGenerated || false
        });

        await newTask.save();
        res.status(201).json(newTask);
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ error: "Failed to create task" });
    }
});

// Update task status
router.put('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!task) return res.status(404).json({ error: "Task not found" });
        res.status(200).json(task);
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ error: "Failed to update task" });
    }
});

// Delete task
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ error: "Task not found" });
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ error: "Failed to delete task" });
    }
});

export default router;
