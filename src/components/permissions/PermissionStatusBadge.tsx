import React from 'react';
import { PermissionStatus } from '../../types';
import { CheckCircle2, Clock, AlertCircle, XCircle, FileEdit, HelpCircle } from 'lucide-react';

interface PermissionStatusBadgeProps {
  status?: PermissionStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const PermissionStatusBadge: React.FC<PermissionStatusBadgeProps> = ({
  status = 'not_requested',
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
          dot: 'bg-emerald-500',
        };
      case 'pending':
        return {
          label: 'Pending Approval',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
          dot: 'bg-amber-500',
        };
      case 'recommended':
        return {
          label: 'Recommended',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
          dot: 'bg-blue-500',
        };
      case 'changes_required':
        return {
          label: 'Changes Required',
          bg: 'bg-orange-50 text-orange-800 border-orange-200',
          icon: <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />,
          dot: 'bg-orange-500',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
          dot: 'bg-rose-500',
        };
      case 'draft':
        return {
          label: 'Draft',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <FileEdit className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
          dot: 'bg-slate-400',
        };
      case 'not_requested':
      default:
        return {
          label: 'Not Requested',
          bg: 'bg-slate-50 text-slate-600 border-slate-200',
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
          dot: 'bg-slate-300',
        };
    }
  };

  const config = getBadgeConfig();

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold tracking-wide rounded-lg border shadow-2xs whitespace-nowrap ${config.bg} ${sizeClasses} ${className}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};
