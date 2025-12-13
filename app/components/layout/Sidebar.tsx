'use client';

import React, { useState } from 'react';

interface SidebarProps {
  children: React.ReactNode;
}

interface SidebarSectionProps {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function SidebarSection({ title, icon, defaultOpen = true, children }: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <span className="text-gray-500 text-xs">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <div className="h-full flex flex-col">
      {children}
    </div>
  );
}
