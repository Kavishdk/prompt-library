/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import PromptList from './components/PromptList';
import PromptDetail from './components/PromptDetail';
import AddPrompt from './components/AddPrompt';
import Auth from './components/Auth';
import { logout } from './services/api';
import { LogOut, User } from 'lucide-react';

function Sidebar() {
  const location = useLocation();
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <aside className="w-60 bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border-subtle)] flex flex-col p-6 sm:p-8">
      <div className="font-serif italic text-xl mb-12 tracking-tight text-[var(--color-accent-gold)]">
        AI Prompt Lib
      </div>
      <nav className="flex-1">
        <ul className="space-y-4">
          <li>
            <Link to="/prompts" className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/prompts' || location.pathname.startsWith('/prompts/') ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}>Library</Link>
          </li>
          <li>
            <Link to="/add" className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/add' ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}>Create New</Link>
          </li>
        </ul>
      </nav>
      <div className="mt-auto space-y-4">
        {username ? (
          <div className="p-3 bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] rounded-lg">
            <div className="flex items-center gap-2 text-sm mb-2 text-[var(--color-text-primary)]">
              <User size={14} className="text-[var(--color-accent-gold)]" />
              <span className="truncate">{username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] hover:text-red-400 transition-colors uppercase tracking-wider"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        ) : (
          <Link to="/login" className="flex items-center justify-center p-2 border border-[var(--color-accent-gold)] rounded text-[var(--color-accent-gold)] text-xs uppercase tracking-widest hover:bg-[var(--color-accent-gold)] hover:text-black transition-all">
            Login
          </Link>
        )}
        <div className="text-[11px] bg-[rgba(255,255,255,0.03)] py-1 px-2.5 rounded-full border border-dashed border-[var(--color-text-muted)] text-center w-full">
          Redis Status: <strong className="text-[var(--color-accent-gold)]">Connected</strong>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[var(--color-bg-main)] text-[var(--color-text-primary)] font-sans overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-10 flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/prompts" replace />} />
            <Route path="/prompts" element={<PromptList />} />
            <Route path="/prompts/:id" element={<PromptDetail />} />
            <Route path="/add" element={<AddPrompt />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/register" element={<Auth mode="register" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
