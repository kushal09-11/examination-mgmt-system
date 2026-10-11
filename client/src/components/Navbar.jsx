import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { Menu, LogOut, User as UserIcon, Shield, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleBadgeColor = {
    Admin: 'bg-rose-100 text-rose-700 border-rose-200',
    Faculty: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    Student: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Examiner: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black text-xs shadow-sm">
            CBIT
          </div>
          <span className="hidden sm:inline-block font-extrabold text-slate-900 tracking-tight text-base">
            CBIT <span className="text-blue-600 font-semibold text-xs tracking-normal uppercase bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">Gandipet</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationDropdown />

        <div className="h-6 w-px bg-slate-200" />

        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">{user?.full_name}</p>
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded border ${roleBadgeColor[user?.role] || 'bg-slate-100 text-slate-700'}`}>
                {user?.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.full_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <p className="text-[10px] text-slate-400 mt-1">ID: {user?.institutional_id || 'N/A'}</p>
              </div>

              <button
                onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                Profile & Security
              </button>

              <div className="border-t border-slate-100 my-1" />

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
