'use client';

import React from 'react';
import { TaskStats } from '@/types/task';
import { CheckCircle2, Clock, PlayCircle, Layers, AlertTriangle } from 'lucide-react';

interface StatsCardsProps {
  stats: TaskStats;
  onFilterStatus?: (status: 'ALL' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED') => void;
  activeStatus?: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  stats,
  onFilterStatus,
  activeStatus = 'ALL',
}) => {
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const cards = [
    {
      id: 'stat-total',
      label: 'Total Tasks',
      value: stats.total,
      icon: Layers,
      color: 'var(--accent-primary)',
      bg: 'rgba(99, 102, 241, 0.1)',
      statusKey: 'ALL' as const,
    },
    {
      id: 'stat-todo',
      label: 'To Do',
      value: stats.todo,
      icon: Clock,
      color: 'var(--text-secondary)',
      bg: 'rgba(148, 163, 184, 0.1)',
      statusKey: 'TODO' as const,
    },
    {
      id: 'stat-progress',
      label: 'In Progress',
      value: stats.inProgress,
      icon: PlayCircle,
      color: 'var(--accent-cyan)',
      bg: 'rgba(6, 182, 212, 0.1)',
      statusKey: 'IN_PROGRESS' as const,
    },
    {
      id: 'stat-completed',
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle2,
      color: 'var(--accent-emerald)',
      bg: 'rgba(16, 185, 129, 0.1)',
      statusKey: 'COMPLETED' as const,
      extra: `${completionRate}% Done`,
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '1rem',
      marginBottom: '1.75rem',
    }}>
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeStatus === card.statusKey;

        return (
          <div
            key={card.id}
            id={card.id}
            onClick={() => onFilterStatus && onFilterStatus(card.statusKey)}
            className="glass-card"
            style={{
              padding: '1.25rem',
              cursor: onFilterStatus ? 'pointer' : 'default',
              borderColor: isActive ? card.color : 'var(--border-subtle)',
              boxShadow: isActive ? `0 0 16px ${card.bg}` : 'var(--shadow-sm)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {card.label}
              </span>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: card.bg,
                color: card.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon size={18} />
              </div>
            </div>

            {/* Value & Extra */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                {card.value}
              </span>
              {card.extra && (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: card.color,
                  backgroundColor: card.bg,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}>
                  {card.extra}
                </span>
              )}
            </div>

            {/* Overdue alert indicator on total card if applicable */}
            {card.statusKey === 'ALL' && stats.overdue > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginTop: '0.5rem',
                fontSize: '0.72rem',
                color: 'var(--accent-rose)',
                fontWeight: 600,
              }}>
                <AlertTriangle size={12} />
                <span>{stats.overdue} overdue {stats.overdue === 1 ? 'task' : 'tasks'}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
