'use client';

import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExpandableNavItemProps {
  label: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isCollapsed?: boolean;
}

export default function ExpandableNavItem({
  label,
  icon,
  expanded,
  onToggle,
  children,
  isCollapsed = false,
}: ExpandableNavItemProps) {
  const id = useId();

  // Modo colapsado
  if (isCollapsed) {
    return (
      <div className="relative flex items-center justify-center group h-12">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-700 transition-colors duration-150">
          {icon}
        </span>

        <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {label}
        </div>
      </div>
    );
  }

  // Modo expandido
  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={id}
        className={[
          'relative flex items-center justify-between w-full px-3 py-2.5 rounded-xl',
          'transition-all duration-150 group',
          // Sidebar branca
          'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900',
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-150 bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-700">
            {icon}
          </span>

          <span className="text-[13.5px] font-semibold tracking-tight">
            {label}
          </span>
        </div>

        <ChevronDown
          size={16}
          className={[
            'transition-transform duration-200',
            expanded ? 'rotate-180 text-zinc-700' : 'text-zinc-500',
          ].join(' ')}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={id}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={{
              expanded: { opacity: 1, height: 'auto' },
              collapsed: { opacity: 0, height: 0 },
            }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-1 space-y-0.5 border-l border-zinc-200 pl-3 pt-1 pb-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}