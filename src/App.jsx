import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, Circle, Trash2, Plus, Clock, Settings, RefreshCw, 
  AlertCircle, Sparkles, Server, Check, X, Search, Edit2, 
  ArrowUpDown, LogOut, User as UserIcon, Lock, Mail, ArrowRight,
  BarChart3, Tag, Calendar, AlertTriangle, Eye, Filter, ShieldCheck,
  CheckCheck, PieChart, Layers, ListTodo
} from 'lucide-react';

const getInitialApiUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  return 'http://localhost:5000';
};

const CATEGORIES = [
  { id: 'work', label: 'Work', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'personal', label: 'Personal', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { id: 'health', label: 'Health', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'finance', label: 'Finance', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  { id: 'medium', label: 'Medium', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { id: 'high', label: 'High', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
];

export default function App() {
  // Auth State
  const [token, setToken] = useState(localStorage.getItem('taskflow_token') || null);
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('taskflow_user') || null);
  const [isAuthMode, setIsAuthMode] = useState('login'); 
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Todo State
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newCategory, setNewCategory] = useState('work');
  const [newDueDate, setNewDueDate] = useState('');

  // Filters & Search State
  const [filter, setFilter] = useState('all'); 
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); 
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Windows State
  const [activeModalTodo, setActiveModalTodo] = useState(null); // Detail Window Modal
  const [isStatsOpen, setIsStatsOpen] = useState(false);       // Analytics Window Modal
  const [deleteCandidate, setDeleteCandidate] = useState(null); // Delete Confirm Window
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);   // Settings Modal

  // Inline Editing State
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Network State
  const [apiUrl, setApiUrl] = useState(getInitialApiUrl);
  const [pendingApiUrl, setPendingApiUrl] = useState(getInitialApiUrl);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  });

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    const endpoint = isAuthMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setToken(data.token);
      setCurrentUser(data.email);
      localStorage.setItem('taskflow_token', data.token);
      localStorage.setItem('taskflow_user', data.email);
      setAuthPassword('');
      setAuthEmail('');
      setIsConnected(true);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setTodos([]);
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_user');
  };

  const fetchTodos = async (targetUrl = apiUrl) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${targetUrl.replace(/\/$/, '')}/api/todos`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired');
      }

      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      setTodos(data);
      setIsConnected(true);
    } catch (err) {
      console.warn('Backend issue:', err.message);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTodos(apiUrl);
  }, [apiUrl, token]);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    const trimmed = newTodoText.trim();
    if (!trimmed) return;

    const tempId = `local-${Date.now()}`;
    const newTodo = { 
      _id: tempId, 
      text: trimmed, 
      completed: false, 
      priority: newPriority,
      category: newCategory,
      dueDate: newDueDate || null,
      createdAt: new Date().toISOString() 
    };

    setTodos((prev) => [newTodo, ...prev]);
    setNewTodoText('');
    setNewDueDate('');

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/todos`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          text: trimmed,
          priority: newPriority,
          category: newCategory,
          dueDate: newDueDate || null
        }),
      });

      if (response.status === 401) return handleLogout();
      if (!response.ok) throw new Error('Failed to create on server');
      
      const savedTodo = await response.json();
      setTodos((prev) => prev.map((t) => (t._id === tempId ? savedTodo : t)));
    } catch (err) {
      console.error('Error saving todo:', err);
      setTodos((prev) => prev.filter((t) => t._id !== tempId));
    }
  };

  const handleToggleTodo = async (todo) => {
    const updatedStatus = !todo.completed;
    setTodos((prev) => prev.map((t) => (t._id === todo._id ? { ...t, completed: updatedStatus } : t)));

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/todos/${todo._id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ completed: updatedStatus }),
      });
      if (response.status === 401) handleLogout();
    } catch (err) {
      setTodos((prev) => prev.map((t) => (t._id === todo._id ? { ...t, completed: todo.completed } : t)));
    }
  };

  const handleStartEdit = (todo) => {
    setEditingId(todo._id);
    setEditingText(todo.text);
  };

  const handleSaveEdit = async (id) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;

    const previousTodos = [...todos];
    setTodos((prev) => prev.map((t) => t._id === id ? { ...t, text: trimmed, updatedAt: new Date().toISOString() } : t));
    setEditingId(null);

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/todos/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ text: trimmed }),
      });
      if (response.status === 401) handleLogout();
      if (!response.ok) throw new Error('Update failed');
    } catch (err) {
      setTodos(previousTodos);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    const targetId = deleteCandidate._id;
    setTodos((prev) => prev.filter((t) => t._id !== targetId));
    setDeleteCandidate(null);
    if (activeModalTodo?._id === targetId) setActiveModalTodo(null);

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/todos/${targetId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (response.status === 401) handleLogout();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const formatDateTime = (isoDate) => {
    if (!isoDate) return '';
    try {
      return new Date(isoDate).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return ''; }
  };

  // Filter & Sort Logic
  const filteredTodos = useMemo(() => {
    const result = todos.filter((todo) => {
      const matchesStatus = filter === 'all' ? true : filter === 'active' ? !todo.completed : todo.completed;
      const matchesCategory = categoryFilter === 'all' ? true : todo.category === categoryFilter;
      const matchesPriority = priorityFilter === 'all' ? true : todo.priority === priorityFilter;
      const matchesSearch = todo.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesCategory && matchesPriority && matchesSearch;
    });

    return [...result].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === 'priority') {
        const pOrder = { high: 3, medium: 2, low: 1 };
        return (pOrder[b.priority || 'medium'] || 0) - (pOrder[a.priority || 'medium'] || 0);
      }
      if (sortBy === 'az') return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
      return 0;
    });
  }, [todos, filter, categoryFilter, priorityFilter, searchQuery, sortBy]);

  // Statistics Calculation
  const completedCount = useMemo(() => todos.filter(t => t.completed).length, [todos]);
  const activeCount = todos.length - completedCount;
  const highPriorityCount = useMemo(() => todos.filter(t => !t.completed && t.priority === 'high').length, [todos]);
  const progressPercentage = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  // Unauthenticated Screen
  if (!token) {
    return (
      <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={() => setIsSettingsOpen(true)}
          title="API Configuration"
          className="absolute top-6 right-6 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-all backdrop-blur-md shadow-lg"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800/80 p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl shadow-xl shadow-indigo-500/20 mb-4 ring-1 ring-white/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">TaskFlow Pro</h1>
            <p className="text-slate-400 text-xs mt-1">Smart Task & Productivity Dashboard</p>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-6">
            <button
              onClick={() => { setIsAuthMode('login'); setAuthError(''); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${isAuthMode === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsAuthMode('register'); setAuthError(''); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${isAuthMode === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 pl-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 pl-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthLoading}
              className="mt-3 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              {isAuthLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (
                <>
                  <span>{isAuthMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-8 px-4 sm:px-6 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        
        {/* Navigation & Header */}
        <header className="flex flex-col gap-5 border-b border-slate-800/80 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">TaskFlow Pro</h1>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    System Active
                  </span>
                  <span>•</span>
                  <span>JWT Encrypted</span>
                </div>
              </div>
            </div>

            {/* Quick Action Window Buttons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsStatsOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 text-xs font-semibold transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </button>
              <button 
                onClick={() => fetchTodos(apiUrl)} 
                title="Refresh tasks" 
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)} 
                title="API Settings" 
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User Profile & Priority Alerts Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 flex items-center justify-between text-xs px-4 py-3 rounded-2xl border bg-slate-900/70 border-slate-800/80">
              <div className="flex items-center gap-2.5 text-slate-300">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">User Session</span>
                  <span className="font-medium text-slate-200 truncate max-w-[200px]">{currentUser}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-all">
                <LogOut className="w-3 h-3.5" />
                <span>Logout</span>
              </button>
            </div>

            <div className="flex items-center justify-between px-4 py-3 rounded-2xl border bg-slate-900/70 border-slate-800/80">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">High Priority</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {highPriorityCount} Pending
              </span>
            </div>
          </div>
        </header>

        {/* Enhanced Form: Add Task with Priority, Category & Due Date */}
        <form onSubmit={handleAddTodo} className="flex flex-col gap-3 p-4 bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-xl">
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-1 focus-within:border-indigo-500 transition-all">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 bg-transparent py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {/* Category Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="bg-transparent text-slate-200 focus:outline-none">
                  {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.label}</option>)}
                </select>
              </div>

              {/* Priority Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="bg-transparent text-slate-200 focus:outline-none">
                  {PRIORITIES.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.label} Priority</option>)}
                </select>
              </div>

              {/* Due Date Picker */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <input 
                  type="date" 
                  value={newDueDate} 
                  onChange={(e) => setNewDueDate(e.target.value)} 
                  className="bg-transparent text-slate-200 focus:outline-none text-xs"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={!newTodoText.trim()} 
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> 
              <span>Add Task</span>
            </button>
          </div>
        </form>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['all', 'active', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent focus:outline-none">
                <option value="all" className="bg-slate-900">All Categories</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.label}</option>)}
              </select>
            </div>

            <div className="relative flex-1 max-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search..." 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" 
              />
            </div>
          </div>
        </div>

        {/* Task Cards List */}
        <div className="flex flex-col gap-2.5">
          {filteredTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-800 rounded-3xl bg-slate-900/20 text-center">
              <CheckCircle2 className="w-10 h-10 text-slate-600 mb-2" />
              <h3 className="text-sm font-semibold text-slate-300">No tasks found</h3>
              <p className="text-xs text-slate-500 mt-1">Create a new task to get started.</p>
            </div>
          ) : (
            filteredTodos.map((todo) => {
              const formattedDate = formatDateTime(todo.createdAt);
              const categoryObj = CATEGORIES.find(c => c.id === todo.category) || CATEGORIES[0];
              const priorityObj = PRIORITIES.find(p => p.id === todo.priority) || PRIORITIES[1];

              return (
                <div 
                  key={todo._id} 
                  className={`group relative flex items-center justify-between gap-3.5 p-4 rounded-2xl border transition-all ${
                    todo.completed ? 'bg-slate-900/30 border-slate-800/40 opacity-70' : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <button onClick={() => handleToggleTodo(todo)} className="text-slate-500 hover:text-indigo-400 shrink-0">
                      {todo.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Circle className="w-5 h-5" />}
                    </button>

                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <p className={`text-sm break-words font-medium ${todo.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                        {todo.text}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className={`px-2 py-0.5 rounded-md border font-medium ${categoryObj.color}`}>
                          {categoryObj.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md border font-medium ${priorityObj.color}`}>
                          {priorityObj.label}
                        </span>
                        {todo.dueDate && (
                          <span className="text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-400" /> {todo.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Task Card Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => setActiveModalTodo(todo)} 
                      className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-all"
                      title="View Details Window"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeleteCandidate(todo)} 
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* WINDOW 1: Task Detail & View Modal */}
      {activeModalTodo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setActiveModalTodo(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              <ListTodo className="w-4 h-4" /> Task Details Window
            </div>
            <h3 className="text-lg font-bold text-white mb-4">{activeModalTodo.text}</h3>

            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Status</span>
                <span className={`font-semibold ${activeModalTodo.completed ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {activeModalTodo.completed ? 'Completed' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Priority Level</span>
                <span className="capitalize font-semibold text-slate-200">{activeModalTodo.priority || 'Medium'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Category</span>
                <span className="capitalize font-semibold text-slate-200">{activeModalTodo.category || 'Work'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Created At</span>
                <span className="text-slate-300 font-mono">{formatDateTime(activeModalTodo.createdAt)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => handleToggleTodo(activeModalTodo)} className="px-4 py-2 rounded-xl text-xs bg-indigo-600 text-white font-medium hover:bg-indigo-500">
                Toggle Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WINDOW 2: Analytics & Stats Dashboard Modal */}
      {isStatsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <button onClick={() => setIsStatsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" /> Analytics Window
            </div>
            <h2 className="text-xl font-extrabold text-white mb-6">Task Statistics</h2>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Total Tasks</span>
                <p className="text-2xl font-black text-white mt-1">{todos.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Completion Rate</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">{progressPercentage}%</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Active Pending Tasks</span>
                <span className="font-bold">{activeCount}</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-indigo-500 h-full" style={{ width: `${100 - progressPercentage}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WINDOW 3: Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-indigo-400" /> API Settings
            </h2>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Backend Endpoint</label>
              <input 
                type="text" 
                value={pendingApiUrl} 
                onChange={(e) => setPendingApiUrl(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none" 
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 font-medium">Cancel</button>
              <button onClick={() => { setApiUrl(pendingApiUrl); setIsSettingsOpen(false); }} className="px-4 py-2 rounded-xl text-xs bg-indigo-600 text-white font-medium">Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* WINDOW 4: Confirm Delete Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-semibold text-white text-base mb-1">Confirm Delete</h3>
            <p className="text-xs text-slate-400 mb-5">Remove "{deleteCandidate.text}"?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteCandidate(null)} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-xl text-xs bg-rose-600 text-white font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}