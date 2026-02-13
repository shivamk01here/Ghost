import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useSecurity } from '../contexts/SecurityContext';

export const AppLock: React.FC = () => {
  const { isLocked, isSetupRequired, unlock, setupPassword, isLoading } = useSecurity();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Clear password when locked state changes
  useEffect(() => {
    if (isLocked) {
      setPassword('');
      setError('');
    }
  }, [isLocked]);

  if (!isLocked && !isSetupRequired) return null;
  if (isLoading) return null;

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
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
       <div className="w-full max-w-sm text-center">
         <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 rounded-[2rem] bg-primary text-primary-foreground shadow-2xl flex items-center justify-center">
               {isSetupRequired ? <Unlock size={32} strokeWidth={2.5} /> : <Lock size={32} strokeWidth={2.5} />}
            </div>
         </div>
         
         <h1 className="text-3xl font-black text-foreground mb-2">
            {isSetupRequired ? 'Create Password' : 'Welcome Back'}
         </h1>
         <p className="text-muted-foreground mb-8 font-medium">
            {isSetupRequired 
              ? 'Secure your journal with a password.' 
              : 'Enter your password to unlock your journal.'}
         </p>

         <form onSubmit={handleSubmit} className={`space-y-4 ${isAnimating ? 'animate-shake' : ''}`}>
           <div className="relative">
             <input
               type={showPassword ? "text" : "password"}
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               placeholder={isSetupRequired ? "Create Password" : "Enter Password"}
               className="w-full px-6 py-4 rounded-xl bg-muted/50 border border-input focus:outline-none focus:ring-2 focus:ring-ring font-bold text-center text-lg tracking-widest placeholder:tracking-normal placeholder:font-normal transition-all text-foreground"
               autoFocus
             />
             <button
               type="button"
               onClick={() => setShowPassword(!showPassword)}
               className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
             >
               {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
             </button>
           </div>
           
           {isSetupRequired && (
             <div className="relative">
               <input
                 type={showPassword ? "text" : "password"}
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
                 placeholder="Confirm Password"
                 className="w-full px-6 py-4 rounded-xl bg-muted/50 border border-input focus:outline-none focus:ring-2 focus:ring-ring font-bold text-center text-lg tracking-widest placeholder:tracking-normal placeholder:font-normal transition-all text-foreground"
               />
             </div>
           )}

           {error && (
             <p className="text-destructive text-sm font-bold animate-pulse">{error}</p>
           )}

           <button
             type="submit"
             className="w-full py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
           >
             {isSetupRequired ? 'Set Password' : 'Unlock'}
             <ArrowRight size={20} />
           </button>
         </form>
         
         {!isSetupRequired && (
             <button onClick={() => window.location.reload()} className="mt-8 text-xs text-muted-foreground hover:text-foreground font-bold">
               Forgot Password? (Clears Local Data)
             </button>
         )}
       </div>
    </div>
  );
};
