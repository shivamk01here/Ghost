import React from 'react';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { SlashCommandList } from './SlashCommandList';
import { 
  Type,
  Heading1,
  Heading2,
  Heading3,
  List, 
  ListOrdered,
  CheckSquare, 
  Image as ImageIcon, 
  Grid3x3, 
  Quote, 
  Minus, 
  Code,
  AlertCircle,
  Link as LinkIcon,
  Bookmark,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter
} from 'lucide-react';

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  command: (props: { editor: any; range: any }) => void;
}

const createIcon = (IconComponent: any, props: any = {}) => {
  return React.createElement(IconComponent, { size: 14, ...props });
};

export const suggestion = {
  items: ({ query }: { query: string }): CommandItem[] => {
    const allItems: CommandItem[] = [
      // Text Blocks
      {
        title: 'Text',
        description: 'Plain paragraph text',
        icon: createIcon(Type),
        category: 'Basic',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setParagraph().run();
        },
      },
      {
        title: 'Heading 1',
        description: 'Big section heading',
        icon: createIcon(Heading1),
        category: 'Basic',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
        },
      },
      {
        title: 'Heading 2',
        description: 'Medium section heading',
        icon: createIcon(Heading2),
        category: 'Basic',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
        },
      },
      {
        title: 'Heading 3',
        description: 'Small section heading',
        icon: createIcon(Heading3),
        category: 'Basic',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
        },
      },
      // Lists
      {
        title: 'Bullet List',
        description: 'Create a simple bulleted list',
        icon: createIcon(List),
        category: 'Lists',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
      },
      {
        title: 'Numbered List',
        description: 'Create a numbered list',
        icon: createIcon(ListOrdered),
        category: 'Lists',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
      },
      {
        title: 'To-do List',
        description: 'Track tasks with checkboxes',
        icon: createIcon(CheckSquare),
        category: 'Lists',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
      },
      // Media
      {
        title: 'Image',
        description: 'Upload or embed an image',
        icon: createIcon(ImageIcon),
        category: 'Media',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          const event = new CustomEvent('editor:add-image');
          window.dispatchEvent(event);
        },
      },
      {
        title: '2 Columns',
        description: 'Two columns side by side',
        icon: createIcon(Grid3x3),
        category: 'Layout',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent({
            type: 'columns',
            attrs: { columnCount: 2 },
            content: [
              { type: 'column', content: [{ type: 'paragraph' }] },
              { type: 'column', content: [{ type: 'paragraph' }] },
            ],
          }).run();
        },
      },
      {
        title: '3 Columns',
        description: 'Three columns side by side',
        icon: createIcon(Grid3x3),
        category: 'Layout',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent({
            type: 'columns',
            attrs: { columnCount: 3 },
            content: [
              { type: 'column', content: [{ type: 'paragraph' }] },
              { type: 'column', content: [{ type: 'paragraph' }] },
              { type: 'column', content: [{ type: 'paragraph' }] },
            ],
          }).run();
        },
      },
      {
        title: '4 Columns',
        description: 'Four columns side by side',
        icon: createIcon(Grid3x3),
        category: 'Layout',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent({
            type: 'columns',
            attrs: { columnCount: 4 },
            content: [
              { type: 'column', content: [{ type: 'paragraph' }] },
              { type: 'column', content: [{ type: 'paragraph' }] },
              { type: 'column', content: [{ type: 'paragraph' }] },
              { type: 'column', content: [{ type: 'paragraph' }] },
            ],
          }).run();
        },
      },
      {
        title: 'Image Grid',
        description: 'Gallery of images',
        icon: createIcon(ImageIcon),
        category: 'Media',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent({ type: 'imageGrid', attrs: { columns: 2 } }).run();
        },
      },
      // Inline
      {
        title: 'Quote',
        description: 'Capture a blockquote',
        icon: createIcon(Quote),
        category: 'Blocks',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
      },
      {
        title: 'Callout',
        description: 'Make something stand out',
        icon: createIcon(AlertCircle),
        category: 'Blocks',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
      },
      {
        title: 'Code Block',
        description: 'Capture a code snippet',
        icon: createIcon(Code),
        category: 'Blocks',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
      },
      {
        title: 'Divider',
        description: 'Visual section break',
        icon: createIcon(Minus),
        category: 'Blocks',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
      },
      // Formatting 
      {
        title: 'Bold',
        description: 'Make text bold',
        icon: createIcon(Bold),
        category: 'Format',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBold().run();
        },
      },
      {
        title: 'Italic',
        description: 'Make text italic',
        icon: createIcon(Italic),
        category: 'Format',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleItalic().run();
        },
      },
      {
        title: 'Underline',
        description: 'Underline text',
        icon: createIcon(Underline),
        category: 'Format',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleUnderline().run();
        },
      },
      {
        title: 'Strikethrough',
        description: 'Strikethrough text',
        icon: createIcon(Strikethrough),
        category: 'Format',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleStrike().run();
        },
      },
      {
        title: 'Highlight',
        description: 'Highlight text',
        icon: createIcon(Highlighter),
        category: 'Format',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleHighlight().run();
        },
      },
      // Embeds
      {
        title: 'Link',
        description: 'Add a web link',
        icon: createIcon(LinkIcon),
        category: 'Embeds',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        },
      },
      {
        title: 'Bookmark',
        description: 'Save a visual link preview',
        icon: createIcon(Bookmark),
        category: 'Embeds',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          const url = window.prompt('Enter URL for bookmark:');
          if (url) {
            // For now, insert as a styled link. In next phase, implement proper bookmark block.
            editor.chain().focus().insertContent(`<p><a href="${url}" target="_blank" class="bookmark-link">${url}</a></p>`).run();
          }
        },
      },
    ];

    if (!query) return allItems.slice(0, 12);
    
    return allItems.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
  },

  render: () => {
    let component: any;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(SlashCommandList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          maxWidth: 'none',
        });
      },

      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }
        return component.ref?.onKeyDown(props);
      },

      onExit() {
        if (popup && popup[0]) {
          popup[0].destroy();
        }
        if (component) {
          component.destroy();
        }
      },
    };
  },
};
