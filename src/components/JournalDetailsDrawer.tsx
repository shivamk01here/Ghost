import React, { useState } from 'react';
import { 
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

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
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-80 p-0 flex flex-col bg-background border-l border-border">
        <VisuallyHidden.Root>
          <SheetTitle>Entry Details</SheetTitle>
        </VisuallyHidden.Root>

        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border text-left">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Details</h2>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 custom-scrollbar">
          {/* Mood Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Smile size={14} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Your Mood</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {moods.map((m) => (
                <button
                  key={m.label}
                  onClick={() => onUpdate({ mood: m.label })}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all",
                    entry.mood === m.label 
                      ? "bg-primary/10 border-primary/20 text-primary" 
                      : "border-border hover:bg-muted"
                  )}
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
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Weather</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {weatherIcons.map((w) => (
                <button
                  key={w.label}
                  onClick={() => onUpdate({ weather: w.label })}
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border transition-all",
                    entry.weather === w.label 
                      ? "bg-blue-500/10 border-blue-500/20 text-blue-500" 
                      : "border-border hover:bg-muted"
                  )}
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
              <History size={14} className="text-muted-foreground" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Log Data</span>
            </div>
            
            <div className="space-y-3">

               <div className="flex items-start gap-3">
                  <MapPin size={14} className="text-muted-foreground/70 mt-3" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Location</p>
                    <Input 
                      type="text" 
                      value={entry.location || ''} 
                      onChange={(e) => onUpdate({ location: e.target.value })}
                      placeholder="Where are you?"
                      className="h-8 text-xs bg-transparent border-border"
                    />
                  </div>
               </div>

               <div className="flex items-start gap-3">
                  <Smartphone size={14} className="text-muted-foreground/70 mt-1" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-muted-foreground uppercase">Captured on</p>
                    <p className="text-xs text-muted-foreground">{entry.device || 'Windows Device'}</p>
                  </div>
               </div>

               <div className="flex items-start gap-3">
                  <Clock size={14} className="text-muted-foreground/70 mt-1" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-muted-foreground uppercase">First Edit</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.createdAt ? format(entry.createdAt, 'MMM d, yyyy · h:mm a') : 'Just now'}
                    </p>
                  </div>
               </div>

               <div className="flex items-start gap-3">
                  <History size={14} className="text-muted-foreground/70 mt-1" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-muted-foreground uppercase">Latest Update</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.updatedAt ? format(entry.updatedAt, 'MMM d, yyyy · h:mm a') : 'Just now'}
                    </p>
                  </div>
               </div>
            </div>
          </section>

          {/* Attachments Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Paperclip size={14} className="text-muted-foreground" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Attachments</span>
            </div>
            
            <div className="space-y-2">
              {Array.isArray(entry.images) && entry.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                   {entry.images.map((img, i) => (
                     <div 
                       key={i} 
                       className="aspect-square rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
                       onClick={() => setSelectedImage(img)}
                     >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                     </div>
                   ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">No attachments added yet.</p>
              )}
              
              <div className="flex flex-col gap-1 mt-4">
                 <Button variant="ghost" className="justify-start h-auto py-2 px-3 hover:bg-muted w-full">
                    <FileText size={14} className="text-blue-400 mr-2" />
                    <span className="text-[10px] font-bold text-muted-foreground">PDF Document</span>
                 </Button>
                 <Button variant="ghost" className="justify-start h-auto py-2 px-3 hover:bg-muted w-full">
                    <Film size={14} className="text-purple-400 mr-2" />
                    <span className="text-[10px] font-bold text-muted-foreground">Video Attachment</span>
                 </Button>
              </div>
            </div>
          </section>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-border mt-auto">
          <p className="text-[8px] font-black text-muted-foreground/50 uppercase letter tracking-[0.2em] text-center">
            Ghost · Encrypted Session
          </p>
        </div>
      </SheetContent>

      <ImageModal 
        src={selectedImage || ''} 
        isOpen={!!selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
    </Sheet>
  );
};
