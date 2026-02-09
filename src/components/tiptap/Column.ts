import { Node, mergeAttributes } from '@tiptap/core';

export interface ColumnOptions {
  HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    column: {
      setColumnWidth: (width: string) => ReturnType;
    };
  }
}

export const Column = Node.create<ColumnOptions>({
  name: 'column',

  group: 'column',

  content: 'block+',

  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      width: {
        default: null,
        parseHTML: element => element.style.width || null,
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return {
            style: `width: ${attributes.width}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-column]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-column': '' }), 0];
  },

  addCommands() {
    return {
      setColumnWidth:
        (width: string) =>
        ({ commands }) => {
          return commands.updateAttributes('column', { width });
        },
    };
  },
});
