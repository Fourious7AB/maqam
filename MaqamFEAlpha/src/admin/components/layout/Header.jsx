import { Bell, Menu, ChevronDown, LogOut, UserCircle2, Settings2, Sun, Moon, Inbox, CheckCheck, Trash2, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore, unreadNotificationCount } from '../../store/notificationStore';
import logo from '../../../assets/logo.png';
import { APP_NAME } from '../../utils/constants';

function formatChangeTime(at) {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Closes a dropdown on any click outside its root and on Escape.
function useDismiss(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);
  return ref;
}

function NotificationBell() {
  const navigate = useNavigate();
  const items = useNotificationStore((state) => state.items);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const clearAll = useNotificationStore((state) => state.clearAll);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useDismiss(open, close);
  const unread = unreadNotificationCount(items);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
        className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-13 z-20 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                Notifications
                {unread > 0 && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">{unread} new</span>}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={markAllRead} disabled={unread === 0} title="Mark all as read" aria-label="Mark all notifications as read" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-emerald-300"><CheckCheck size={15} /></button>
                <button onClick={clearAll} disabled={items.length === 0} title="Clear all" aria-label="Clear all notifications" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-red-400"><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <Inbox size={22} className="text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No notifications yet</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">When a section&apos;s numbers change, you&apos;ll see it here.</p>
                </div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    // Viewing a notification consumes it: removed from the list.
                    onClick={() => { removeNotification(item.id); close(); if (item.link) navigate(item.link); }}
                    className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/60 ${item.read ? '' : 'bg-emerald-50/60 dark:bg-emerald-500/5'}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${item.read ? 'bg-slate-200 dark:bg-slate-700' : 'bg-emerald-500'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{item.label} changed</span>
                      <span className="mt-0.5 block text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{item.from} → {item.to}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">{formatChangeTime(item.at)}</span>
                    </span>
                    {item.link && <ArrowRight size={13} className="mt-1 flex-none text-slate-300 dark:text-slate-600" />}
                  </button>
                ))
              )}
            </div>
        </div>
      )}
    </div>
  );
}

export default function Header({ onMenuClick, dashboard = false }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useThemeStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const closeProfile = () => setOpen(false);
  const profileRef = useDismiss(open, closeProfile);
  const displayName = user?.fullName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'A';
  return <header className={`sticky top-0 z-30 flex h-17 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/95 ${dashboard ? 'lg:border-transparent lg:bg-transparent lg:shadow-none' : ''}`}>
    <div className="flex min-w-0 items-center gap-2">
      {/* Mobile: opens the sidebar drawer (hidden on desktop where the sidebar is static) */}
      <button onClick={onMenuClick} aria-label="Open menu" className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"><Menu size={20} /></button>
      {/* Mobile-only brand, since the sidebar (with the logo) is off-canvas on small screens */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <img src={logo} alt="Maqam logo" className="logo-tile h-10 w-10 rounded-lg object-contain p-0.5" />
        <span className="text-base font-extrabold text-slate-900 dark:text-white">{APP_NAME}</span>
      </div>
    </div>
    <div className="flex items-center gap-1 sm:gap-2">
      <button onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
        {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
      </button>
      <NotificationBell />
<div className="relative" ref={profileRef}>
         <button onClick={() => setOpen(v => !v)} aria-label={`Open profile menu for ${displayName}`} className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800">
           {user?.avatar ? (
             <img
               src={user.avatar}
               alt={displayName}
               className="h-9 w-9 rounded-full object-cover ring-2 ring-emerald-500/20"
             />
           ) : (
             <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
               {initials}
             </div>
           )}
           <div className="hidden text-left sm:block">
             <p className="max-w-28 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{displayName}</p>
             <p className="text-[11px] capitalize text-slate-400">{user?.role?.replace('_',' ') || 'admin'}</p>
           </div>
           <ChevronDown size={15} className={`hidden text-slate-400 transition-transform sm:block ${open ? 'rotate-180' : ''}`} />
         </button>
        {open && (
          <>
            <div className="absolute right-0 top-13 z-20 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <button onClick={() => { closeProfile(); navigate('/admin/profile'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><UserCircle2 size={17} /> Profile</button>
              <button onClick={() => { closeProfile(); navigate('/admin/settings'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><Settings2 size={17} /> Account Settings</button>
              <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
              <button onClick={async () => { closeProfile(); await logout(); navigate('/admin/administrators/login'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"><LogOut size={17} /> Logout</button>
            </div>
          </>
        )}
      </div>
    </div>
  </header>;
}
