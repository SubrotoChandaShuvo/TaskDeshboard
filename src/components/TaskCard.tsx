'use client';

import React from 'react';
import { Task, TaskStatus } from '@/types/task';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Pencil,
  Trash2,
  Check,
  PlayCircle,
  RotateCcw,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const isCompleted = task.status === 'COMPLETED';

  // Priority color config
  const priorityConfig = {
    LOW: { color: 'var(--priority-low)', bg: 'var(--priority-low-bg)', label: 'Low' },
    MEDIUM: { color: 'var(--priority-medium)', bg: 'var(--priority-medium-bg)', label: 'Medium' },
    HIGH: { color: 'var(--priority-high)', bg: 'var(--priority-high-bg)', label: 'High' },
    URGENT: { color: 'var(--priority-urgent)', bg: 'var(--priority-urgent-bg)', label: 'Urgent' },
  }[task.priority] || { color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)', label: task.priority };

  // Status color config
  const statusConfig = {
    TODO: { color: 'var(--status-todo)', bg: 'var(--status-todo-bg)', label: 'To Do', icon: Clock },
    IN_PROGRESS: { color: 'var(--status-progress)', bg: 'var(--status-progress-bg)', label: 'In Progress', icon: PlayCircle },
    COMPLETED: { color: 'var(--status-completed)', bg: 'var(--status-completed-bg)', label: 'Completed', icon: CheckCircle },
  }[task.status] || { color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)', label: task.status, icon: Clock };

  // Due date calculations
  let dueDateInfo: { text: string; isOverdue: boolean } | null = null;
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const now = new Date();
    const isOverdue = due.getTime() < now.getTime() && !isCompleted;
    const formatted = due.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: due.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
    dueDateInfo = {
      text: formatted,
      isOverdue,
    };
  }

  const StatusIcon = statusConfig.icon;

  return (
    <div
      id={`task-card-${task.id}`}
      className="glass-card"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: isCompleted ? 0.75 : 1,
        transition: 'var(--transition)',
        position: 'relative',
      }}
    >
      <div>
        {/* Top Header: Status & Priority Badges */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          marginBottom: '0.85rem',
        }}>
          {/* Quick Status Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: statusConfig.bg,
            color: statusConfig.color,
            fontSize: '0.72rem',
            fontWeight: 600,
          }}>
            <StatusIcon size={12} />
            <span>{statusConfig.label}</span>
          </div>

          {/* Priority Pill */}
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            color: priorityConfig.color,
            backgroundColor: priorityConfig.bg,
            border: `1px solid ${priorityConfig.color}33`,
          }}>
            {priorityConfig.label}
          </span>
        </div>

        {/* Task Title with Quick Toggle Checkbox */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <button
            id={`btn-toggle-complete-${task.id}`}
            onClick={() => onStatusChange(task.id, isCompleted ? 'TODO' : 'COMPLETED')}
            title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
            style={{
              width: '20px',
              height: '20px',
              minWidth: '20px',
              borderRadius: '6px',
              border: isCompleted
                ? '1px solid var(--accent-emerald)'
                : '1px solid var(--border-subtle)',
              backgroundColor: isCompleted ? 'var(--accent-emerald)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginTop: '2px',
              transition: 'var(--transition)',
            }}
          >
            {isCompleted && <Check size={13} color="#ffffff" strokeWidth={3} />}
          </button>

          <h3 style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: isCompleted ? 'line-through' : 'none',
            wordBreak: 'break-word',
            lineHeight: 1.35,
          }}>
            {task.title}
          </h3>
        </div>

        {/* Description */}
        {task.description && (
          <p style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            marginBottom: '1rem',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {task.description}
          </p>
        )}
      </div>

      {/* Footer Info & Action Buttons */}
      <div style={{
        marginTop: '1rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.65rem',
      }}>
        {/* Due Date Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
          {dueDateInfo ? (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: dueDateInfo.isOverdue ? 'var(--accent-rose)' : 'var(--text-muted)',
              fontWeight: dueDateInfo.isOverdue ? 600 : 400,
            }}>
              {dueDateInfo.isOverdue ? <AlertCircle size={13} /> : <Calendar size={13} />}
              <span>{dueDateInfo.isOverdue ? `Overdue: ${dueDateInfo.text}` : `Due: ${dueDateInfo.text}`}</span>
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              No due date
            </span>
          )}
        </div>

        {/* Actions Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {/* Quick Status Select */}
          <select
            id={`select-status-quick-${task.id}`}
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
            style={{
              fontSize: '0.72rem',
              padding: '3px 6px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Edit Button */}
          <button
            id={`btn-edit-task-${task.id}`}
            onClick={() => onEdit(task)}
            title="Edit task"
            style={{
              padding: '5px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-primary)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <Pencil size={13} />
          </button>

          {/* Delete Button */}
          <button
            id={`btn-delete-task-${task.id}`}
            onClick={() => onDelete(task)}
            title="Delete task"
            style={{
              padding: '5px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              color: 'var(--accent-rose)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)';
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
