import React, { useState, useRef, useEffect } from 'react';
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
  Trophy,
  ChevronDown,
} from 'lucide-react';

function LayoutSelector({ currentLayout, onLayoutChange, slideTypes = {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const allLayouts = [
    { id: 'side-by-side', label: 'Side by Side',  icon: LayoutGrid,  title: 'Image and Text Side by Side' },
    { id: 'image-only',   label: 'Afbeelding',    icon: Image,       title: 'Image Only' },
    { id: 'text-only',    label: 'Tekst',          icon: FileText,    title: 'Text Only' },
    { id: 'video',        label: 'Video',          icon: Play,        title: 'Video Player (YouTube/Vimeo)' },
    { id: 'teletekst',    label: 'Teletekst',      icon: Tv,          title: 'NOS Teletekst Display' },
    { id: 'iframe',       label: 'Website',        icon: Globe,       title: 'Website Weergeven (iframe)' },
    { id: 'gallery',      label: 'Fotogalerij',    icon: Images,      title: 'Foto Galerij / Slideshow' },
    { id: 'countdown',    label: 'Afteltimer',     icon: Timer,       title: 'Afteltimer' },
    { id: 'agenda',       label: 'Agenda',         icon: CalendarDays,title: 'Agenda (iCal)' },
    { id: 'email',        label: 'Gmail',          icon: Mail,        title: 'Gmail inbox' },
    { id: 'sportlink',    label: 'Sportlink',      icon: Trophy,      title: 'Sportlink Club.Dataservice' },
  ];

  const hasSlideTypeConfig = Object.keys(slideTypes).length > 0;
  const layouts = hasSlideTypeConfig
    ? allLayouts.filter(({ id }) => slideTypes[id])
    : allLayouts;

  const active = layouts.find(l => l.id === currentLayout) || layouts[0];

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function select(id) {
    onLayoutChange(id);
    setOpen(false);
  }

  const ActiveIcon = active?.icon;

  return (
    <div className={`layout-select${open ? ' layout-select--open' : ''}`} ref={ref}>
      <button
        className="layout-select__trigger"
        onClick={() => setOpen(o => !o)}
        type="button"
        title={active?.title}
      >
        {ActiveIcon && <ActiveIcon size={16} />}
        <span className="layout-select__label">{active?.label}</span>
        <ChevronDown size={14} className="layout-select__chevron" />
      </button>

      {open && (
        <div className="layout-select__dropdown">
          {layouts.map(layout => {
            const Icon = layout.icon;
            return (
              <button
                key={layout.id}
                className={`layout-select__option${currentLayout === layout.id ? ' layout-select__option--active' : ''}`}
                onClick={() => select(layout.id)}
                type="button"
                title={layout.title}
              >
                <Icon size={16} />
                <span>{layout.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LayoutSelector;
