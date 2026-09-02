import { NavLink } from 'react-router-dom';
import { LayoutGrid, ShieldCheck, FolderUp, Settings } from 'lucide-react';
import { selection } from '../../utils/haptics.js';

const ITEMS = [
  { to: '/', label: 'Inicio', icon: LayoutGrid, end: true },
  { to: '/inspeccion', label: 'Control', icon: ShieldCheck },
  { to: '/gestion', label: 'Gestión', icon: FolderUp },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

/** Barra de navegación inferior fija (glassmorphism). */
export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-primary-100 glass pb-safe">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={selection}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${
                isActive ? 'text-primary-900' : 'text-primary-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="h-6 w-6"
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive ? 'currentColor' : 'none'}
                  fillOpacity={isActive ? 0.12 : 0}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
