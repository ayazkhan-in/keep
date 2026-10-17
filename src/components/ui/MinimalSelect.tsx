import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface MinimalSelectProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[] | string[];
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  align?: 'left' | 'right';
  prefix?: React.ReactNode;
}

export function MinimalSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
  size = 'md',
  fullWidth = false,
  align = 'left',
  prefix,
}: MinimalSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to SelectOption[]
  const normalizedOptions: SelectOption<T>[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt as unknown as T, label: opt };
    }
    return opt as SelectOption<T>;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-[11px] h-7 gap-1.5',
    md: 'px-3 py-1.5 text-xs h-8.5 gap-2',
    lg: 'px-3.5 py-2 text-[13px] h-10 gap-2.5',
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {/* Trigger Button - Minimal Grey & White */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] hover:border-[#CBD5E1] text-[#334155] hover:text-[#0F172A] rounded-xl font-medium transition-all shadow-2xs cursor-pointer select-none focus:outline-none focus:border-[#94A3B8] ${
          sizeClasses[size]
        } ${
          isOpen
            ? 'border-[#94A3B8] bg-white ring-2 ring-slate-100 text-[#0F172A]'
            : ''
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {prefix}
          {selectedOption?.icon && (
            <selectedOption.icon className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="text-[10px] font-mono-code px-1.5 py-0.2 rounded-full bg-[#E2E8F0] text-[#475569]">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#64748B] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#334155]' : ''
          }`}
        />
      </button>

      {/* Floating Animated Menu Popover - Grey and White Aesthetic */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute mt-1.5 z-50 min-w-[150px] max-h-60 overflow-y-auto bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-1 space-y-0.5 ${
              fullWidth ? 'w-full' : ''
            } ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            {normalizedOptions.map((option) => {
              const isSelected = option.value === value;
              const Icon = option.icon;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-[#F1F5F9] text-[#0F172A] font-semibold border border-[#E2E8F0]'
                      : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] border border-transparent font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    {Icon && (
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          isSelected ? 'text-[#0F172A]' : 'text-[#94A3B8]'
                        }`}
                      />
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {option.badge && (
                      <span
                        className={`text-[10px] font-mono-code px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? 'bg-[#E2E8F0] text-[#334155]'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        {option.badge}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#0F172A]" />
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Minimal Styled Native Select for ultra-dense inline rows or form groups
 * with grey/white styling and custom SVG chevron.
 */
export const MinimalNativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    fullWidth?: boolean;
    sizeVariant?: 'sm' | 'md' | 'lg';
  }
>(({ className = '', fullWidth = false, sizeVariant = 'md', children, ...props }, ref) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-[11px] pr-7 h-7',
    md: 'px-3 py-1.5 text-xs pr-8 h-8.5',
    lg: 'px-3.5 py-2 text-[13px] pr-9 h-10',
  };

  return (
    <div className={`relative inline-block ${fullWidth ? 'w-full' : ''}`}>
      <select
        ref={ref}
        className={`w-full appearance-none bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] hover:border-[#CBD5E1] text-[#334155] rounded-xl font-medium transition-all shadow-2xs cursor-pointer focus:outline-none focus:border-[#94A3B8] focus:bg-white ${
          sizeClasses[sizeVariant]
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748B]">
        <ChevronDown className="w-3.5 h-3.5" />
      </div>
    </div>
  );
});

MinimalNativeSelect.displayName = 'MinimalNativeSelect';
