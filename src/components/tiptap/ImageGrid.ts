import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageGridNodeView } from './ImageGridNodeView';

export interface ImageGridOptions {
  HTMLAttributes: Record<string, string>;
}

export const ImageGrid = Node.create<ImageGridOptions>({
  name: 'imageGrid',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      columns: {
        default: 2,
        parseHTML: element => {
          const val = element.getAttribute('data-columns');
          // If value is a number string ('2'), return number (2).
          // If value is a non-number string ('masonry'), return string ('masonry').
          // Default to 2.
          return val ? (isNaN(Number(val)) ? val : Number(val)) : 2;
        },
        renderHTML: attributes => ({
          'data-columns': attributes.columns,
        }),
      },
      gap: {
        default: 16,
        parseHTML: element => {
           const val = element.getAttribute('data-gap');
           return val ? parseInt(val, 10) : 16;
        },
        renderHTML: attributes => ({
          'data-gap': attributes.gap,
        }),
      },
      images: {
        default: [],
        parseHTML: element => {
          const images = element.getAttribute('data-images');
          return images ? JSON.parse(images) : [];
        },
        renderHTML: attributes => ({
          'data-images': JSON.stringify(attributes.images),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'image-grid',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['image-grid', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageGridNodeView as any);
  },
});
