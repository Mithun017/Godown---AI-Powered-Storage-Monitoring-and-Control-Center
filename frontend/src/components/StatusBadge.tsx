import React from 'react';
import { ShieldCheck, AlertTriangle, Flame, Activity, PackageCheck, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let badgeStyle = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/10';
  let Icon = ShieldCheck;
  let dotColor = 'bg-emerald-400';

  switch (status) {
    case 'Fire Risk - Critical':
      badgeStyle = 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 shadow-lg shadow-rose-500/20 animate-pulse';
      Icon = Flame;
      dotColor = 'bg-rose-500 animate-ping';
      break;
    case 'Critical':
      badgeStyle = 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/35 shadow-md shadow-orange-500/10';
      Icon = AlertCircle;
      dotColor = 'bg-orange-500';
      break;
    case 'High Temp':
      badgeStyle = 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/35 shadow-md shadow-amber-500/10';
      Icon = AlertTriangle;
      dotColor = 'bg-amber-500';
      break;
    case 'Rack Full':
      badgeStyle = 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/35 shadow-md shadow-yellow-500/10';
      Icon = PackageCheck;
      dotColor = 'bg-yellow-500';
      break;
    case 'Motion Detected':
      badgeStyle = 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/35 shadow-md shadow-sky-500/10';
      Icon = Activity;
      dotColor = 'bg-sky-400';
      break;
    case 'Safe':
    default:
      badgeStyle = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/10';
      Icon = ShieldCheck;
      dotColor = 'bg-emerald-400';
      break;
  }

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-[11px] gap-1.5',
    md: 'px-3.5 py-1 text-xs font-semibold gap-2',
    lg: 'px-4 py-1.5 text-sm font-bold gap-2',
  }[size];

  const iconSizes = {
    sm: 13,
    md: 15,
    lg: 18,
  }[size];

  return (
    <span className={`inline-flex items-center rounded-full border backdrop-blur-md transition-all ${badgeStyle} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <Icon size={iconSizes} />
      <span className="tracking-wide">{status}</span>
    </span>
  );
};
