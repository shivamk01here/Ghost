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
import { useTheme } from '../components/theme-provider';
import { useDataExport, useDataImport } from '../hooks/useDatabase';
import { useSync } from '../hooks/useSync';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, setTheme } = useTheme();
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

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return (
    <div className="min-h-screen bg-background flex text-foreground font-sans">
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 rounded-lg shadow-sm"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
      </Button>

        {/* Sidebar - Collapsible & Modern */}
        <aside
          className={cn(
            "fixed lg:sticky lg:top-0 lg:h-screen z-40 bg-card border-r border-border transform transition-all duration-300 ease-in-out flex flex-col overflow-hidden",
            isCollapsed ? "w-16" : "w-56",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* New Entry Button - Always visible at top */}
          <div className={cn("px-2 pb-2 pt-4 lg:pt-2 shrink-0", isCollapsed && "flex justify-center")}>
          <NavLink
            to="/editor/new"
            className={cn(
              "flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-lg font-bold text-xs shadow-md hover:bg-primary/90 transition-all active:scale-95",
              isCollapsed ? "w-10 h-10 px-0" : "w-full px-3 py-2"
            )}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Plus size={isCollapsed ? 20 : 16} strokeWidth={isCollapsed ? 2.5 : 2} />
            {!isCollapsed && <span>New Entry</span>}
          </NavLink>
        </div>

        {/* Navigation - Icons only when collapsed */}
        <nav className={cn("px-2 space-y-1 shrink-0", isCollapsed && "flex flex-col items-center")}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                isActive && "bg-accent text-accent-foreground font-medium",
                isCollapsed && "justify-center w-10 h-10 p-0"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={isCollapsed ? 20 : 16} strokeWidth={isCollapsed ? 2 : 1.5} />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1 min-h-0" />

        {/* Bottom Section - Utility buttons */}
        <div className={cn("p-2 border-t border-border space-y-1 shrink-0", isCollapsed && "flex flex-col items-center")}>
          {/* Settings, Profile & Sync */}
          <div className={cn("flex flex-col gap-2 p-1", isCollapsed && "items-center")}>
            <NavLink 
              to="/settings"
              className={({ isActive }) => cn(
                "flex items-center gap-2 p-1.5 rounded-lg transition-all hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                isActive && "bg-accent text-accent-foreground",
                isCollapsed ? "justify-center w-10 h-10" : "w-full"
              )}
              title="Settings"
            >
              <Settings size={isCollapsed ? 20 : 16} />
              {!isCollapsed && <span className="text-xs font-bold">Settings</span>}
            </NavLink>

            <div className={cn(
              "flex items-center gap-2 p-1.5 rounded-lg bg-muted/50 border border-border",
              isCollapsed ? "flex-col justify-center w-12 py-3" : "w-full justify-between"
            )}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary font-black text-[10px]">
                  {user ? user.name.charAt(0) : '?'}
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-foreground leading-tight truncate max-w-[80px]">
                      {user ? user.name.split(' ')[0] : 'Guest'}
                    </span>
                    <span className="text-[8px] text-muted-foreground font-bold">{isLoggedIn ? 'Online' : 'Offline'}</span>
                  </div>
                )}
              </div>
              
              <button 
                onClick={sync}
                disabled={status === 'syncing'}
                className={cn(
                  "flex items-center justify-center rounded-md transition-all duration-300",
                  isCollapsed ? "w-8 h-8" : "w-7 h-7",
                  status === 'syncing' ? "bg-primary/10 text-primary" : 
                  status === 'success' ? "bg-green-500/10 text-green-500" :
                  status === 'error' ? "bg-destructive/10 text-destructive" :
                  "bg-background text-muted-foreground shadow-sm border border-border"
                )}
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
          <div className={cn("flex gap-1", isCollapsed && "flex-col items-center")}>
            <Button
              variant="secondary"
              size="sm"
              onClick={exportToFile}
              disabled={isExporting}
              className={cn("text-[9px] h-8", isCollapsed ? "w-8 p-0" : "flex-1")}
              title="Export"
            >
              <Download size={isCollapsed ? 14 : 10} />
              {!isCollapsed && <span>{isExporting ? '...' : 'Export'}</span>}
            </Button>
            <label className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 h-8 text-[9px] cursor-pointer",
              isCollapsed ? "w-8 p-0" : "flex-1 px-3"
            )} title="Import">
              <Upload size={isCollapsed ? 14 : 10} />
              {!isCollapsed && <span className="ml-1">{isImporting ? '...' : 'Import'}</span>}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className={cn("w-full text-[9px] text-muted-foreground", isCollapsed ? "w-8 h-8 p-0" : "")}
            title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
          >
            {theme === 'dark' ? <Sun size={isCollapsed ? 16 : 10} /> : <Moon size={isCollapsed ? 16 : 10} />}
            {!isCollapsed && <span className="ml-1">{theme === 'dark' ? 'Light' : 'Dark'}</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto bg-background">
        {/* Top Header Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <PanelLeft size={18} />
            </Button>
            <div className="w-px h-4 bg-border hidden lg:block" />
          </div>
          <div className="flex items-center gap-3">
            <NavLink 
              to="/search"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search size={18} />
            </NavLink>
            <button 
              onClick={sync}
              disabled={status === 'syncing'}
              className={cn(
                "flex items-center justify-center rounded-full transition-all duration-300 w-8 h-8",
                status === 'syncing' ? "bg-primary/10 text-primary" : 
                status === 'success' ? "bg-green-500/10 text-green-500" :
                status === 'error' ? "bg-destructive/10 text-destructive" :
                "bg-muted text-muted-foreground hover:text-foreground"
              )}
              title={status === 'syncing' ? 'Syncing...' : 'Sync to Cloud'}
            >
              {status === 'syncing' ? <RefreshCw size={16} className="animate-spin" /> :
               status === 'success' ? <Check size={16} /> :
               status === 'error' ? <AlertCircle size={16} /> :
               <RefreshCw size={16} />}
            </button>
          </div>
        </div>

        <div className={cn(isEditorPage ? "max-w-4xl mx-auto" : "p-4", "pb-20")}>
          {children}
        </div>
      </main>
    </div>
  );
};
