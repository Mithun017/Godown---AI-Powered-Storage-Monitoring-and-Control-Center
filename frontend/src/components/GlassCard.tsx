import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`glass-panel p-6 ${onClick ? 'glass-panel-hover cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
