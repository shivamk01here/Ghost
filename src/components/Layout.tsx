import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Calendar,
  Image,
  Plus,
  Moon,
  Sun,
  Menu,
  X,
  Map,
  Search,
  Settings,
  Download,
  Upload,
  PanelLeft,
  RefreshCw,
  Check,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../hooks/useUI';
import { useDataExport, useDataImport } from '../hooks/useDatabase';
import { useSync } from '../hooks/useSync';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const location = useLocation();
  const { exportToFile, isExporting } = useDataExport();
  const { importFromFile, isImporting } = useDataImport();
  const { status, isLoggedIn, user, sync } = useSync();

  const isEditorPage = location.pathname.includes('/editor');

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await importFromFile(file);
      } catch (error) {
        console.error('Import failed:', error);
      }
    }
    event.target.value = '';
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Timeline' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/gallery', icon: Image, label: 'Gallery' },
    { path: '/atlas', icon: Map, label: 'Atlas' },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-1.5 rounded-lg bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-800"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

        {/* Sidebar - Collapsible & Modern */}
        <aside
          className={`
            fixed lg:sticky lg:top-0 lg:h-screen z-40
            ${isCollapsed ? 'w-16' : 'w-56'}
            bg-sidebar-light dark:bg-sidebar-dark
            border-r border-gray-200 dark:border-gray-700
            transform transition-all duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            flex flex-col overflow-hidden
          `}
        >
          {/* New Entry Button - Always visible at top */}
          <div className={`px-2 pb-2 pt-4 lg:pt-2 shrink-0 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <NavLink
            to="/editor/new"
            className={`
              flex items-center justify-center gap-1.5 
              ${isCollapsed ? 'w-10 h-10 px-0' : 'w-full px-3 py-2'}
              bg-primary-500 text-white rounded-xl font-bold text-xs 
              shadow-lg shadow-primary-500/20 hover:bg-primary-600 
              transition-all active:scale-95 hover:shadow-xl hover:shadow-primary-500/30
            `}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Plus size={isCollapsed ? 20 : 16} strokeWidth={isCollapsed ? 2.5 : 2} />
            {!isCollapsed && <span>New Entry</span>}
          </NavLink>
        </div>

        {/* Navigation - Icons only when collapsed */}
        <nav className={`px-2 space-y-1 shrink-0 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `
                sidebar-link 
                ${isCollapsed ? 'justify-center w-10 h-10 p-0' : 'py-2 px-3 text-xs'}
                ${isActive ? 'active' : ''}
                rounded-xl transition-all duration-200 hover:scale-105
              `}
              onClick={() => setIsMobileMenuOpen(false)}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={isCollapsed ? 20 : 16} strokeWidth={isCollapsed ? 2 : 1.5} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1 min-h-0" />

        {/* Bottom Section - Utility buttons */}
        <div className={`p-2 border-t border-gray-200 dark:border-gray-700 space-y-1 shrink-0 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {/* Settings, Profile & Sync */}
          <div className={`flex flex-col gap-2 p-1 ${isCollapsed ? 'items-center' : ''}`}>
            <NavLink 
              to="/settings"
              className={({ isActive }) => `
                flex items-center gap-2 p-1.5 rounded-xl transition-all
                ${isActive ? 'bg-primary-50 text-primary-500 dark:bg-primary-500/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}
                ${isCollapsed ? 'justify-center w-10 h-10' : 'w-full'}
              `}
              title="Settings"
            >
              <Settings size={isCollapsed ? 20 : 16} />
              {!isCollapsed && <span className="text-xs font-bold">Settings</span>}
            </NavLink>

            <div className={`
              flex items-center gap-2 p-1.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800
              ${isCollapsed ? 'flex-col justify-center w-12 py-3' : 'w-full justify-between'}
            `}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-500 font-black text-[10px]">
                  {user ? user.name.charAt(0) : '?'}
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-900 dark:text-white leading-tight truncate max-w-[80px]">
                      {user ? user.name.split(' ')[0] : 'Guest'}
                    </span>
                    <span className="text-[8px] text-gray-500 font-bold">{isLoggedIn ? 'Online' : 'Offline'}</span>
                  </div>
                )}
              </div>
              
              <button 
                onClick={sync}
                disabled={status === 'syncing'}
                className={`
                  flex items-center justify-center rounded-lg transition-all duration-300
                  ${isCollapsed ? 'w-8 h-8' : 'w-7 h-7'}
                  ${status === 'syncing' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-500' : 
                    status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-500' :
                    status === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-500' :
                    'bg-white dark:bg-gray-800 text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700'}
                `}
                title={status === 'syncing' ? 'Syncing...' : 'Sync Now'}
              >
                {status === 'syncing' ? <RefreshCw size={14} className="animate-spin" /> :
                 status === 'success' ? <Check size={14} /> :
                 status === 'error' ? <AlertCircle size={14} /> :
                 <RefreshCw size={14} />}
              </button>
            </div>
          </div>

          {/* Export/Import */}
          <div className={`flex gap-1 ${isCollapsed ? 'flex-col items-center' : ''}`}>
            <button
              onClick={exportToFile}
              disabled={isExporting}
              className={`btn-secondary flex items-center justify-center gap-1 text-[9px] ${isCollapsed ? 'w-8 h-8 p-0' : 'flex-1 py-1 px-1'}`}
              title="Export"
            >
              <Download size={isCollapsed ? 14 : 10} />
              {!isCollapsed && <span>{isExporting ? '...' : 'Export'}</span>}
            </button>
            <label className={`btn-secondary flex items-center justify-center gap-1 text-[9px] cursor-pointer ${isCollapsed ? 'w-8 h-8 p-0' : 'flex-1 py-1 px-1'}`} title="Import">
              <Upload size={isCollapsed ? 14 : 10} />
              {!isCollapsed && <span>{isImporting ? '...' : 'Import'}</span>}
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                disabled={isImporting}
              />
            </label>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-center gap-1 rounded-lg text-[9px] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isCollapsed ? 'w-8 h-8 p-0' : 'px-2 py-1'}`}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun size={isCollapsed ? 16 : 10} /> : <Moon size={isCollapsed ? 16 : 10} />}
            {!isCollapsed && <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto bg-white dark:bg-black">
        {/* Top Header Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden lg:flex"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <PanelLeft size={18} />
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 hidden lg:block" />
          </div>
          <div className="flex items-center gap-3">
            <NavLink 
              to="/search"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <Search size={18} />
            </NavLink>
            <button 
              onClick={sync}
              disabled={status === 'syncing'}
              className={`
                flex items-center justify-center rounded-full transition-all duration-300
                ${status === 'syncing' ? 'w-8 h-8 bg-primary-100 dark:bg-primary-900/30 text-primary-500' : 
                  status === 'success' ? 'w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-500' :
                  status === 'error' ? 'w-8 h-8 bg-red-100 dark:bg-red-900/30 text-red-500' :
                  'w-8 h-8 bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}
              `}
              title={status === 'syncing' ? 'Syncing...' : 'Sync to Cloud'}
            >
              {status === 'syncing' ? <RefreshCw size={16} className="animate-spin" /> :
               status === 'success' ? <Check size={16} /> :
               status === 'error' ? <AlertCircle size={16} /> :
               <RefreshCw size={16} />}
            </button>
          </div>
        </div>

        <div className={`${isEditorPage ? 'max-w-4xl mx-auto' : 'p-4'} pb-20`}>
          {children}
        </div>
      </main>
    </div>
  );
};
