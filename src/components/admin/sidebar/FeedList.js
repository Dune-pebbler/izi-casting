import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { GripVertical, Copy, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
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
// import FeedEditModal from '../FeedEditModal'; // No longer needed for inline editing

function FeedList() {
  const [feeds, setFeeds] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [editingFeed, setEditingFeed] = useState(null);
  const [feedToDelete, setFeedToDelete] = useState(null);
  const [inlineEditingFeed, setInlineEditingFeed] = useState(null);
  const [inlineEditForm, setInlineEditForm] = useState({
    name: '',
    url: '',
    maxPosts: 5,
    isEnabled: true,
    isVisible: true
  });
  const [editingUrl, setEditingUrl] = useState(null);
  const [tempUrl, setTempUrl] = useState('');
  const [editingMaxPosts, setEditingMaxPosts] = useState(null);
  const [tempMaxPosts, setTempMaxPosts] = useState('');

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
            maxPosts: feed.maxPosts || 5, // Default 5 posts
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
            maxPosts: 5,
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
      maxPosts: 5,
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

  // Inline editing functions
  const startInlineEdit = (feed) => {
    setInlineEditingFeed(feed.id);
    setInlineEditForm({
      name: feed.name || '',
      url: feed.url || '',
      maxPosts: feed.maxPosts || 5,
      isEnabled: feed.isEnabled !== false,
      isVisible: feed.isVisible !== false
    });
  };

  const cancelInlineEdit = () => {
    setInlineEditingFeed(null);
    setInlineEditForm({
      name: '',
      url: '',
      maxPosts: 5,
      isEnabled: true,
      isVisible: true
    });
  };

  const saveInlineEdit = async () => {
    if (!inlineEditForm.name.trim()) {
      toast.error('Please enter a feed name');
      return;
    }

    if (!inlineEditForm.url.trim()) {
      toast.error('Please enter a feed URL');
      return;
    }

    // Validate URL format
    try {
      new URL(inlineEditForm.url);
    } catch (error) {
      toast.error('Please enter a valid URL');
      return;
    }

    const updatedFeed = {
      ...feeds.find(f => f.id === inlineEditingFeed),
      name: inlineEditForm.name.trim(),
      url: inlineEditForm.url.trim(),
      maxPosts: parseInt(inlineEditForm.maxPosts) || 5,
      isEnabled: inlineEditForm.isEnabled,
      isVisible: inlineEditForm.isVisible
    };

    const updatedFeeds = feeds.map(feed => 
      feed.id === inlineEditingFeed ? updatedFeed : feed
    );
    setFeeds(updatedFeeds);
    await saveFeedsToFirebase(updatedFeeds);
    toast.success('Feed updated successfully!');
    cancelInlineEdit();
  };

  const handleInlineFormChange = (field, value) => {
    setInlineEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // URL editing functions
  const startUrlEdit = (feed) => {
    setEditingUrl(feed.id);
    setTempUrl(feed.url || '');
  };

  const cancelUrlEdit = () => {
    setEditingUrl(null);
    setTempUrl('');
  };

  const saveUrlEdit = async (feedId) => {
    if (!tempUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    // Validate URL format
    try {
      new URL(tempUrl.trim());
    } catch (error) {
      toast.error('Please enter a valid URL');
      return;
    }

    const updatedFeeds = feeds.map(feed => 
      feed.id === feedId ? { ...feed, url: tempUrl.trim() } : feed
    );
    setFeeds(updatedFeeds);
    await saveFeedsToFirebase(updatedFeeds);
    toast.success('URL updated successfully!');
    cancelUrlEdit();
  };

  const handleUrlKeyPress = (e, feedId) => {
    if (e.key === 'Enter') {
      saveUrlEdit(feedId);
    } else if (e.key === 'Escape') {
      cancelUrlEdit();
    }
  };

  // Max Posts editing functions
  const startMaxPostsEdit = (feed) => {
    setEditingMaxPosts(feed.id);
    setTempMaxPosts(feed.maxPosts?.toString() || '5');
  };

  const cancelMaxPostsEdit = () => {
    setEditingMaxPosts(null);
    setTempMaxPosts('');
  };

  const saveMaxPostsEdit = async (feedId) => {
    const maxPostsValue = parseInt(tempMaxPosts);
    
    if (!tempMaxPosts.trim() || isNaN(maxPostsValue)) {
      toast.error('Please enter a valid number');
      return;
    }

    if (maxPostsValue < 1 || maxPostsValue > 50) {
      toast.error('Max posts must be between 1 and 50');
      return;
    }

    const updatedFeeds = feeds.map(feed => 
      feed.id === feedId ? { ...feed, maxPosts: maxPostsValue } : feed
    );
    setFeeds(updatedFeeds);
    await saveFeedsToFirebase(updatedFeeds);
    toast.success('Max posts updated successfully!');
    cancelMaxPostsEdit();
  };

  const handleMaxPostsKeyPress = (e, feedId) => {
    if (e.key === 'Enter') {
      saveMaxPostsEdit(feedId);
    } else if (e.key === 'Escape') {
      cancelMaxPostsEdit();
    }
  };

  const popularFeeds = [
    { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
    { name: 'CNN', url: 'https://rss.cnn.com/rss/edition.rss' },
    { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews' },
    { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml' },
    { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
    { name: 'Informanagement (JSON)', url: 'https://nl.informanagement.com/rss/customfeed.aspx?command=rss&mode=xml&nr=24&length=200&sjabloon=confianza052025' }
  ];

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

    const isInlineEditing = inlineEditingFeed === feed.id;

    return (
      <div 
        ref={setNodeRef}
        style={style}
        className={`feed-content-wrapper ${isDragging ? 'dragging' : ''}`}
      >
        <div className="feed-header">
          <div className="feed-header-left">
            <div className="feed-drag-handle" {...attributes} {...listeners}>
              <GripVertical size={18} />
            </div>
            <div className="feed-max-posts">
              <span className="max-posts-label">Aantal berichten:</span>
              {editingMaxPosts === feed.id ? (
                <input
                  type="number"
                  value={tempMaxPosts}
                  onChange={(e) => setTempMaxPosts(e.target.value)}
                  onKeyDown={(e) => handleMaxPostsKeyPress(e, feed.id)}
                  onBlur={() => saveMaxPostsEdit(feed.id)}
                  className="max-posts-input"
                  min="1"
                  max="50"
                  autoFocus
                />
              ) : (
                <span 
                  className="max-posts-value max-posts-editable" 
                  title="Klik om aantal berichten te bewerken"
                  onClick={() => startMaxPostsEdit(feed)}
                >
                  {feed.maxPosts}
                </span>
              )}
            </div>
          </div>
          <div className="feed-actions" onClick={(e) => e.stopPropagation()}>
            {/* <button
              onClick={(e) => {
                e.stopPropagation();
                copyFeed(feed);
              }}
              className="copy-feed-btn"
              title="Copy feed"
            >
              <Copy size={18} />
            </button> */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                confirmDeleteFeed(feed);
              }}
              className="delete-feed-btn"
              title="Delete feed"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFeedEnabled(feed.id);
              }}
              className={`visibility-btn ${feed.isEnabled && feed.isVisible ? 'enabled' : 'disabled'}`}
              title={feed.isEnabled && feed.isVisible ? 'Disable feed' : 'Enable feed'}
            >
              {feed.isEnabled && feed.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
        </div>

        {/* Feed Details */}
        <div className="feed-details">
          <div className="feed-url">
            {editingUrl === feed.id ? (
              <input
                type="url"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                onKeyDown={(e) => handleUrlKeyPress(e, feed.id)}
                onBlur={() => saveUrlEdit(feed.id)}
                className="url-input"
                placeholder="Enter feed URL"
                autoFocus
              />
            ) : (
              <div 
                className="url-value url-editable" 
                title={feed.url || 'Click to edit URL'}
                onClick={() => startUrlEdit(feed)}
              >
                {feed.url ? (feed.url.length > 50 ? `${feed.url.substring(0, 50)}...` : feed.url) : 'Click to set URL'}
              </div>
            )}
          </div>
        </div>

        {/* Inline Edit Form */}
        {isInlineEditing && (
          <div className="feed-edit-form">
            <div className="form-group">
              <label htmlFor={`feedName-${feed.id}`}>Feed Name</label>
              <input
                type="text"
                id={`feedName-${feed.id}`}
                value={inlineEditForm.name}
                onChange={(e) => handleInlineFormChange('name', e.target.value)}
                placeholder="Enter feed name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor={`feedUrl-${feed.id}`}>Feed URL</label>
              <input
                type="url"
                id={`feedUrl-${feed.id}`}
                value={inlineEditForm.url}
                onChange={(e) => handleInlineFormChange('url', e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="form-input"
              />
              <small className="input-help">
                Enter the URL of your RSS feed
              </small>
            </div>

            <div className="form-group">
              <label>Popular Feeds</label>
              <div className="popular-feeds">
                {popularFeeds.map((popularFeed, index) => (
                  <button
                    key={index}
                    type="button"
                    className="popular-feed-btn"
                    onClick={() => {
                      handleInlineFormChange('name', popularFeed.name);
                      handleInlineFormChange('url', popularFeed.url);
                    }}
                  >
                    {popularFeed.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor={`feedMaxPosts-${feed.id}`}>Maximum Number of Posts</label>
              <input
                type="number"
                id={`feedMaxPosts-${feed.id}`}
                min="1"
                max="50"
                value={inlineEditForm.maxPosts}
                onChange={(e) => handleInlineFormChange('maxPosts', parseInt(e.target.value) || 5)}
                className="form-input"
              />
              <small className="input-help">
                Maximum number of posts to display from this feed (1-50)
              </small>
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={inlineEditForm.isEnabled}
                    onChange={(e) => handleInlineFormChange('isEnabled', e.target.checked)}
                  />
                  <span className="checkbox-text">Enable this feed</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={inlineEditForm.isVisible}
                    onChange={(e) => handleInlineFormChange('isVisible', e.target.checked)}
                  />
                  <span className="checkbox-text">Show in display</span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button
                onClick={cancelInlineEdit}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={saveInlineEdit}
                className="btn btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
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
    <div className="feed-list">
      <div className="settings-header">
        <h3>Feed configuratie ({feeds.length})</h3>
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
            <Plus size={20} />
            <span>Feed toevoegen</span>
          </div>
        </div>
      </DndContext>

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
