import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../lib/axios';
import { Calendar, CheckCircle2, Clock, Plus, Trash2, Sparkles, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from "socket.io-client";
import { format } from 'date-fns';

const socket = io("http://localhost:5000");

const Scheduler = () => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const fetchTasks = async () => {
    try {
      const response = await axiosInstance.get('/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    
    // Listen for new tasks scheduled by the AI Agent via real-time WebSocket
    const handleNewAiTask = (data) => {
      setTasks(prev => {
        if (!prev.some(t => t._id === data._id)) {
          toast.success(`✨ AI Auto-Scheduled: ${data.title}`);
          return [data, ...prev].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        }
        return prev;
      });
    };
    
    socket.on("new_ai_task", handleNewAiTask);
    
    return () => {
      socket.off("new_ai_task", handleNewAiTask);
    };
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setClientEmail('');
    setEditingTaskId(null);
    setIsModalOpen(false);
  };

  const handleOpenEditModal = (task) => {
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '');
    setClientEmail(task.clientEmail || '');
    setEditingTaskId(task._id);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      const payload = { title, description, dueDate, clientEmail };
      
      if (editingTaskId) {
        // Edit Existing Task
        const response = await axiosInstance.put(`/tasks/${editingTaskId}`, payload);
        setTasks(tasks.map(t => t._id === editingTaskId ? response.data : t).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
        toast.success(clientEmail ? "Task updated and email sent!" : "Task updated successfully!");
      } else {
        // Create New Task
        const response = await axiosInstance.post('/tasks', payload);
        setTasks([response.data, ...tasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
        toast.success(clientEmail ? "Task created and invite sent!" : "Task created successfully!");
      }
      
      resetForm();
    } catch (error) {
      toast.error(editingTaskId ? "Failed to update task" : "Failed to create task");
    }
  };

  const handleCompleteTask = async (id) => {
    try {
      await axiosInstance.put(`/tasks/${id}`, { status: 'Completed' });
      setTasks(tasks.map(t => t._id === id ? { ...t, status: 'Completed' } : t));
      toast.success("Task marked as completed!");
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await axiosInstance.delete(`/tasks/${id}`);
      setTasks(tasks.filter(t => t._id !== id));
      toast.success("Task deleted");
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'Pending');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  return (
    <div className="flex flex-col min-h-screen w-full font-dmsans text-white pt-[6rem] px-4 md:px-10 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Task Timeline
          </h1>
          <p className="text-md text-gray-300">
            Manage your upcoming calls, priority deadlines, and AI auto-scheduled tasks.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="btn-pill-primary flex items-center gap-2"
        >
          <Plus size={20} />
          <span className="hidden md:inline">Schedule Task</span>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pending Tasks Column */}
        <div className="glass-card p-6 flex flex-col h-[70vh]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
            <Clock size={24} /> Upcoming Tasks
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
            {isLoading ? (
               <div className="h-full flex justify-center items-center opacity-70">
                 <div id="loader-wrapper" className="scale-75"><div id="loader"></div></div>
               </div>
            ) : pendingTasks.length > 0 ? (
              pendingTasks.map((task) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={task._id}
                  className="p-5 rounded-xl border border-white/[0.08] relative overflow-hidden transition-all group hover:bg-white/[0.08] hover:border-white/15 hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)] glass-card-hover"
                  style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)'}}
                >
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)'}} />
                  {task.isAIGenerated && (
                    <div className="absolute top-0 right-0 bg-white/10 px-3 py-1 rounded-bl-lg border-l border-b border-white/20 flex items-center gap-1">
                      <Sparkles size={12} className="text-white" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white">AI Auto-Scheduled</span>
                    </div>
                  )}
                  
                  <h3 className="text-lg font-bold text-white mb-1 pr-24">{task.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                  
                  {task.clientEmail && (
                    <p className="text-xs mb-3 badge-pill inline-block">
                      ✉️ Inviting: {task.clientEmail}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-sm badge-pill">
                      <Calendar size={14} />
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM do, yyyy - h:mm a') : 'No Due Date'}
                    </div>
                    
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 p-1 rounded-xl border border-white/10">
                      <button onClick={() => handleCompleteTask(task._id)} className="btn-pill-primary p-2 min-h-0 border-none" title="Mark Complete">
                        <CheckCircle2 size={16} />
                      </button>
                      <button onClick={() => handleOpenEditModal(task)} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors border border-white/20" title="Edit / Send Invite">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteTask(task._id)} className="btn-pill-danger p-2 min-h-0 border-none" title="Delete Task">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <Calendar size={48} className="mb-4" />
                <p className="italic font-medium">No upcoming tasks scheduled.</p>
              </div>
            )}
          </div>
        </div>

        {/* Completed Tasks Column */}
        <div className="glass-card p-6 flex flex-col h-[70vh]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
            <CheckCircle2 size={24} /> Completed
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4 opacity-70">
            {completedTasks.length > 0 ? (
              completedTasks.map((task) => (
                <div key={task._id} className="p-4 rounded-xl bg-white/5 border border-white/10 relative group">
                  <h3 className="text-md font-medium text-gray-300 line-through decoration-gray-500/50 mb-2">{task.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={12} />
                    {task.dueDate ? format(new Date(task.dueDate), 'MMM do, yyyy') : 'No Due Date'}
                  </div>
                  <button onClick={() => handleDeleteTask(task._id)} className="absolute right-4 top-4 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <CheckCircle2 size={48} className="mb-4" />
                <p className="italic font-medium text-sm">Completed tasks will appear here.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Task Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={resetForm}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="card-elevated gradient-border p-6 w-full max-w-md z-10 relative"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingTaskId ? "Edit Task" : "Schedule Task"}
              </h2>
              <form onSubmit={handleSaveTask} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Task Title</label>
                  <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-dark" placeholder="e.g. Follow-up meeting" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Description (Optional)</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-dark resize-none h-20" placeholder="Add some context..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Client Email (For Calendar Invite)</label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="input-dark" placeholder="client@example.com" />
                  <p className="text-[10px] text-gray-500 mt-1">If provided, an email with a calendar invite will be sent.</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Due Date & Time</label>
                  <input required type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-dark" />
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={resetForm} className="flex-1 btn-pill-ghost py-3 rounded-xl border border-white/10 text-gray-300 font-bold">Cancel</button>
                  <button type="submit" className="flex-1 btn-pill-primary border-none">
                    {editingTaskId ? "Save & Update" : "Save Task"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
};

export default Scheduler;
