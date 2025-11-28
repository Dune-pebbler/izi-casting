import React from 'react';
import { 
  LayoutGrid, 
  Image, 
  FileText, 
  Type,
  Play
} from 'lucide-react';

function LayoutSelector({ currentLayout, onLayoutChange }) {
  const layouts = [
    {
      id: 'side-by-side',
      label: 'Side by Side',
      icon: LayoutGrid,
      title: 'Image and Text Side by Side'
    },
    {
      id: 'image-only',
      label: 'Image Only',
      icon: Image,
      title: 'Image Only'
    },
    // {
    //   id: 'text-over-image',
    //   label: 'Text Over Image',
    //   icon: '📝',
    //   title: 'Text Over Image'
    // },
    {
      id: 'text-only',
      label: 'Text Only',
      icon: FileText,
      title: 'Text Only'
    },
    {
      id: 'video',
      label: 'Video',
      icon: Play,
      title: 'Video Player (YouTube/Vimeo)'
    }
  ];

  return (
    <div className="layout-selector">
      {layouts.map(layout => {
        const IconComponent = layout.icon;
        return (
          <button 
            key={layout.id}
            className={`layout-btn ${currentLayout === layout.id ? 'active' : ''}`}
            onClick={() => onLayoutChange(layout.id)}
            title={layout.title}
            aria-label={layout.label}
          >
            <IconComponent size={20} />
          </button>
        );
      })}
    </div>
  );
}

export default LayoutSelector;
