import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { ImageResize } from './tiptap/ImageResize';
import { ImageGrid } from './tiptap/ImageGrid';
import { Columns } from './tiptap/Columns';
import { Column } from './tiptap/Column';
import { SlashCommands } from './tiptap/SlashCommands';
import { suggestion } from './tiptap/slashSuggestion';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Link as LinkIcon,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Type '/' for commands...",
  onImageUpload
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-500 underline decoration-primary-500/30 underline-offset-4 cursor-pointer hover:decoration-primary-500'
        }
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose'
        }
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex gap-2 items-start'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'blockquote'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Typography,
      ImageResize.configure({
        inline: true,
        allowBase64: true,
      }),
      ImageGrid,
      Columns,
      Column,
      SlashCommands.configure({
        suggestion,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert focus:outline-none max-w-none min-h-[60vh] pb-32'
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/') && onImageUpload) {
            event.preventDefault();
            onImageUpload(file).then(url => {
              const { schema } = view.state;
              const node = schema.nodes.imageResize?.create({ src: url });
              if (node) {
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              }
            });
            return true;
          }
        }
        return false;
      },
    }
  });

  // Sync content from props
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // Handle external image upload trigger
  useEffect(() => {
    const handleAddImageTrigger = () => {
      if (onImageUpload) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file && editor) {
            try {
              const url = await onImageUpload(file);
              editor.chain().focus().setImage({ src: url }).run();
            } catch {
              console.error('Failed to upload');
            }
          }
        };
        input.click();
      }
    };
    window.addEventListener('editor:add-image', handleAddImageTrigger);
    return () => window.removeEventListener('editor:add-image', handleAddImageTrigger);
  }, [editor, onImageUpload]);

  if (!editor) {
    return (
      <div className="min-h-[60vh] bg-gray-50 dark:bg-gray-900/50 rounded-2xl animate-pulse" />
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="relative">
      {/* Notion-style Bubble Menu for text selection */}
      <BubbleMenu 
        editor={editor} 
        className="flex items-center gap-0.5 p-1 bg-popover text-popover-foreground rounded-xl shadow-lg border border-border"
      >
        {/* Text Format */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "p-2 rounded-lg transition-colors",
            editor.isActive('bold') 
              ? "bg-accent text-accent-foreground" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "p-2 rounded-lg transition-colors",
            editor.isActive('italic') 
              ? "bg-accent text-accent-foreground" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Italic"
        >
          <Italic size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "p-2 rounded-lg transition-colors",
            editor.isActive('underline') 
              ? "bg-accent text-accent-foreground" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Underline"
        >
          <UnderlineIcon size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            "p-2 rounded-lg transition-colors",
            editor.isActive('strike') 
              ? "bg-accent text-accent-foreground" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Strikethrough"
        >
          <Strikethrough size={14} />
        </button>
        
        <div className="w-px h-4 bg-border mx-1" />
        
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={cn(
            "p-2 rounded-lg transition-colors",
            editor.isActive('highlight') 
              ? "bg-yellow-500/20 text-yellow-500" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Highlight"
        >
          <Highlighter size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={cn(
            "p-2 rounded-lg transition-colors",
            editor.isActive('code') 
              ? "bg-accent text-accent-foreground" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Inline Code"
        >
          <Code size={14} />
        </button>
        <button
          onClick={setLink}
          className={cn(
            "p-2 rounded-lg transition-colors",
            editor.isActive('link') 
              ? "bg-primary/20 text-primary" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Add Link"
        >
          <LinkIcon size={14} />
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Alignment */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={cn(
            "p-2 rounded-lg transition-colors",
            editor.isActive({ textAlign: 'left' }) 
              ? "bg-accent text-accent-foreground" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Align Left"
        >
          <AlignLeft size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={cn(
            "p-2 rounded-lg transition-colors",
            editor.isActive({ textAlign: 'center' }) 
              ? "bg-accent text-accent-foreground" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Align Center"
        >
          <AlignCenter size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={cn(
            "p-2 rounded-lg transition-colors",
            editor.isActive({ textAlign: 'right' }) 
              ? "bg-accent text-accent-foreground" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="Align Right"
        >
          <AlignRight size={14} />
        </button>
      </BubbleMenu>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="focus:outline-none"
      />

      {/* Hint for new users */}
      {editor.isEmpty && (
        <div className="absolute top-0 left-0 pointer-events-none text-muted-foreground/50 text-lg">
          Type <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-medium text-muted-foreground">/</kbd> for commands...
        </div>
      )}
    </div>
  );
};
