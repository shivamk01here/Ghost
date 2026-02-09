import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Smartphone, 
  Clock, 
  History, 
  Smile, 
  Cloud, 
  Paperclip,
  Film,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import type { JournalEntry } from '../types';
import { ImageModal } from './ImageModal';

interface JournalDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Partial<JournalEntry>;
  onUpdate: (updates: Partial<JournalEntry>) => void;
}

export const JournalDetailsDrawer: React.FC<JournalDetailsDrawerProps> = ({
  isOpen,
  onClose,
  entry,
  onUpdate
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const moods = [
    { label: 'Happy', emoji: '😊' },
    { label: 'Excited', emoji: '🤩' },
    { label: 'Blessed', emoji: '✨' },
    { label: 'In Love', emoji: '🥰' },
    { label: 'Cool', emoji: '😎' },
    { label: 'Neutral', emoji: '😐' },
    { label: 'Thoughtful', emoji: '🤔' },
    { label: 'Tired', emoji: '😴' },
    { label: 'Anxious', emoji: '😰' },
    { label: 'Sad', emoji: '😢' },
    { label: 'Angry', emoji: '😤' },
    { label: 'Sick', emoji: '🤒' },
  ];

  const weatherIcons = [
    { label: 'Sunny', emoji: '☀️' },
    { label: 'Partly Cloudy', emoji: '⛅' },
    { label: 'Cloudy', emoji: '☁️' },
    { label: 'Rainy', emoji: '🌧️' },
    { label: 'Stormy', emoji: '⛈️' },
    { label: 'Snowy', emoji: '❄️' },
    { label: 'Windy', emoji: '🌬️' },
    { label: 'Foggy', emoji: '🌫️' },
  ];

  return (
    <>
      <aside className={`
        fixed top-0 right-0 h-screen w-80 bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800
        transform transition-transform duration-300 ease-in-out z-50 shadow-2xl
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 dark:border-gray-800">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Details</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 custom-scrollbar">
          {/* Mood Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Smile size={14} className="text-primary-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Your Mood</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {moods.map((m) => (
                <button
                  key={m.label}
                  onClick={() => onUpdate({ mood: m.label })}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-2xl border transition-all
                    ${entry.mood === m.label 
                      ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/20 dark:border-primary-800' 
                      : 'border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}
                  `}
                >
                  <span className="text-xl mb-1">{m.emoji}</span>
                  <span className="text-[9px] font-bold">{m.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Weather Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Cloud size={14} className="text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Weather</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {weatherIcons.map((w) => (
                <button
                  key={w.label}
                  onClick={() => onUpdate({ weather: w.label })}
                  className={`
                    flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border transition-all
                    ${entry.weather === w.label 
                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800' 
                      : 'border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}
                  `}
                  title={w.label}
                >
                  <span className="text-lg">{w.emoji}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Metadata section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <History size={14} className="text-gray-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Log Data</span>
            </div>
            
            <div className="space-y-3">
               <div className="flex items-start gap-3">
                  <MapPin size={14} className="text-gray-300 mt-1" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Location</p>
                    <input 
                      type="text" 
                      value={entry.location || ''} 
                      onChange={(e) => onUpdate({ location: e.target.value })}
                      placeholder="Where are you?"
                      className="w-full bg-transparent border-none outline-none text-xs text-gray-900 dark:text-white p-0"
                    />
                  </div>
               </div>

               <div className="flex items-start gap-3">
                  <Smartphone size={14} className="text-gray-300 mt-1" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Captured on</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{entry.device || 'Windows Device'}</p>
                  </div>
               </div>

               <div className="flex items-start gap-3">
                  <Clock size={14} className="text-gray-300 mt-1" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase">First Edit</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {entry.createdAt ? format(entry.createdAt, 'MMM d, yyyy · h:mm a') : 'Just now'}
                    </p>
                  </div>
               </div>

               <div className="flex items-start gap-3">
                  <History size={14} className="text-gray-300 mt-1" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Latest Update</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {entry.updatedAt ? format(entry.updatedAt, 'MMM d, yyyy · h:mm a') : 'Just now'}
                    </p>
                  </div>
               </div>
            </div>
          </section>

          {/* Attachments Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Paperclip size={14} className="text-gray-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Attachments</span>
            </div>
            
            <div className="space-y-2">
              {Array.isArray(entry.images) && entry.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                   {entry.images.map((img, i) => (
                     <div 
                       key={i} 
                       className="aspect-square rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 cursor-pointer hover:opacity-80 transition-opacity"
                       onClick={() => setSelectedImage(img)}
                     >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                     </div>
                   ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 italic">No attachments added yet.</p>
              )}
              
              <div className="flex flex-col gap-1 mt-4">
                 <button className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
                    <FileText size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">PDF Document</span>
                 </button>
                 <button className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
                    <Film size={14} className="text-purple-400" />
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">Video Attachment</span>
                 </button>
              </div>
            </div>
          </section>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-50 dark:border-gray-800">
          <p className="text-[8px] font-black text-gray-300 uppercase letter tracking-[0.2em] text-center">
            Ghost · Encrypted Session
          </p>
        </div>
      </aside>

      <ImageModal 
        src={selectedImage || ''} 
        isOpen={!!selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
    </>
  );
};
