import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Palette,
  ShieldCheck,
  RefreshCw,
  Bell,
  Lock,
  Download,
  Trash2,
  Settings as SettingsIcon,
  DownloadCloud,
  CloudOff,
  ChevronRight,
  Check,
  HelpCircle,
  Send,
  Bot,
  MessageCircle,
  Eye,
  Ghost,
  X
} from 'lucide-react';
import { useDataExport } from '../hooks/useDatabase';
import { useSync } from '../hooks/useSync';
import { useSecurity } from '../contexts/SecurityContext';
import { db } from '../db';

type SettingsTab = 'profile' | 'appearance' | 'privacy' | 'sync' | 'reminders' | 'help';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: number;
}

export const SettingsPage: React.FC = () => {
  const { exportToFile } = useDataExport();
  const { status, isLoggedIn, user, errorMsg, sync, restore, logout } = useSync();
  const { setupPassword, isGhostMode, isGhostSetupRequired, setupGhostPassphrase, unlockGhostMode, lockGhostMode } = useSecurity();
  const [activeTab, setActiveTab] = useState<SettingsTab>('privacy');
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(true);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'bot', text: "Hello! I'm the Ghost assistant. How can I help you today?", timestamp: Date.now() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isGhostModalOpen, setIsGhostModalOpen] = useState(false);
  const [ghostMode, setGhostMode] = useState<'locked' | 'unlocked' | 'setup'>('locked');
  const [ghostPassphrase, setGhostPassphrase] = useState('');
  const [ghostConfirmPassphrase, setGhostConfirmPassphrase] = useState('');
  const [ghostError, setGhostError] = useState('');
  const [ghostProcessing, setGhostProcessing] = useState(false);

  useEffect(() => {
    if (isGhostMode) {
      setGhostMode('unlocked');
    } else if (isGhostSetupRequired) {
      setGhostMode('setup');
    } else {
      setGhostMode('locked');
    }
  }, [isGhostMode, isGhostSetupRequired]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

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

  const handleGhostCommand = async () => {
    setIsGhostModalOpen(true);
    setGhostError('');
    setGhostPassphrase('');
    setGhostConfirmPassphrase('');
  };

  const handleGhostSubmit = async () => {
    setGhostError('');
    setGhostProcessing(true);

    try {
      if (ghostMode === 'setup') {
        if (ghostPassphrase.length < 4) {
          setGhostError('Passphrase must be at least 4 characters');
          setGhostProcessing(false);
          return;
        }
        if (ghostPassphrase !== ghostConfirmPassphrase) {
          setGhostError('Passphrases do not match');
          setGhostProcessing(false);
          return;
        }
        await setupGhostPassphrase(ghostPassphrase);
        await convertAllEntriesToGhost();
      } else {
        const success = await unlockGhostMode(ghostPassphrase);
        if (!success) {
          setGhostError('Incorrect passphrase');
          setGhostProcessing(false);
          return;
        }
      }
      setIsGhostModalOpen(false);
      setGhostPassphrase('');
      setGhostConfirmPassphrase('');
    } catch (e) {
      setGhostError('An error occurred. Please try again.');
    }
    setGhostProcessing(false);
  };

  const convertAllEntriesToGhost = async () => {
    try {
      await db.entries.where('isHidden').equals(0).modify({ isHidden: true });
    } catch (e) {
      console.error('Failed to convert entries to ghost:', e);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: chatInput.trim(),
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    if (userMessage.text.toLowerCase() === '/ghost') {
      handleGhostCommand();
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: 'I\'ve opened the Ghost Mode panel. Enter your secret passphrase to unlock hidden entries, or set up a new one.',
        timestamp: Date.now()
      };
      setTimeout(() => {
        setChatMessages(prev => [...prev, botResponse]);
      }, 500);
      return;
    }

    setTimeout(() => {
      const botResponses: Record<string, string> = {
        'encryption': 'Great question! End-to-end encryption is enabled by default. Your journal entries are encrypted on your device using AES-256 encryption before being synced to Google Drive.',
        'export': 'Yes! Go to Privacy & Security settings and tap on "Export Journals" to download your data in PDF or JSON format.',
        'backup': 'Your journal is automatically backed up to your Google Drive account. You can restore it anytime from the Sync settings.',
        'password': 'You can change your app password in the Privacy & Security section. Your password is stored locally and never sent to any server.',
        'privacy': 'Ghost uses end-to-end encryption and stores all data locally on your device. We prioritize your privacy above all else.',
        'default': 'I\'m not sure about that. You can try asking about encryption, export, backup, password, or privacy!'
      };

      const lowerText = userMessage.text.toLowerCase();
      let response = botResponses['default'];

      if (lowerText.includes('encrypt') || lowerText.includes('security')) {
        response = botResponses['encryption'];
      } else if (lowerText.includes('export') || lowerText.includes('download')) {
        response = botResponses['export'];
      } else if (lowerText.includes('backup') || lowerText.includes('sync')) {
        response = botResponses['backup'];
      } else if (lowerText.includes('password') || lowerText.includes('pin')) {
        response = botResponses['password'];
      } else if (lowerText.includes('privacy') || lowerText.includes('safe')) {
        response = botResponses['privacy'];
      }

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: response,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, botMessage]);
    }, 800);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
    { id: 'sync', label: 'Sync', icon: RefreshCw },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
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
          
          <div className="mt-12 p-4 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-500 font-black text-xs relative">
                {user ? user.name.charAt(0) : '?'}
                {isGhostMode && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <Ghost size={10} className="text-white" />
                  </div>
                )}
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
              {activeTab === 'help' && 'Get help and support with using Ghost journal.'}
            </p>
          </div>

          <div className="space-y-12">
            {activeTab === 'privacy' && (
              <>
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Access Control</h3>
                  <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="p-6 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-500">
                           <ShieldCheck size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">End-to-End Encryption</p>
                          <p className="text-xs text-gray-500 mt-0.5">Journal entries are encrypted on your device. Only you hold the keys.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsEncryptionEnabled(!isEncryptionEnabled)}
                        className={`w-12 h-6 rounded-full transition-all relative ${isEncryptionEnabled ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-800'}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isEncryptionEnabled ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

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

                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Ghost Mode</h3>
                  <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="p-6 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isGhostMode ? 'bg-green-100 dark:bg-green-900/30 text-green-500' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'}`}>
                           {isGhostMode ? <Eye size={20} /> : <Ghost size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Ghost Mode</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {isGhostMode 
                              ? 'Hidden entries are visible. Type /ghost in help to hide them again.' 
                              : 'All entries are hidden. Enter passphrase to reveal.'}
                          </p>
                        </div>
                      </div>
                      {isGhostMode && (
                        <button 
                          onClick={lockGhostMode}
                          className="text-xs font-bold text-red-500 hover:text-red-600"
                        >
                          Lock Now
                        </button>
                      )}
                    </div>

                    <div className="p-6">
                      <button 
                        onClick={handleGhostCommand}
                        className="w-full py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl transition-all"
                      >
                        {ghostMode === 'setup' ? 'Set Up Ghost Mode' : ghostMode === 'unlocked' ? 'Manage Ghost Mode' : 'Unlock Ghost Mode'}
                      </button>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Data Management</h3>
                  <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
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

            {activeTab === 'help' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-gray-50 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Bot size={18} className="text-primary-500" />
                      Ghost AI Assistant
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Ask me anything about using Ghost journal. Type <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium">/ghost</kbd> to access hidden entries.</p>
                  </div>
                  
                  <div className="h-96 flex flex-col">
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                      {chatMessages.map((message) => (
                        <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'bot' ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
                            {message.role === 'bot' ? <Bot size={16} className="text-primary-500" /> : <span className="text-xs font-bold text-gray-600 dark:text-gray-300">You</span>}
                          </div>
                          <div className={`rounded-2xl px-4 py-3 max-w-[80%] ${message.role === 'user' ? 'bg-primary-500 text-white rounded-tr-none' : 'bg-gray-50 dark:bg-gray-800 rounded-tl-none'}`}>
                            <p className="text-xs">{message.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-50 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type your question or /ghost..."
                          className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button type="submit" className="p-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors">
                          <Send size={16} />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a href="#" className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 hover:border-primary-500/30 transition-colors group">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform">
                        <MessageCircle size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">FAQ</p>
                        <p className="text-xs text-gray-500 mt-0.5">Browse frequently asked questions</p>
                      </div>
                    </div>
                  </a>
                  
                  <a href="#" className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 hover:border-primary-500/30 transition-colors group">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform">
                        <HelpCircle size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Documentation</p>
                        <p className="text-xs text-gray-500 mt-0.5">Read the full user guide</p>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            )}

            <div className="pt-12 text-center">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Ghost Protocol V2.4.1</p>
               <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                 Your encryption keys are managed locally. We never store your passwords or keys on our servers.
               </p>
            </div>
          </div>
        </main>
      </div>

      {isGhostModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl overflow-hidden">
            <button 
              onClick={() => setIsGhostModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
            
            <div className="p-8 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-[2rem] flex items-center justify-center ${ghostMode === 'unlocked' ? 'bg-green-100 dark:bg-green-900/30 text-green-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                {ghostMode === 'unlocked' ? <Eye size={28} strokeWidth={2.5} /> : <Ghost size={28} strokeWidth={2.5} />}
              </div>
              
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                {ghostMode === 'setup' ? 'Set Up Ghost Mode' : ghostMode === 'unlocked' ? 'Ghost Mode Active' : 'Unlock Ghost Mode'}
              </h2>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {ghostMode === 'setup' 
                  ? 'Create a secret passphrase to hide all your entries. You\'ll need this to access them later.'
                  : ghostMode === 'unlocked'
                  ? 'Your hidden entries are now visible. They will be hidden again when Ghost Mode locks.'
                  : 'Enter your secret passphrase to reveal hidden entries.'}
              </p>

              {ghostError && (
                <p className="text-red-500 text-xs font-bold mb-4 animate-pulse">{ghostError}</p>
              )}

              <div className="space-y-4">
                <input
                  type="password"
                  value={ghostPassphrase}
                  onChange={(e) => setGhostPassphrase(e.target.value)}
                  placeholder={ghostMode === 'setup' ? 'Create Passphrase' : 'Enter Passphrase'}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold text-center"
                />
                
                {ghostMode === 'setup' && (
                  <input
                    type="password"
                    value={ghostConfirmPassphrase}
                    onChange={(e) => setGhostConfirmPassphrase(e.target.value)}
                    placeholder="Confirm Passphrase"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold text-center"
                  />
                )}

                <button
                  onClick={handleGhostSubmit}
                  disabled={ghostProcessing}
                  className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold rounded-xl transition-all active:scale-95"
                >
                  {ghostProcessing ? 'Processing...' : ghostMode === 'setup' ? 'Hide All Entries' : 'Unlock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
