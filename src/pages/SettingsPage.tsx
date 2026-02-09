import { useState } from 'react';
import {
  User,
  Palette,
  ShieldCheck,
  RefreshCw,
  Bell,
  Lock,
  AlertCircle,
  Download, 
  Trash2, 
  Settings as SettingsIcon,
  DownloadCloud,
  CloudOff,
  ChevronRight,
  LogOut,
  Check
} from 'lucide-react';
import { useTheme } from '../hooks/useUI';
import { useDataExport } from '../hooks/useDatabase';
import { useSync } from '../hooks/useSync';
import { useSecurity } from '../contexts/SecurityContext';

type SettingsTab = 'profile' | 'appearance' | 'privacy' | 'sync' | 'reminders';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { exportToFile, isExporting } = useDataExport();
  const { status, isLoggedIn, user, errorMsg, sync, restore, logout, setErrorMsg } = useSync();
  const { setupPassword } = useSecurity();
  const [activeTab, setActiveTab] = useState<SettingsTab>('privacy');
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(true);

  const handleChangePassword = async () => {
    const newPass = prompt('Enter new password:');
    if (newPass && newPass.length >= 4) {
      const confirmPass = prompt('Confirm new password:');
      if (newPass === confirmPass) {
        await setupPassword(newPass);
        alert('Password updated successfully!');
      } else {
        alert('Passwords do not match.');
      }
    } else if (newPass) {
        alert('Password must be at least 4 characters.');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
    { id: 'sync', label: 'Sync', icon: RefreshCw },
    { id: 'reminders', label: 'Reminders', icon: Bell },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-8 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary-50 text-primary-500 dark:bg-primary-500/10' 
                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          
          {/* User Profile Summary (Bottom Sidebar) */}
          <div className="mt-12 p-4 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-500 font-black text-xs">
                {user ? user.name.charAt(0) : '?'}
              </div>
              <div>
                 <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                   {user ? user.name : 'Guest User'}
                 </p>
                 <p className="text-[10px] text-gray-500 font-medium">
                   {isLoggedIn ? (status === 'syncing' ? 'Syncing...' : 'Cloud Connected') : 'Offline Mode'}
                 </p>
              </div>
            </div>
            {!isLoggedIn ? (
              <button 
                onClick={sync}
                className="w-full py-2.5 bg-primary-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary-500/25 hover:bg-primary-600 transition-all active:scale-95"
              >
                Sign in with Google
              </button>
            ) : (
              <button 
                onClick={logout}
                className="w-full py-2.5 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                Sign Out
              </button>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {activeTab === 'privacy' && 'Your journals are personal. Control how they are encrypted and who can access them.'}
              {activeTab === 'profile' && 'Manage your personal information and public profile.'}
              {activeTab === 'sync' && 'Sync your journal data across all your devices securely.'}
              {activeTab === 'appearance' && 'Customize how Ghost looks and feels on your device.'}
            </p>
          </div>

          <div className="space-y-12">
            {activeTab === 'privacy' && (
              <>
                {/* Access Control */}
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Access Control</h3>
                  <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                    {/* Encryption Toggle */}
                    <div className="p-6 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-500">
                           <ShieldCheck size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">End-to-End Encryption</p>
                          <p className="text-xs text-gray-500 mt-0.5">Journal entries are encrypted on your device. Only you hold the keys. <button className="text-primary-500 font-bold hover:underline">Learn more</button></p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsEncryptionEnabled(!isEncryptionEnabled)}
                        className={`w-12 h-6 rounded-full transition-all relative ${isEncryptionEnabled ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-800'}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isEncryptionEnabled ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    {/* Passcode Lock */}
                    <div className="p-6 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                           <Lock size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Passcode Lock</p>
                          <p className="text-xs text-gray-500 mt-0.5">Require a 6-digit PIN to open the application.</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleChangePassword}
                        className="text-xs font-bold text-primary-500 hover:text-primary-600"
                      >
                        Change PIN
                      </button>
                    </div>

                    {/* Biometric */}
                    <div className="p-6 flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                           <SettingsIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Biometric Unlock</p>
                          <p className="text-xs text-gray-500 mt-0.5">Use Touch ID or Face ID for faster entry.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsBiometricEnabled(!isBiometricEnabled)}
                        className={`w-12 h-6 rounded-full transition-all relative ${isBiometricEnabled ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-800'}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isBiometricEnabled ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </section>

                {/* Data Management */}
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Data Management</h3>
                  <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                    {/* Export */}
                    <button 
                      onClick={exportToFile}
                      className="w-full p-6 flex items-center justify-between border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 group transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                           <Download size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Export Journals</p>
                          <p className="text-xs text-gray-500 mt-0.5">Download your entries in PDF or JSON format.</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
                    </button>

                    {/* Clear Data */}
                    <button className="w-full p-6 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-900/10 group transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                           <Trash2 size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-red-600">Clear All Local Data</p>
                          <p className="text-xs text-gray-500 mt-0.5">Wipe the local database from this browser.</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                </section>
              </>
            )}

            {activeTab === 'sync' && (
              <div className="space-y-8">
                {/* Sync Status Card */}
                <div className={`rounded-[2.5rem] p-8 text-white shadow-xl transition-all duration-500 relative overflow-hidden ${
                  status === 'success' ? 'bg-gradient-to-br from-green-500 to-green-700 shadow-green-500/20' :
                  status === 'error' ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/20' :
                  'bg-gradient-to-br from-primary-500 to-primary-700 shadow-primary-500/20'
                }`}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Cloud Sync</p>
                        <h2 className="text-3xl font-black italic">
                          {!isLoggedIn ? 'Backup to Drive' : 
                           status === 'syncing' ? 'Syncing...' :
                           status === 'success' ? 'Sync Complete' : 'Connected'}
                        </h2>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                        {status === 'syncing' ? <RefreshCw size={24} className="animate-spin" /> :
                         status === 'success' ? <Check size={24} /> :
                         <RefreshCw size={24} />}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                        {user ? user.name.charAt(0) : '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{user ? user.email : 'Not signed in'}</p>
                        <p className="text-xs text-white/70">
                          {status === 'success' ? 'Last synced: Just now' : 
                           status === 'error' ? `Error: ${errorMsg}` : 
                           'Keep your journals safe in the cloud'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end mb-4">
                      {isLoggedIn && (
                        <button 
                          onClick={logout}
                          className="px-4 py-2 text-sm font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                        >
                          Sign Out
                        </button>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={sync} 
                        disabled={status === 'syncing'}
                        className="flex-1 py-3 bg-white text-primary-600 rounded-2xl font-black text-sm hover:bg-primary-50 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={18} className={status === 'syncing' ? 'animate-spin' : ''} />
                        {status === 'syncing' ? 'Please wait...' : (!isLoggedIn ? 'Sign in with Google' : 'Sync Now')}
                      </button>
                      
                      {isLoggedIn && (
                        <button 
                          onClick={restore} 
                          disabled={status === 'syncing'}
                          className="flex-1 py-3 bg-white/20 text-white rounded-2xl font-bold text-sm hover:bg-white/30 transition-all backdrop-blur-md flex items-center justify-center gap-2"
                        >
                          <DownloadCloud size={18} />
                          Restore
                        </button>
                      )}
                    </div>
                    
                    {errorMsg && (
                      <div className="mt-4 p-3 bg-white/20 rounded-xl text-xs font-bold flex items-center gap-2">
                        <CloudOff size={14} />
                        {errorMsg}
                      </div>
                    )}
                  </div>
                </div>

                {/* Storage Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Privacy Note</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      All data is encrypted with AES-256 before leaving your device. Even Google cannot read your journal contents.
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sync Status</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 font-medium">Automatic backup enabled</p>
                      <div className={`w-3 h-3 rounded-full ${isLoggedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Protocol Footer */}
            <div className="pt-12 text-center">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Ghost Protocol V2.4.1</p>
               <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                 Your encryption keys are managed locally. We never store your passwords or keys on our servers.
               </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
