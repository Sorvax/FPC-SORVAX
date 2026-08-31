import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, FolderLock, ShieldCheck, FileText, Settings, Shield } from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Overview' },
    { to: '/cases', icon: Briefcase, label: 'Cases' },
    { to: '/evidence', icon: FolderLock, label: 'Evidence' },
    { to: '/verification', icon: ShieldCheck, label: 'Verification' },
    { to: '/reports', icon: FileText, label: 'Reports' }
  ];

  return (
    <aside className="w-64 flex flex-col bg-white border-r border-slate-200 h-full">
      <div className="p-6">
        <NavLink to="/" className="flex items-center gap-2 text-indigo-600">
          <Shield className="w-8 h-8 fill-indigo-100" strokeWidth={1.5} />
          <span className="text-xl font-bold tracking-tight text-slate-900">FPC-SORVAX</span>
        </NavLink>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive 
                ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' 
                : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}
            `}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <NavLink
          to="/system"
          className={({ isActive }) => `
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
            ${isActive 
              ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' 
              : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}
          `}
        >
          <Settings className="w-5 h-5" />
          System
        </NavLink>
      </div>
    </aside>
  );
}
