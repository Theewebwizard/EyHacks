import express from "express";
import Task from "../models/task.model.js";
import { sendTaskScheduleEmail } from "../lib/email.js";

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
        const { title, description, dueDate, clientEmail, isAIGenerated } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }

        const newTask = new Task({
            title,
            description,
            clientEmail: clientEmail || "",
            dueDate: dueDate ? new Date(dueDate) : null,
            isAIGenerated: isAIGenerated || false
        });

        await newTask.save();
        
        // If client email exists and it's not AI generated (or we want AI to send directly, but usually we don't), send invite
        if (clientEmail && dueDate) {
            await sendTaskScheduleEmail(clientEmail, title, description, dueDate, false);
        }

        res.status(201).json(newTask);
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ error: "Failed to create task" });
    }
});

// Update task status or edit task
router.put('/:id', async (req, res) => {
    try {
        const { status, title, description, dueDate, clientEmail } = req.body;
        
        // Check if this is an edit vs just a status update
        const existingTask = await Task.findById(req.params.id);
        if (!existingTask) return res.status(404).json({ error: "Task not found" });

        const updateData = {};
        if (status) updateData.status = status;
        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (clientEmail !== undefined) updateData.clientEmail = clientEmail;
        if (dueDate) updateData.dueDate = new Date(dueDate);

        // Turn off isAIGenerated flag if the agent manually edited it
        if (title || dueDate || clientEmail) {
            updateData.isAIGenerated = false;
        }

        const task = await Task.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        // If the date or email changed, and there is an email, send rescheduled invite
        if (clientEmail && dueDate && (existingTask.dueDate?.toISOString() !== new Date(dueDate).toISOString() || !existingTask.clientEmail)) {
             await sendTaskScheduleEmail(clientEmail, task.title, task.description, task.dueDate, true);
        }

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
