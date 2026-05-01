import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  ListTodo,
  History,
  Activity,
  BarChart3,
  LogOut,
  ShieldCheck,
  DoorOpen,
  PackagePlus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Submit Request', path: '/submit', icon: PlusCircle },
  { name: 'Approval Queue', path: '/queue', icon: ListTodo, adminOnly: true },
  { name: 'Asset Upload', path: '/asset-upload', icon: PackagePlus, adminOnly: true },
  { name: 'My Requests', path: '/my-requests', icon: History },
  { name: 'Activity Log', path: '/activity', icon: Activity, adminOnly: true },
  { name: 'Analytics', path: '/analytics', icon: BarChart3, adminOnly: true },
  { name: 'Room Availability', path: '/rooms', icon: DoorOpen },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { profile, user, isAdmin, signOut } = useAuth();
  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="candy-glass fixed bottom-3 left-3 top-3 z-30 flex w-64 flex-col rounded-[30px] text-[#514165]">
      <div className="flex items-center gap-3 p-6">
        <div className="candy-glass-soft flex h-9 w-9 items-center justify-center rounded-xl text-[#8d69b3]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8d69b3]">Team 9</p>
          <h1 className="text-lg font-bold tracking-tight text-[#453857]">Auto-Review</h1>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        {navLinks.filter((link) => !link.adminOnly || isAdmin).map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => `
              flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
              ${isActive
                ? 'bg-[linear-gradient(135deg,#ebb1ff_0%,#ffc6e9_52%,#d1f2ff_100%)] text-[#4a3d5b] shadow-[0_10px_24px_rgba(171,131,208,0.22)]'
                : 'text-[#6a5a7e] hover:bg-white/45 hover:text-[#453857]'}
            `}
          >
            <link.icon className="w-5 h-5" />
            {link.name}
            {link.adminOnly && (
              <span className="ml-auto rounded bg-white/62 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#8d69b3]">
                Admin
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/50 p-4">
        <div className="mb-2 flex items-center gap-3 px-3 py-2">
          <div className="candy-glass-soft flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-[#6a5a7e]">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-[#453857]">{profile?.full_name || user?.email || 'User'}</p>
            <p className="truncate text-xs text-[#6a5a7e]">{isAdmin ? 'Administrator' : 'Requester'}</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut();
            navigate('/login', { replace: true });
          }}
          className="w-full rounded-xl border border-white/55 bg-white/35 px-3 py-2 text-left text-sm font-medium text-[#5d4e70] transition-colors hover:bg-white/58"
        >
          <LogOut className="mr-3 inline h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
