'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, TaskStats, TaskStatus, TaskPriority, CreateTaskDTO, UpdateTaskDTO } from '@/types/task';
import { Navbar } from '@/components/Navbar';
import { StatsCards } from '@/components/StatsCards';
import { FilterBar } from '@/components/FilterBar';
import { TaskCard } from '@/components/TaskCard';
import { TaskModal } from '@/components/TaskModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import {
  Plus,
  Loader2,
  Inbox,
  AlertCircle,
  RefreshCw,
  SearchX,
  Database,
} from 'lucide-react';

export default function DashboardPage() {
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    todo: 0,
    inProgress: 0,
    completed: 0,
    highPriority: 0,
    overdue: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Health / DB state
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [dbLatency, setDbLatency] = useState<number | undefined>(undefined);

  // Filters & Sorting
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus | 'ALL'>('ALL');
  const [priority, setPriority] = useState<TaskPriority | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check Database Connectivity
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setDbConnected(data.status === 'healthy');
        setDbLatency(data.latencyMs);
      } else {
        setDbConnected(false);
      }
    } catch {
      setDbConnected(false);
    }
  }, []);

  // Fetch Tasks from REST API (PostgreSQL data source)
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    const queryParams = new URLSearchParams();
    if (search.trim()) queryParams.set('search', search.trim());
    if (status !== 'ALL') queryParams.set('status', status);
    if (priority !== 'ALL') queryParams.set('priority', priority);
    queryParams.set('sortBy', sortBy);
    queryParams.set('order', order);

    try {
      const res = await fetch(`/api/tasks?${queryParams.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || `Server responded with ${res.status}`);
      }

      setTasks(json.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setFetchError((err as Error).message || 'Failed to load tasks from server');
    } finally {
      setIsLoading(false);
    }
  }, [search, status, priority, sortBy, order]);

  // Fetch Aggregated Statistics
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.stats) {
          setStats(json.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkHealth();
    fetchStats();
  }, [checkHealth, fetchStats]);

  // Fetch tasks whenever filters or sorting change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handlers for CRUD
  const handleCreateOrUpdateTask = async (
    data: CreateTaskDTO | UpdateTaskDTO
  ): Promise<boolean> => {
    try {
      const isEditing = Boolean(editingTask);
      const url = isEditing ? `/api/tasks/${editingTask!.id}` : '/api/tasks';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        let errorMsg = json.error || 'Failed to save task';
        if (json.details) {
          const detailMsgs = Object.values(json.details).join(' ');
          errorMsg = `${errorMsg}: ${detailMsgs}`;
        }
        throw new Error(errorMsg);
      }

      addToast(
        'success',
        isEditing
          ? `Updated "${json.task?.title || 'task'}" successfully.`
          : `Created "${json.task?.title || 'task'}" in PostgreSQL.`
      );

      // Refresh real state from database
      await fetchTasks();
      await fetchStats();
      return true;
    } catch (err) {
      addToast('error', (err as Error).message);
      return false;
    }
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update task status');
      }

      addToast(
        'success',
        `Moved to ${newStatus === 'IN_PROGRESS' ? 'In Progress' : newStatus === 'COMPLETED' ? 'Completed' : 'To Do'}.`
      );

      // Refresh list & statistics from server
      await fetchTasks();
      await fetchStats();
    } catch (err) {
      addToast('error', (err as Error).message);
    }
  };

  const handleDeleteTask = async (taskId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete task');
      }

      addToast(
        'success',
        `Permanently deleted "${json.deletedTitle || 'task'}" from database.`
      );

      // Refresh tasks and stats
      await fetchTasks();
      await fetchStats();
      return true;
    } catch (err) {
      addToast('error', (err as Error).message);
      return false;
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setPriority('ALL');
    setSortBy('createdAt');
    setOrder('desc');
  };

  const hasActiveFilters = useMemo(() => {
    return (
      search.trim() !== '' ||
      status !== 'ALL' ||
      priority !== 'ALL' ||
      sortBy !== 'createdAt' ||
      order !== 'desc'
    );
  }, [search, status, priority, sortBy, order]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <Navbar
        onNewTask={() => {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        }}
        dbConnected={dbConnected}
        dbLatency={dbLatency}
      />

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem 0 3.5rem 0' }}>
        <div className="container">
          {/* Top Hero Heading */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}>
            <div>
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#ffffff',
                marginBottom: '0.25rem',
              }}>
                Engineering Tasks
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Directly stored in PostgreSQL with REST API integration and real-time state persistence.
              </p>
            </div>

            <button
              id="btn-refresh-data"
              onClick={() => {
                fetchTasks();
                fetchStats();
                checkHealth();
              }}
              title="Refresh database tasks"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.95rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Aggregated Metric Cards */}
          <StatsCards
            stats={stats}
            activeStatus={status}
            onFilterStatus={(newStatus) => setStatus(newStatus)}
          />

          {/* Search, Filter, Sort Toolbar */}
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            priority={priority}
            onPriorityChange={setPriority}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            order={order}
            onOrderToggle={() => setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Database Error Banner */}
          {fetchError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent-rose)',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <AlertCircle size={20} />
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '0.9rem' }}>API Request Error</h4>
                  <p style={{ fontSize: '0.82rem', opacity: 0.9 }}>{fetchError}</p>
                </div>
              </div>
              <button
                onClick={() => fetchTasks()}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(244, 63, 94, 0.2)',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Tasks Grid or States */}
          {isLoading ? (
            <div style={{
              padding: '4rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              color: 'var(--text-muted)',
            }}>
              <Loader2 size={32} className="animate-spin" color="var(--accent-primary)" />
              <p style={{ fontSize: '0.9rem' }}>Fetching tasks from PostgreSQL...</p>
            </div>
          ) : tasks.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={(t) => {
                    setEditingTask(t);
                    setIsTaskModalOpen(true);
                  }}
                  onDelete={(t) => {
                    setDeletingTask(t);
                    setIsDeleteModalOpen(true);
                  }}
                  onStatusChange={handleQuickStatusChange}
                />
              ))}
            </div>
          ) : hasActiveFilters ? (
            /* No results matching filter */
            <div className="glass-card" style={{
              padding: '3.5rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}>
                <SearchX size={26} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
                No tasks match your criteria
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '1.25rem' }}>
                We couldn&apos;t find any tasks matching your active search keyword, status, or priority filters.
              </p>
              <button
                id="btn-empty-reset"
                onClick={handleResetFilters}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: 'var(--accent-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            /* Empty initial database */
            <div className="glass-card" style={{
              padding: '4rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}>
                <Inbox size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                No tasks in PostgreSQL database
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Get started by creating your first engineering task. All records are persisted directly to your PostgreSQL database.
              </p>
              <button
                id="btn-empty-create"
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.35rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Create Your First Task</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '1.25rem 0',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span>TaskFlow Dashboard &bull; PostgreSQL 18+ Integration</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>REST API: <code>/api/tasks</code></span>
            <span>Persistence: <code>PostgreSQL</code></span>
          </div>
        </div>
      </footer>

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleCreateOrUpdateTask}
        initialTask={editingTask}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        task={deletingTask}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingTask(null);
        }}
        onConfirm={handleDeleteTask}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
