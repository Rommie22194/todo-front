import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, Circle, Trash2, Plus, Clock, Settings, RefreshCw, 
  AlertCircle, Sparkles, Server, Check, X, Search, Edit2, 
  ArrowUpDown, LogOut, User as UserIcon, Lock, Mail, ArrowRight,
  ListTodo, Layers, CheckCircle, BarChart2, ShieldCheck
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

export default function App() {
  // Auth State
  const [token, setToken] = useState(localStorage.getItem('taskflow_token') || null);
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('taskflow_user') || null);
  const [isAuthMode, setIsAuthMode] = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Todo State
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [filter, setFilter] = useState('all'); 
  const [sortBy, setSortBy] = useState('newest'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Settings & Network State
  const [apiUrl, setApiUrl] = useState(getInitialApiUrl);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    const newTodo = { _id: tempId, text: trimmed, completed: false, createdAt: new Date().toISOString() };
    setTodos((prev) => [newTodo, ...prev]);
    setNewTodoText('');

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/todos`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text: trimmed }),
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

  const filteredTodos = useMemo(() => {
    const result = todos.filter((todo) => {
      const matchesFilter = filter === 'all' ? true : filter === 'active' ? !todo.completed : todo.completed;
      const matchesSearch = todo.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });

    return [...result].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === 'az') return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
      if (sortBy === 'za') return b.text.localeCompare(a.text, undefined, { sensitivity: 'base' });
      if (sortBy === 'status') return Number(a.completed) - Number(b.completed);
      return 0;
    });
  }, [todos, filter, searchQuery, sortBy]);

  // UI Helper Statistics
  const completedCount = useMemo(() => todos.filter(t => t.completed).length, [todos]);
  const activeCount = todos.length - completedCount;
  const progressPercentage = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  // Login / Register Screen
  if (!token) {
    return (
      <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* API Settings Quick Toggle */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          title="API Configuration"
          className="absolute top-6 right-6 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all backdrop-blur-md shadow-lg"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="w-full max-w-md bg-slate-900/70 border border-slate-800/80 p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl shadow-xl shadow-indigo-500/20 mb-4 ring-1 ring-white/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">TaskFlow</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isAuthMode === 'login' ? 'Sign in to access your dashboard' : 'Create a new account to get started'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
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
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-xl flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
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
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
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
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthLoading}
              className="mt-3 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {isAuthLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isAuthMode === 'login' ? 'Sign In to Account' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <span className="text-xs text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secured with JWT Authentication
            </span>
          </div>
        </div>

        {/* API Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-400" /> API Environment Settings
              </h2>
              <p className="text-xs text-slate-400 mt-1">Configure backend endpoint URL</p>
              <div className="mt-4 flex flex-col gap-2">
                <label className="text-xs font-medium text-slate-300">Backend URL</label>
                <input
                  type="text"
                  value={pendingApiUrl}
                  onChange={(e) => setPendingApiUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="mt-6 flex justify-end gap-2.5">
                <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 font-medium">Cancel</button>
                <button onClick={() => { setApiUrl(pendingApiUrl); setIsSettingsOpen(false); }} className="px-4 py-2 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20">Save Configuration</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dashboard / Todo App Screen
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-8 px-4 sm:px-6 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        
        {/* Header Section */}
        <header className="flex flex-col gap-5 border-b border-slate-800/80 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">TaskFlow</h1>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                  <span>•</span>
                  <span>JWT Secured</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchTodos(apiUrl)} 
                title="Refresh tasks" 
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)} 
                title="API Settings" 
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all shadow-sm"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User Info & Progress Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 flex items-center justify-between text-xs px-4 py-3 rounded-2xl border bg-slate-900/70 border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-2.5 text-slate-300">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Logged in as</span>
                  <span className="font-medium text-slate-200 truncate max-w-[180px] sm:max-w-[220px]">{currentUser}</span>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl border bg-slate-900/70 border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-medium">Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-200">{progressPercentage}%</span>
              </div>
            </div>
          </div>
        </header>

        {/* New Todo Input Form */}
        <form onSubmit={handleAddTodo} className="relative group">
          <div className="flex items-center gap-2 p-2 bg-slate-900/90 border border-slate-800/90 rounded-2xl shadow-xl shadow-black/40 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="What needs to be done today?..."
              className="flex-1 bg-transparent px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
            />
            <button 
              type="submit" 
              disabled={!newTodoText.trim()} 
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <Plus className="w-4 h-4" /> 
              <span>Add Task</span>
            </button>
          </div>
        </form>

        {/* Controls: Filters, Sorting & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Filters */}
          <div className="flex items-center bg-slate-900/80 border border-slate-800/80 p-1 rounded-xl text-xs backdrop-blur-sm">
            {['all', 'active', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-lg transition-all font-medium capitalize flex items-center gap-1.5 ${filter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <span>{f}</span>
                {f === 'all' && <span className="opacity-70 text-[10px]">({todos.length})</span>}
                {f === 'active' && <span className="opacity-70 text-[10px]">({activeCount})</span>}
                {f === 'completed' && <span className="opacity-70 text-[10px]">({completedCount})</span>}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 sm:justify-end">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700 transition-all">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)} 
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="newest" className="bg-slate-900">Newest first</option>
                <option value="oldest" className="bg-slate-900">Oldest first</option>
                <option value="az" className="bg-slate-900">A &rarr; Z</option>
                <option value="za" className="bg-slate-900">Z &rarr; A</option>
                <option value="status" className="bg-slate-900">Pending first</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-[210px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search tasks..." 
                className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-all" 
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Task List Section */}
        <div className="flex flex-col gap-2.5">
          {filteredTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-slate-800/80 rounded-3xl bg-slate-900/20 text-center">
              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 mb-3 text-slate-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No tasks found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                {searchQuery ? 'Try matching a different keyword' : 'Enjoy your free time or add a new task above.'}
              </p>
            </div>
          ) : (
            filteredTodos.map((todo) => {
              const formattedDate = formatDateTime(todo.createdAt || todo.timestamp);
              const isEditing = editingId === todo._id;

              return (
                <div 
                  key={todo._id} 
                  className={`group relative flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-200 ${
                    todo.completed 
                      ? 'bg-slate-900/30 border-slate-800/50 opacity-75' 
                      : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700/90 shadow-md shadow-black/20'
                  }`}
                >
                  {/* Left Active Accent Bar */}
                  {!todo.completed && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-r-full" />
                  )}

                  {/* Toggle Checkbox */}
                  <button 
                    onClick={() => handleToggleTodo(todo)} 
                    disabled={isEditing} 
                    className="mt-0.5 text-slate-500 hover:text-indigo-400 transition-colors shrink-0"
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/10" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  {/* Text / Edit Input */}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text" 
                          autoFocus 
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(todo._id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-full bg-slate-950 border border-indigo-500 rounded-xl px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] text-slate-500">Press Enter to save • Esc to cancel</span>
                      </div>
                    ) : (
                      <p 
                        onDoubleClick={() => !todo.completed && handleStartEdit(todo)} 
                        className={`text-sm break-words leading-relaxed select-none ${
                          todo.completed ? 'line-through text-slate-500' : 'text-slate-100 font-medium'
                        }`}
                      >
                        {todo.text}
                      </p>
                    )}

                    {formattedDate && !isEditing && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3" /> 
                        <span>{formattedDate}</span>
                        {todo.updatedAt && <span className="text-slate-600">(edited)</span>}
                      </div>
                    )}
                  </div>

                  {/* Item Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={() => handleSaveEdit(todo._id)} 
                          className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)} 
                          className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleStartEdit(todo)} 
                          className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg opacity-90 sm:opacity-0 group-hover:opacity-100 transition-all"
                          title="Edit Task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setDeleteCandidate(todo)} 
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-90 sm:opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" /> API Settings
            </h2>
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-400">Endpoint Target</label>
              <input 
                type="text" 
                value={pendingApiUrl} 
                onChange={(e) => setPendingApiUrl(e.target.value)} 
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500" 
              />
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 font-medium">Cancel</button>
              <button onClick={() => { setApiUrl(pendingApiUrl); setIsSettingsOpen(false); }} className="px-4 py-2 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20">Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-semibold text-white text-base mb-1">Delete Task?</h3>
            <p className="text-xs text-slate-400 mb-5 break-words">
              Are you sure you want to remove "<span className="text-slate-200">{deleteCandidate.text}</span>"?
            </p>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setDeleteCandidate(null)} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 font-medium">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-xl text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md shadow-rose-600/20">Delete Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}