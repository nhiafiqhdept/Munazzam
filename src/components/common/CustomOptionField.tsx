import React from 'react';
import { Edit3 } from 'lucide-react';

interface CustomOptionFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  maxLength?: number;
}

/**
 * Reusable input field that smoothly appears when "Other" is selected in any dropdown.
 * Provides consistent styling, contextual labeling, validation, and auto-focus across all Munazzam forms.
 */
export const CustomOptionField: React.FC<CustomOptionFieldProps> = ({
  label = 'Enter Custom Option *',
  value,
  onChange,
  placeholder = 'Type custom name here...',
  required = true,
  error,
  className = '',
  id,
  autoFocus = false,
  maxLength = 100,
}) => {
  return (
    <div className={`mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150 ${className}`}>
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800"
      >
        <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
        <span>{label}</span>
      </label>
      <input
        type="text"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        maxLength={maxLength}
        className={`w-full px-3 py-2 bg-emerald-50/40 border ${
          error
            ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
            : 'border-emerald-200 focus:ring-emerald-500/20 focus:border-emerald-600'
        } rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:bg-white transition-all`}
      />
      {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
    </div>
  );
};
