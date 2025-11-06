import React from 'react';
import { Rank } from '../types';

interface RankBadgeProps {
  rank: Rank;
  className?: string;
}

const RANK_STYLES: Record<Rank, { color: string, icon: string }> = {
  'Bronze Beginner': { color: 'bg-yellow-800/50 text-yellow-500 border-yellow-700/50', icon: '⚫' },
  'Silver Learner': { color: 'bg-slate-500/50 text-slate-300 border-slate-400/50', icon: '🟠' },
  'Gold Challenger': { color: 'bg-amber-600/50 text-amber-400 border-amber-500/50', icon: '🟢' },
  'Platinum Genius': { color: 'bg-cyan-600/50 text-cyan-300 border-cyan-500/50', icon: '🔵' },
  'Titanium Genius': { color: 'bg-purple-600/50 text-purple-300 border-purple-500/50', icon: '🟣' },
};

const RankBadge: React.FC<RankBadgeProps> = ({ rank, className = '' }) => {
  const { color, icon } = RANK_STYLES[rank] || RANK_STYLES['Bronze Beginner'];

  return (
    <span className={`px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 border ${color} ${className}`}>
      <span>{icon}</span>
      {rank}
    </span>
  );
};

export default RankBadge;
