import React from 'react';
import {
  LayoutGrid,
  Image,
  FileText,
  Play,
  Tv,
  Globe,
  Images,
  Timer,
  CalendarDays,
  Mail,
} from 'lucide-react';

function LayoutSelector({ currentLayout, onLayoutChange, slideTypes = {} }) {
  const allLayouts = [
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
    },
    {
      id: 'teletekst',
      label: 'Teletekst',
      icon: Tv,
      title: 'NOS Teletekst Display'
    },
    {
      id: 'iframe',
      label: 'Website',
      icon: Globe,
      title: 'Website Weergeven (iframe)'
    },
    {
      id: 'gallery',
      label: 'Fotogalerij',
      icon: Images,
      title: 'Foto Galerij / Slideshow'
    },
    {
      id: 'countdown',
      label: 'Afteltimer',
      icon: Timer,
      title: 'Afteltimer'
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: CalendarDays,
      title: 'Agenda (iCal)'
    },
    {
      id: 'email',
      label: 'Gmail',
      icon: Mail,
      title: 'Gmail inbox'
    }
  ];

  const hasSlideTypeConfig = Object.keys(slideTypes).length > 0;
  const layouts = hasSlideTypeConfig
    ? allLayouts.filter(({ id }) => slideTypes[id])
    : allLayouts;

  return (
    <div className="slide-modal__layout-selector">
      {layouts.map(layout => {
        const IconComponent = layout.icon;
        return (
          <button
            key={layout.id}
            className={`slide-modal__layout-btn ${currentLayout === layout.id ? 'active' : ''}`}
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
