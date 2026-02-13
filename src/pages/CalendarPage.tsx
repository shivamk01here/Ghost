import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { useEntries } from '../hooks/useDatabase';
import { getCalendarDays } from '../utils/dateUtils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { entries } = useEntries();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const calendarDays = getCalendarDays(year, month);

  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(format(today, 'yyyy-MM-dd'));
  };

  const handleDateClick = (day: number | null) => {
    if (day) {
      const dateString = format(new Date(year, month - 1, day), 'yyyy-MM-dd');
      setSelectedDate(dateString);
      setIsModalOpen(true);
    }
  };

  const selectedDateEntries = entries.filter(e => e.date === selectedDate);

  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-foreground">
            {format(currentDate, 'MMMM yyyy')}
          </h1>
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousMonth}
              className="h-7 w-7"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="h-7 text-[10px] font-bold uppercase tracking-wider"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              className="h-7 w-7"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        <div className="flex items-center bg-muted rounded-lg p-0.5">
          {['Week', 'Month', 'Year'].map((view) => (
            <button
              key={view}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                view === 'Month' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-px mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-muted border border-border rounded-2xl overflow-hidden shadow-xl">
        {calendarDays.map((day, index) => {
          const dayDate = day ? new Date(year, month - 1, day) : null;
          const isToday = dayDate && isSameDay(dayDate, new Date());
          const dateString = dayDate ? format(dayDate, 'yyyy-MM-dd') : null;
          const isSelected = selectedDate === dateString;
          const dayEntries = entries.filter(e => e.date === dateString);
          const hasEntry = dayEntries.length > 0;
          const entryWithImage = dayEntries.find(e => e.heroImage || (e.images && e.images.length > 0));

          return (
            <div
              key={index}
              className={cn(
                "relative aspect-[4/5] bg-background p-1.5 transition-all",
                day === null ? "opacity-50" : "hover:z-10 hover:shadow-2xl"
              )}
            >
              {day !== null && (
                <button
                  onClick={() => handleDateClick(day)}
                  className="w-full h-full flex flex-col items-start gap-0.5"
                >
                  <div className="flex items-center justify-between w-full mb-0.5">
                    <span className={cn(
                      "text-xs font-bold",
                      isToday 
                        ? "w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground rounded-full" 
                        : isSelected 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    )}>
                      {day}
                    </span>
                    {hasEntry && !entryWithImage && (
                      <div className="w-1 h-1 rounded-full bg-primary" />
                    )}
                  </div>
                  
                  {entryWithImage && (
                    <div className="flex-1 w-full rounded-xl overflow-hidden mb-0.5 shadow-sm">
                      <img 
                        src={entryWithImage.heroImage || entryWithImage.images?.[0]} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {isToday && (
                    <div className="mt-auto">
                      <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Today</span>
                    </div>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Day Entries Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border">
          <VisuallyHidden.Root>
            <DialogTitle>
              Entries for {selectedDate ? format(parseISO(selectedDate), 'MMMM d, yyyy') : 'Selected Date'}
            </DialogTitle>
          </VisuallyHidden.Root>
          
          {selectedDate && (
            <div className="flex flex-col h-full max-h-[85vh]">
              {/* Modal Header */}
              <div className="p-6 flex items-center justify-between border-b border-border">
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                    {format(parseISO(selectedDate), 'EEEE')}
                  </h3>
                  <h2 className="text-2xl font-extrabold text-foreground">
                    {format(parseISO(selectedDate), 'MMMM d, yyyy')}
                  </h2>
                </div>
                
                <Button
                  onClick={() => {
                    navigate('/editor/new', { state: { date: selectedDate } });
                    setIsModalOpen(false);
                  }}
                  className="shadow-lg"
                >
                  <Plus size={16} className="mr-2" />
                  New Entry
                </Button>
              </div>

              {/* Timeline List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 relative">
                {/* Timeline Connector Line */}
                {selectedDateEntries.length > 1 && (
                  <div className="absolute left-[84px] top-10 bottom-10 w-px bg-border" />
                )}

                {selectedDateEntries.length > 0 ? (
                  selectedDateEntries.map((entry, index) => {
                    const entryDate = new Date(entry.createdAt);
                    const contentSnippet = entry.content.replace(/<[^>]*>/g, '').substring(0, 100);

                    return (
                      <button
                        key={entry.id}
                        onClick={() => {
                          navigate(`/editor/${entry.id}`);
                          setIsModalOpen(false);
                        }}
                        className="w-full flex items-start gap-6 group relative"
                      >
                        {/* Left Column: Date/Time */}
                        <div className="w-20 flex-shrink-0 text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                            {format(entryDate, 'EEEE')}
                          </p>
                          <p className="text-xl font-black text-foreground leading-none mb-1">
                            {format(entryDate, 'MMM d')}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground/70">
                            {format(entryDate, 'hh:mm a')}
                          </p>
                        </div>

                        {/* Timeline Dot */}
                        <div className="relative z-10 flex flex-col items-center pt-2">
                          <div className={cn(
                            "w-3 h-3 rounded-full border-2 border-background shadow-sm transition-all",
                            index === 0 ? "bg-primary scale-125" : "bg-muted-foreground/30"
                          )} />
                        </div>

                        {/* Center Column: Content */}
                        <div className="flex-1 text-left min-w-0 pt-0.5">
                          <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {contentSnippet || 'No content...'}
                          </h4>
                          
                          {entry.tags && entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {entry.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-[9px] font-bold rounded-md uppercase tracking-wider">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Right Column: Image */}
                        {(entry.heroImage || entry.images?.[0]) && (
                          <div className="w-24 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-md transform group-hover:scale-105 transition-all">
                            <img 
                              src={entry.heroImage || entry.images?.[0]} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="py-20 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                      <CalendarIcon size={32} />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No entries for this date. Start your journey!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
