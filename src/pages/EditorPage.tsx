import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, X, Loader2, CheckCircle, Plus, Calendar, Maximize2 } from 'lucide-react';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { processImage, validateImage } from '../utils/imageUtils';
import { RichTextEditor } from '../components/RichTextEditor';
import { ImageModal } from '../components/ImageModal';
import { JournalDetailsDrawer } from '../components/JournalDetailsDrawer';
import { TagInput } from '../components/TagInput';
import type { JournalEntry } from '../types';

export const EditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const isNew = id === 'new';
  const hasLoaded = useRef(false);
  const [entryId, setEntryId] = useState<string | null>(isNew ? null : id || null);
  
  // Check if date was passed from calendar
  const calendarDate = routerLocation.state?.date;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(() => calendarDate || new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  // Metadata for drawer
  const [mood, setMood] = useState('');
  const [weather, setWeather] = useState('');
  const [device, setDevice] = useState('Windows Device');
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  
  const [isFavorite, setIsFavorite] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing entry on mount
  useEffect(() => {
    const loadEntry = async () => {
      if (!isNew && id && !hasLoaded.current) {
        try {
          const entry = await db.entries.get(id);
          if (entry) {
            setTitle(entry.title || '');
            
            // Migrate Hero Image to Content if it exists
            let initialContent = entry.content || '';
            if (entry.heroImage && !initialContent.includes('img-resize')) {
              initialContent = `<div data-type="imageResize" data-src="${entry.heroImage}" data-width="100%" data-align="center"></div>${initialContent}`;
            }
            setContent(initialContent);
            
            setDate(entry.date);
            setLocation(entry.location || '');
            setTags(entry.tags || []);
            setImages(entry.images || []);
            setMood(entry.mood || '');
            setWeather(entry.weather || '');
            setDevice(entry.device || 'Windows Device');
            setCreatedAt(entry.createdAt);
            setUpdatedAt(entry.updatedAt);
            setIsFavorite(entry.isFavorite || false);
            setEntryId(entry.id);
            hasLoaded.current = true;
            // Set initial saved status
            setLastSaved(new Date(entry.updatedAt || Date.now()));
          }
        } catch (err) {
          console.error('Failed to load entry:', err);
        }
      }
    };
    loadEntry();
  }, [isNew, id]);

  // Save function
  const handleSave = async () => {
    if (!title && !content) return; // Don't save completely empty entries
    
    setIsSaving(true);
    
    try {
      const now = Date.now();
      const entryData = {
        title: title.trim() || 'Untitled Entry',
        content: content.trim() || '<p></p>',
        date,
        location: location.trim() || undefined,
        tags,
        images,
        mood: mood || undefined,
        weather: weather || undefined,
        device,
        isFavorite,
        updatedAt: now
      };

      if (isNew || !entryId) {
        const newId = uuidv4();
        const newEntry = {
          id: newId,
          createdAt: now,
          ...entryData
        };
        
        await db.entries.add(newEntry);
        setEntryId(newId);
        
        // Navigation effectively resets state, so unsaved changes are cleared implicitly by the unmount/remount
        // But if we want smooth experience:
        setTimeout(() => {
          navigate(`/editor/${newId}`, { replace: true });
        }, 100);
      } else {
        const existingEntry = await db.entries.get(entryId);
        if (existingEntry) {
          const updatedEntry = {
            ...existingEntry,
            ...entryData
          };
          await db.entries.put(updatedEntry);
        }
      }
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save every 3 seconds for entries
  useEffect(() => {
    // Skip initial mount or if empty
    if (!title && !content) return;

    setHasUnsavedChanges(true);

    const timeoutId = setTimeout(() => {
      handleSave();
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [title, content, date, location, tags, images, mood, weather, isFavorite]);



  const handleInlineImageUpload = async (file: File): Promise<string> => {
    const validation = validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    return await processImage(file);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const validation = validateImage(file);
      if (!validation.valid) {
        alert(validation.error);
        continue;
      }
      try {
        const base64String = await processImage(file);
        setImages(prev => [...prev, base64String]);
      } catch {
        alert('Failed to upload image');
      }
    }
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleUpdate = (updates: Partial<JournalEntry>) => {
    if (updates.location !== undefined) setLocation(updates.location);
    if (updates.mood !== undefined) setMood(updates.mood);
    if (updates.weather !== undefined) setWeather(updates.weather);
  };

  // Calculate word count
  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="pb-20 relative flex">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="fixed top-20 left-8 p-2 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all z-30"
      >
        <ArrowLeft size={18} />
      </button>

      <div className={`flex-1 transition-all duration-300 ${isDrawerOpen ? 'mr-80' : ''}`}>
        <div className="max-w-screen-md mx-auto px-4 mt-8">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title your day..."
            className="w-full text-4xl font-black bg-transparent border-none outline-none placeholder:text-gray-100 dark:placeholder:text-gray-900 mb-4 text-gray-900 dark:text-white tracking-tight"
          />

          {/* Tags */}
          <div className="mb-6">
            <TagInput tags={tags} onChange={setTags} placeholder="Add tags..." />
          </div>
          
          {/* Meta & Actions */}
          <div className="flex items-center justify-between mb-8 border-b border-gray-50 dark:border-gray-900 pb-4">
            <div className="flex items-center gap-4 text-[10px] font-bold">
              <div className="relative group">
                <button className="flex items-center gap-1.5 text-gray-400 hover:text-primary-500 transition-colors bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-xl">
                  <Calendar size={12} />
                  <span>{format(parseISO(date), 'MMMM d, yyyy')}</span>
                </button>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <div className="text-gray-200 dark:text-gray-800">|</div>
              <div className="flex items-center gap-4 text-gray-400">
                <span>
                  {isSaving ? 'Saving...' : 
                   hasUnsavedChanges ? 'Unsaved changes' : 
                   lastSaved ? `Saved at ${format(new Date(lastSaved), 'h:mm a')}` : 'Ready'}
                </span>
                {wordCount > 0 && <span>{wordCount} words</span>}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 transition-all duration-300">
                {isSaving ? (
                  <>
                    <Loader2 size={10} className="animate-spin text-primary-500" />
                    <span className="text-primary-500 font-medium">Saving...</span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span className="text-gray-400">Unsaved</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <CheckCircle size={10} className="text-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-medium">Saved</span>
                  </>
                ) : null}
              </div>
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${isDrawerOpen ? 'bg-primary-500 text-white' : 'bg-gray-50 dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <span>Details</span>
              </button>
            </div>
          </div>

          {/* Editor */}
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Start writing..."
            onImageUpload={handleInlineImageUpload}
          />
        </div>
      </div>

      <JournalDetailsDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        entry={{
          location,
          mood,
          weather,
          device,
          createdAt: createdAt || undefined,
          updatedAt: updatedAt || undefined,
          images
        }}
        onUpdate={handleUpdate}
      />

      {/* Images Gallery - Integrated Scroll Strip */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 py-3 px-4 z-20">
        <div className="max-w-screen-md mx-auto flex gap-3 overflow-x-auto scrollbar-hide">
          {/* Add Attachment Button */}
          <label className="flex-shrink-0 w-12 h-12 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl flex items-center justify-center cursor-pointer transition-colors border border-dashed border-gray-200 dark:border-gray-700">
            <Plus size={18} className="text-gray-400" />
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleImageUpload} 
              className="hidden" 
            />
          </label>

          {Array.isArray(images) && images.map((image, index) => (
            <div key={index} className="relative flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden group border border-gray-100 dark:border-gray-800 shadow-sm">
              <img 
                src={image} 
                alt="" 
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => {
                  setSelectedImage(image);
                  setIsImageModalOpen(true);
                }}
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(image);
                    setIsImageModalOpen(true);
                  }}
                  className="p-1 hover:text-white text-gray-200 transition-colors"
                >
                  <Maximize2 size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="p-1 hover:text-red-400 text-gray-200 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ImageModal 
        src={selectedImage}
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
      />

    </div>
  );
};
