import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../lib/axios';
import { Calendar, CheckCircle2, Clock, Plus, Trash2, Sparkles, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

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
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent mb-2 drop-shadow-[0_0_10px_rgba(20,184,166,0.3)]">
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
          className="bg-blue-600/80 hover:bg-blue-500 backdrop-blur-sm text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/50"
        >
          <Plus size={20} />
          <span className="hidden md:inline">Schedule Task</span>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pending Tasks Column */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col h-[70vh]">
          <h2 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
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
                  className={`p-5 rounded-xl border relative overflow-hidden transition-all group ${
                    task.isAIGenerated ? 'bg-indigo-900/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-800/60 border-white/10'
                  }`}
                >
                  {task.isAIGenerated && (
                    <div className="absolute top-0 right-0 bg-indigo-500/20 px-3 py-1 rounded-bl-lg border-l border-b border-indigo-500/30 flex items-center gap-1">
                      <Sparkles size={12} className="text-indigo-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">AI Auto-Scheduled</span>
                    </div>
                  )}
                  
                  <h3 className="text-lg font-bold text-white mb-1 pr-24">{task.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                  
                  {task.clientEmail && (
                    <p className="text-xs text-blue-300 mb-3 bg-blue-900/20 inline-block px-2 py-1 rounded border border-blue-500/20">
                      ✉️ Inviting: {task.clientEmail}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-sm text-blue-300 bg-blue-900/30 px-3 py-1.5 rounded-lg">
                      <Calendar size={14} />
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM do, yyyy - h:mm a') : 'No Due Date'}
                    </div>
                    
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 p-1 rounded-xl shadow-lg border border-white/10">
                      <button onClick={() => handleCompleteTask(task._id)} className="bg-green-600/20 hover:bg-green-600/40 text-green-400 p-2 rounded-lg transition-colors border border-green-500/30" title="Mark Complete">
                        <CheckCircle2 size={16} />
                      </button>
                      <button onClick={() => handleOpenEditModal(task)} className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 p-2 rounded-lg transition-colors border border-blue-500/30" title="Edit / Send Invite">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteTask(task._id)} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 p-2 rounded-lg transition-colors border border-red-500/30" title="Delete Task">
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
        <div className="bg-slate-900/20 backdrop-blur-md rounded-2xl p-6 border border-white/5 flex flex-col h-[70vh]">
          <h2 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
            <CheckCircle2 size={24} /> Completed
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4 opacity-70">
            {completedTasks.length > 0 ? (
              completedTasks.map((task) => (
                <div key={task._id} className="p-4 rounded-xl bg-green-900/10 border border-green-500/20 relative group">
                  <h3 className="text-md font-medium text-gray-300 line-through decoration-green-500/50 mb-2">{task.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={12} />
                    {task.dueDate ? format(new Date(task.dueDate), 'MMM do, yyyy') : 'No Due Date'}
                  </div>
                  <button onClick={() => handleDeleteTask(task._id)} className="absolute right-4 top-4 text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
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
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md z-10 shadow-2xl relative"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingTaskId ? "Edit Task" : "Schedule Task"}
              </h2>
              <form onSubmit={handleSaveTask} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Task Title</label>
                  <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors" placeholder="e.g. Follow-up meeting" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Description (Optional)</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors resize-none h-20" placeholder="Add some context..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Client Email (For Calendar Invite)</label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors" placeholder="client@example.com" />
                  <p className="text-[10px] text-gray-500 mt-1">If provided, an email with a calendar invite will be sent.</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Due Date & Time</label>
                  <input required type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors" />
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-500/50">
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
