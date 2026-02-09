import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon } from 'lucide-react';
import { useEntries } from '../hooks/useDatabase';
import { getCalendarDays } from '../utils/dateUtils';

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
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            {format(currentDate, 'MMMM yyyy')}
          </h1>
          <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5">
            <button
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goToToday}
              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider hover:bg-white dark:hover:bg-gray-800 rounded-md transition-all"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5">
          {['Week', 'Month', 'Year'].map((view) => (
            <button
              key={view}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                view === 'Month' 
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white' 
                  : 'text-gray-400 dark:text-gray-600 hover:text-gray-600'
              }`}
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
            className="text-center text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-900 border border-gray-100 dark:border-gray-900 rounded-2xl overflow-hidden shadow-xl">
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
              className={`relative aspect-[4/5] bg-white dark:bg-black p-1.5 transition-all ${
                day === null ? 'opacity-50' : 'hover:z-10 hover:shadow-2xl'
              }`}
            >
              {day !== null && (
                <button
                  onClick={() => handleDateClick(day)}
                  className="w-full h-full flex flex-col items-start gap-0.5"
                >
                  <div className="flex items-center justify-between w-full mb-0.5">
                    <span className={`text-xs font-bold ${
                      isToday 
                        ? 'w-6 h-6 flex items-center justify-center bg-primary-500 text-white rounded-full' 
                        : isSelected 
                        ? 'text-primary-500' 
                        : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      {day}
                    </span>
                    {hasEntry && !entryWithImage && (
                      <div className="w-1 h-1 rounded-full bg-primary-500" />
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
                      <span className="text-[9px] font-bold text-primary-500 uppercase tracking-wider">Today</span>
                    </div>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Day Entries Modal */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity" 
            onClick={() => setIsModalOpen(false)}
          />
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                  {format(parseISO(selectedDate), 'EEEE')}
                </h3>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {format(parseISO(selectedDate), 'MMMM d, yyyy')}
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/editor/new', { state: { date: selectedDate } })}
                  className="px-4 py-2 bg-primary-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all active:scale-95"
                >
                  <Plus size={16} />
                  <span>New Entry</span>
                </button>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Timeline List */}
            <div className="max-h-[500px] overflow-y-auto p-6 space-y-8 relative">
              {/* Timeline Connector Line */}
              {selectedDateEntries.length > 1 && (
                <div className="absolute left-[84px] top-10 bottom-10 w-px bg-gray-100 dark:bg-gray-800" />
              )}

              {selectedDateEntries.length > 0 ? (
                selectedDateEntries.map((entry, index) => {
                  const entryDate = new Date(entry.createdAt);
                  const contentSnippet = entry.content.replace(/<[^>]*>/g, '').substring(0, 100);

                  return (
                    <button
                      key={entry.id}
                      onClick={() => navigate(`/editor/${entry.id}`)}
                      className="w-full flex items-start gap-6 group relative"
                    >
                      {/* Left Column: Date/Time */}
                      <div className="w-20 flex-shrink-0 text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {format(entryDate, 'EEEE')}
                        </p>
                        <p className="text-xl font-black text-gray-900 dark:text-white leading-none mb-1">
                          {format(entryDate, 'MMM d')}
                        </p>
                        <p className="text-[10px] font-bold text-gray-300 dark:text-gray-600">
                          {format(entryDate, 'hh:mm a')}
                        </p>
                      </div>

                      {/* Timeline Dot */}
                      <div className="relative z-10 flex flex-col items-center pt-2">
                        <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm transition-all ${index === 0 ? 'bg-primary-500 scale-125' : 'bg-gray-200 dark:bg-gray-700'}`} />
                      </div>

                      {/* Center Column: Content */}
                      <div className="flex-1 text-left min-w-0 pt-0.5">
                        <h4 className="text-base font-bold text-gray-800 dark:text-gray-100 group-hover:text-primary-500 transition-colors line-clamp-2">
                          {contentSnippet || 'No content...'}
                        </h4>
                        
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {entry.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-[9px] font-bold text-gray-400 rounded-md uppercase tracking-wider">
                                #{tag}
                              </span>
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
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-200 dark:text-gray-700">
                    <CalendarIcon size={32} />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">No entries for this date. Start your journey!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
