import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { APP_NAME } from '../../utils/constants';
import { sidebarSections } from '../../config/navigation';
import logo from '../../../assets/logo.png';

const itemClass = ({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition ${isActive ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300'}`;

// Every section is a main option. Sections with a single destination act as
// direct links; multi-item sections expand on click and collapse back on a
// second click ("returns to its previous state").
function SidebarSection({ section, onNavigate }) {
  const location = useLocation();
  const isWithin = section.basePath.some((base) => location.pathname.startsWith(base));
  const [open, setOpen] = useState(isWithin);

  // Sync only when the admin enters or leaves the section's routes — a manual
  // toggle inside the section must not be overridden, so collapsing works
  // even while browsing subsections (e.g. Visa → Visa Dashboard).
  useEffect(() => {
    setOpen(isWithin);
  }, [isWithin]);

  const { icon: Icon } = section;

  // Single-destination section: the main option IS the link.
  if (section.items.length === 1) {
    const item = section.items[0];
    return (
      <NavLink
        to={item.to}
        onClick={onNavigate}
        className={({ isActive }) => `mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${isActive ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300'}`}
      >
        <Icon size={18} />
        <span className="flex-1 text-left">{section.label}</span>
      </NavLink>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${isWithin ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300'}`}
      >
        <Icon size={18} />
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-2 dark:border-slate-700">
          {section.items.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={onNavigate} className={itemClass}>
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  return <aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:inset-y-auto lg:top-0 lg:h-screen lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="flex h-17 flex-none items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
      <NavLink to="/admin/dashboard" className="flex items-center gap-3" onClick={onClose}>
        <img src={logo} alt="Maqam logo" className="logo-tile h-13 w-13 rounded-xl object-contain p-0.5 shadow-sm ring-1 ring-slate-100" />
        <span><span className="block text-base font-extrabold text-slate-900 dark:text-white">{APP_NAME}</span><span className="block text-[11px] font-medium text-slate-400">Admin Console</span></span>
      </NavLink>
      <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"><X size={18} /></button>
    </div>
    <div className="flex-1 overflow-y-auto px-3 py-4">
      {sidebarSections.map((section) => (
        <SidebarSection key={section.label} section={section} onNavigate={onClose} />
      ))}
    </div>
  </aside>;
}
