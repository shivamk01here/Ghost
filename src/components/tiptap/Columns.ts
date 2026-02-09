import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ColumnsNodeView } from './ColumnsNodeView';

export interface ColumnsOptions {
  HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      setColumns: (columnCount: number) => ReturnType;
      addColumn: () => ReturnType;
      removeColumn: () => ReturnType;
    };
  }
}

export const Columns = Node.create<ColumnsOptions>({
  name: 'columns',

  group: 'block',

  content: 'column+',

  defining: true,

  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      columnCount: {
        default: 2,
        parseHTML: element => parseInt(element.getAttribute('data-column-count') || '2', 10),
        renderHTML: attributes => ({
          'data-column-count': attributes.columnCount,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-columns]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-columns': '' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnsNodeView as any);
  },

  addCommands() {
    return {
      setColumns:
        (columnCount: number) =>
        ({ chain, state }) => {
          const { selection } = state;
          const pos = selection.from;
          
          // Create column content
          const columns = Array.from({ length: columnCount }, () => ({
            type: 'column',
            content: [{ type: 'paragraph' }],
          }));

          return chain()
            .insertContentAt(pos, {
              type: 'columns',
              attrs: { columnCount },
              content: columns,
            })
            .run();
        },
      addColumn:
        () =>
        ({ commands }) => {
          // This would need more complex logic to add a column
          return commands.insertContent({
            type: 'column',
            content: [{ type: 'paragraph' }],
          });
        },
      removeColumn:
        () =>
        ({ commands }) => {
          return commands.deleteSelection();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Tab to move between columns
      Tab: () => {
        const { state, view } = this.editor;
        const { $from } = state.selection;
        
        // Check if we're inside a column
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);
          if (node.type.name === 'column') {
            // Find parent columns node
            const columnsDepth = d - 1;
            const columnsNode = $from.node(columnsDepth);
            if (columnsNode.type.name === 'columns') {
              // Find current column index
              const columnsStart = $from.before(columnsDepth);
              let currentIndex = 0;
              let colStart = columnsStart + 1;
              
              for (let i = 0; i < columnsNode.childCount; i++) {
                const col = columnsNode.child(i);
                if (colStart <= $from.pos && $from.pos <= colStart + col.nodeSize) {
                  currentIndex = i;
                  break;
                }
                colStart += col.nodeSize;
              }
              
              // Move to next column
              const nextIndex = (currentIndex + 1) % columnsNode.childCount;
              let targetPos = columnsStart + 1;
              for (let i = 0; i < nextIndex; i++) {
                targetPos += columnsNode.child(i).nodeSize;
              }
              
              // Set cursor to start of next column's content
              const tr = state.tr.setSelection(
                (state.selection.constructor as any).near(state.doc.resolve(targetPos + 1))
              );
              view.dispatch(tr);
              return true;
            }
          }
        }
        return false;
      },
    };
  },
});
