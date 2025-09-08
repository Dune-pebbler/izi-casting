import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { GripVertical, Copy, Trash2, Plus, Eye, EyeOff, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import FeedEditModal from './modal/FeedEditModal';

function FeedList() {
  const [feeds, setFeeds] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [editingFeed, setEditingFeed] = useState(null);
  const [feedToDelete, setFeedToDelete] = useState(null);
  const [editingFeedNameId, setEditingFeedNameId] = useState(null);
  const [editingFeedName, setEditingFeedName] = useState('');
  const [expandedFeeds, setExpandedFeeds] = useState(new Set());

  // Load feeds from Firestore
  useEffect(() => {
    const settingsDocRef = doc(db, 'display', 'settings');
    
    const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.feeds && Array.isArray(data.feeds)) {
          // Migrate existing feeds to include new properties
          const migratedFeeds = data.feeds.map(feed => ({
            ...feed,
            isEnabled: feed.isEnabled !== false, // Default to true if not set
            duration: feed.duration || 10, // Default 10 seconds
            isVisible: feed.isVisible !== false // Default to true if not set
          }));
          setFeeds(migratedFeeds);
        } else if (data.feedUrl) {
          // Migrate old single feed structure to new multiple feeds structure
          const defaultFeed = {
            id: 'default',
            name: 'Default Feed',
            url: data.feedUrl,
            isEnabled: true,
            duration: 10,
            isVisible: true
          };
          setFeeds([defaultFeed]);
        } else {
          setFeeds([]);
        }
      } else {
        setFeeds([]);
      }
      setHasLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const addFeed = async () => {
    const newFeed = {
      id: `feed_${Date.now()}`,
      name: `Feed ${feeds.length + 1}`,
      url: '',
      isEnabled: true,
      duration: 10,
      isVisible: true
    };
    const updatedFeeds = [...feeds, newFeed];
    setFeeds(updatedFeeds);
    await saveFeedsToFirebase(updatedFeeds);
    toast.success('Feed added successfully!');
  };

  const removeFeed = async (feedId) => {
    const feedToRemove = feeds.find(feed => feed.id === feedId);
    const feedName = feedToRemove?.name || 'Feed';
    
    // Show loading toast
    const loadingToast = toast.loading(`Deleting ${feedName}...`);

    try {
      const updatedFeeds = feeds.filter(feed => feed.id !== feedId);
      setFeeds(updatedFeeds);
      await saveFeedsToFirebase(updatedFeeds);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(`${feedName} deleted successfully!`);
    } catch (error) {
      console.error('Error deleting feed:', error);
      
      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error(`Error deleting ${feedName}: ` + error.message);
    }
  };

  const confirmDeleteFeed = (feed) => {
    setFeedToDelete(feed);
  };

  const handleDeleteFeed = async () => {
    if (feedToDelete) {
      await removeFeed(feedToDelete.id);
      setFeedToDelete(null);
    }
  };

  const copyFeed = async (feedToCopy) => {
    // Create a deep copy of the feed with new ID
    const copiedFeed = {
      ...feedToCopy,
      id: `feed_${Date.now()}`,
      name: `${feedToCopy.name} (Copy)`,
      isEnabled: true,
      isVisible: true
    };
    
    const updatedFeeds = [...feeds, copiedFeed];
    setFeeds(updatedFeeds);
    await saveFeedsToFirebase(updatedFeeds);
    toast.success('Feed copied successfully!');
  };

  const updateFeedName = async (feedId, newName) => {
    const updatedFeeds = feeds.map(feed => 
      feed.id === feedId ? { ...feed, name: newName } : feed
    );
    setFeeds(updatedFeeds);
    await saveFeedsToFirebase(updatedFeeds);
  };

  const startEditingFeedName = (feedId, currentName) => {
    setEditingFeedNameId(feedId);
    setEditingFeedName(currentName);
  };

  const saveFeedName = async () => {
    if (editingFeedNameId && editingFeedName.trim()) {
      await updateFeedName(editingFeedNameId, editingFeedName.trim());
    }
    setEditingFeedNameId(null);
    setEditingFeedName('');
  };

  const cancelEditingFeedName = () => {
    setEditingFeedNameId(null);
    setEditingFeedName('');
  };

  const handleFeedNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveFeedName();
    } else if (e.key === 'Escape') {
      cancelEditingFeedName();
    }
  };

  const toggleFeedExpansion = (feedId) => {
    const newExpanded = new Set(expandedFeeds);
    if (newExpanded.has(feedId)) {
      newExpanded.delete(feedId);
    } else {
      newExpanded.add(feedId);
    }
    setExpandedFeeds(newExpanded);
  };

  const isFeedExpanded = (feedId) => {
    return expandedFeeds.has(feedId);
  };

  const toggleFeedEnabled = async (feedId) => {
    const updatedFeeds = feeds.map(feed => 
      feed.id === feedId ? { ...feed, isEnabled: !feed.isEnabled } : feed
    );
    setFeeds(updatedFeeds);
    await saveFeedsToFirebase(updatedFeeds);
  };

  const toggleFeedVisibility = async (feedId) => {
    const updatedFeeds = feeds.map(feed => 
      feed.id === feedId ? { ...feed, isVisible: !feed.isVisible } : feed
    );
    setFeeds(updatedFeeds);
    await saveFeedsToFirebase(updatedFeeds);
  };

  const openEditModal = (feed) => {
    setEditingFeed(feed);
  };

  const closeEditModal = () => {
    setEditingFeed(null);
  };

  const saveFeedChanges = async (updatedFeed) => {
    const updatedFeeds = feeds.map(feed => 
      feed.id === updatedFeed.id ? updatedFeed : feed
    );
    setFeeds(updatedFeeds);
    await saveFeedsToFirebase(updatedFeeds);
    toast.success('Feed updated successfully!');
    closeEditModal();
  };

  const saveFeedsToFirebase = async (feedsToSave) => {
    try {
      const settingsDocRef = doc(db, 'display', 'settings');
      console.log('Saving feeds to Firebase:', feedsToSave.map(f => ({ id: f.id, name: f.name })));
      await setDoc(settingsDocRef, { feeds: feedsToSave }, { merge: true });
      console.log('Feeds saved to Firebase successfully');
    } catch (error) {
      console.error('Error saving feeds to Firebase:', error);
      toast.error('Error saving changes: ' + error.message);
      throw error;
    }
  };

  const reorderFeeds = async (newFeeds) => {
    setFeeds(newFeeds);
    await saveFeedsToFirebase(newFeeds);
  };

  // SortableFeedHeader component
  const SortableFeedHeader = ({ feed, index }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: feed.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div 
        ref={setNodeRef}
        style={style}
        className={`feed-content-wrapper ${isDragging ? 'dragging' : ''} ${isFeedExpanded(feed.id) ? 'expanded' : ''}`}
      >
        <div className="feed-header" onClick={() => toggleFeedExpansion(feed.id)}>
          <div className="feed-header-left">
            <div className="feed-drag-handle" {...attributes} {...listeners}>
              <GripVertical size={16} />
            </div>
            {editingFeedNameId === feed.id ? (
              <input
                type="text"
                value={editingFeedName}
                onChange={(e) => setEditingFeedName(e.target.value)}
                onBlur={saveFeedName}
                onKeyPress={handleFeedNameKeyPress}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="feed-title-input"
              />
            ) : (
              <h3 className="feed-title" onClick={(e) => {
                e.stopPropagation();
                startEditingFeedName(feed.id, feed.name);
              }}>
                {feed.name}
              </h3>
            )}
          </div>
          <div className="feed-actions" onClick={(e) => e.stopPropagation()}>
            <div className="feed-info">
              <div className="feed-duration">
                <span className="duration-label">Duration:</span>
                <span className="duration-value">{feed.duration}s</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFeedVisibility(feed.id);
              }}
              className={`visibility-btn ${feed.isVisible ? 'visible' : 'hidden'}`}
              title={feed.isVisible ? 'Hide feed' : 'Show feed'}
            >
              {feed.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(feed);
              }}
              className="edit-feed-btn"
              title="Edit feed"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyFeed(feed);
              }}
              className="copy-feed-btn"
              title="Copy feed"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                confirmDeleteFeed(feed);
              }}
              className="delete-feed-btn"
              title="Delete feed"
            >
              <Trash2 size={14} />
            </button>
            <div className="feed-expand-icon">
              <svg 
                className={`expand-arrow ${isFeedExpanded(feed.id) ? 'expanded' : ''}`}
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFeedEnabled(feed.id);
          }}
          className={`feed-toggle-btn ${feed.isEnabled !== false ? 'enabled' : 'disabled'}`}
          title={feed.isEnabled !== false ? 'Disable feed' : 'Enable feed'}
        >
        </button>

        {/* Collapsible Feed Details Container */}
        <div className={`feed-details-container ${isFeedExpanded(feed.id) ? 'expanded' : ''}`}>
          <div className="feed-details">
            <div className="feed-url">
              <span className="url-label">URL:</span>
              <span className="url-value" title={feed.url}>
                {feed.url ? (feed.url.length > 50 ? `${feed.url.substring(0, 50)}...` : feed.url) : 'No URL set'}
              </span>
            </div>
            <div className="feed-status">
              <span className="status-label">Status:</span>
              <span className={`status-value ${feed.isEnabled ? 'enabled' : 'disabled'}`}>
                {feed.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const feedIds = useMemo(() => feeds.map(feed => feed.id), [feeds]);

  const handleFeedDragEnd = useCallback((event) => {
    const { active, over } = event;
    console.log('Feed drag end:', { active, over });

    if (active.id !== over?.id) {
      const oldIndex = feeds.findIndex(feed => feed.id === active.id);
      const newIndex = feeds.findIndex(feed => feed.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFeeds = arrayMove(feeds, oldIndex, newIndex);
        reorderFeeds(newFeeds);
      }
    }
  }, [feeds, reorderFeeds]);

  const handleFeedDragStart = useCallback((event) => {
    console.log('Feed drag start:', event);
  }, []);

  return (
    <div className="sidebar-section">
      <div className="settings-header">
        <h2>Feed configuratie ({feeds.length})</h2>
      </div>

      {/* Feeds */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleFeedDragEnd}
        onDragStart={handleFeedDragStart}
      >
        <SortableContext
          items={feedIds}
          strategy={verticalListSortingStrategy}
        >
          {feeds.map((feed, index) => (
            <SortableFeedHeader
              key={feed.id}
              feed={feed}
              index={index}
            />
          ))}
        </SortableContext>
        
        {/* Add Feed Button */}
        <div className="add-feed-button" onClick={addFeed}>
          <div className="add-feed-content">
            <Plus size={24} />
            <span>Add Feed</span>
          </div>
        </div>
      </DndContext>

      {/* Feed Edit Modal */}
      {editingFeed && (
        <FeedEditModal
          feed={editingFeed}
          onClose={closeEditModal}
          onSave={saveFeedChanges}
        />
      )}

      {/* Feed Deletion Confirmation Modal */}
      {feedToDelete && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <h3>Feed verwijderen</h3>
            <p>
              Weet je zeker dat je <strong>{feedToDelete.name}</strong> wilt verwijderen?
            </p>
            <p className="delete-warning">
              Deze actie kan niet ongedaan worden gemaakt.
            </p>
            <div className="delete-modal-actions">
              <button
                onClick={() => setFeedToDelete(null)}
                className="btn btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={handleDeleteFeed}
                className="btn btn-danger"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedList;
