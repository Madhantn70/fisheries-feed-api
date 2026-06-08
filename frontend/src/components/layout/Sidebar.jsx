import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, Fish, ClipboardList, Settings,
  LogOut, Database, Layers, History, User, FileText, ShieldCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { name: 'Dashboard',  path: '/dashboard',  icon: LayoutDashboard, adminOnly: false },
  { name: 'Add Stock',  path: '/add-stock',   icon: PlusCircle,      adminOnly: true  },
  { name: 'Feed Entry', path: '/feed-entry',  icon: Fish,            adminOnly: true  },
  { name: 'Logs',       path: '/logs',        icon: ClipboardList,   adminOnly: false },
  { name: 'History',    path: '/history',     icon: History,         adminOnly: false },
  { name: 'Tanks',      path: '/tanks',       icon: Database,        adminOnly: true  },
  { name: 'Feed Types', path: '/feed-types',  icon: Layers,          adminOnly: true  },
  { name: 'Reports',    path: '/reports',     icon: FileText,        adminOnly: true  },
  { name: 'Audit Trail',path: '/audit',       icon: ShieldCheck,     adminOnly: true  },
  { name: 'Settings',   path: '/settings',    icon: Settings,        adminOnly: true  },
];

export function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    toast.success("Logged out successfully");
    navigate('/', { replace: true });
  };

  const filteredNavItems = navItems.filter((item) => {
    if (!user || user.role !== 'admin') {
      return !item.adminOnly;
    }
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 md:static md:translate-x-0 md:w-20 lg:w-64 shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center px-4 lg:px-6 border-b border-gray-100 dark:border-gray-700 justify-between md:justify-center lg:justify-start">
          <div className="flex items-center">
            <Fish className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-2 md:mr-0 lg:mr-2" />
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight md:hidden lg:block">AquaFeed</span>
          </div>
          {/* Close button inside sidebar for mobile only */}
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-0.5 px-3">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:justify-center lg:justify-start",
                  isActive 
                    ? "bg-blue-50 dark:bg-gray-700 text-blue-700 dark:text-blue-400" 
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="md:hidden lg:block">{item.name}</span>
            </NavLink>
          ))}
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 md:justify-center lg:justify-start">
              <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="overflow-hidden md:hidden lg:block">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user.username}</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400">
                    {user.role}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={(e) => {
              handleLogout(e);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-red-600 dark:hover:text-red-400 transition-colors md:justify-center lg:justify-start"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="md:hidden lg:block">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
