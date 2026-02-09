import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ArrowRight } from 'lucide-react';
import { useSecurity } from '../contexts/SecurityContext';

export const AppLock: React.FC = () => {
  const { isLocked, isSetupRequired, unlock, setupPassword, isLoading } = useSecurity();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  // Clear password when locked state changes
  useEffect(() => {
    if (isLocked) {
      setPassword('');
      setError('');
    }
  }, [isLocked]);

  if (!isLocked && !isSetupRequired) return null;
  if (isLoading) return null; // Or a loading spinner

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSetupRequired) {
      if (password.length < 4) {
        setError('Password must be at least 4 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      await setupPassword(password);
    } else {
      const success = await unlock(password);
      if (!success) {
        setError('Incorrect password');
        shakeInput();
      }
    }
  };

  const shakeInput = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
       <div className="w-full max-w-sm text-center">
         <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 rounded-[2rem] bg-primary-500 shadow-2xl shadow-primary-500/40 flex items-center justify-center text-white">
               {isSetupRequired ? <Unlock size={32} strokeWidth={2.5} /> : <Lock size={32} strokeWidth={2.5} />}
            </div>
         </div>
         
         <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
            {isSetupRequired ? 'Create Password' : 'Welcome Back'}
         </h1>
         <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
            {isSetupRequired 
              ? 'Secure your journal with a password. This will be synced to your Google account.' 
              : 'Enter your password to unlock your journal.'}
         </p>

         <form onSubmit={handleSubmit} className={`space-y-4 ${isAnimating ? 'animate-shake' : ''}`}>
           <input
             type="password"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             placeholder={isSetupRequired ? "Create Password" : "Enter Password"}
             className="w-full px-6 py-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold text-center text-lg tracking-widest placeholder:tracking-normal placeholder:font-normal transition-all"
             autoFocus
           />
           
           {isSetupRequired && (
             <input
               type="password"
               value={confirmPassword}
               onChange={(e) => setConfirmPassword(e.target.value)}
               placeholder="Confirm Password"
               className="w-full px-6 py-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold text-center text-lg tracking-widest placeholder:tracking-normal placeholder:font-normal transition-all"
             />
           )}

           {error && (
             <p className="text-red-500 text-sm font-bold animate-pulse">{error}</p>
           )}

           <button
             type="submit"
             className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold shadow-xl shadow-primary-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
           >
             {isSetupRequired ? 'Set Password' : 'Unlock'}
             <ArrowRight size={20} />
           </button>
         </form>
         
         {!isSetupRequired && (
             <button onClick={() => window.location.reload()} className="mt-8 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-bold">
               Forgot Password? (Clears Local Data)
             </button>
         )}
       </div>
    </div>
  );
};
