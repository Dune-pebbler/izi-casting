# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

izi-casting is a minimal narrowcasting application for displaying content on screens. It features an admin interface for content management and a display view for showing slides. The app uses Firebase for backend services and real-time synchronization.

## Development Commands

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Firebase Configuration

Copy `.env.example` to `.env` and populate with your Firebase credentials:
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`

**Important:** `.env` is gitignored and should never be committed.

## Architecture

### Core Components

The application has two main views accessed via routes:

1. **DisplayView** (`/`) - The public-facing display that shows slides in a loop
2. **AdminView** (`/admin`) - Protected management interface for creating and editing content

### State Management

- **Redux Toolkit**: Used for device pairing/linking state management
- **Redux Store**: Located in `src/store/store.js`
- **Device Slice**: `src/store/slices/deviceSlice.js` manages device pairing, sidebar UI, and display state

### Firebase Integration

The app uses three main Firebase services:

1. **Firestore** (`src/firebase.js`):
   - `display/content` - stores playlists and slides
   - `display/settings` - stores app settings (logo, colors, feeds, clock settings)
   - `devices/{deviceId}` - device pairing and linking status
   - `pairing_codes/{code}` - pairing codes for device authentication
   - `device_commands/{deviceId}` - remote commands (e.g., refresh)
   - `trash` - deleted slides (soft delete with restore capability)
   - `mediaLibrary` - uploaded images with metadata

2. **Storage**: Image uploads stored in `slides/` directory

3. **Authentication**: Google OAuth for admin access

### Key Data Flow

#### Device Pairing Flow
1. DisplayView generates a unique device ID (stored in localStorage as `izi_device_id`)
2. If unpaired, generates a 5-digit pairing code and saves to Firestore
3. Admin pairs device via the Devices sidebar panel using the code
4. Real-time listener updates `isPaired` state in DisplayView
5. Device periodically updates `lastSeen` timestamp

#### Content Display Flow
1. AdminView manages playlists containing slides
2. Each playlist has:
   - Name, enabled/disabled state, repeat count
   - Array of slides with duration, visibility, transitions
3. DisplayView listens to `display/content` collection
4. Flattens enabled playlists → filters visible slides → repeats based on repeatCount
5. Rotates through slides based on individual slide durations
6. Progress bar and status bar update in real-time

### Custom Hooks

**`usePlaylistManager`** (`src/components/admin/PlaylistManager.js`):
- Manages playlist CRUD operations
- Calculates playlist durations
- Handles Firebase synchronization
- Provides playlist reordering and migration logic

### Slide Types & Layouts

Slides support multiple types and layouts:

- **Types**: text, image, video, teletekst
- **Layouts**: side-by-side, stacked, top-text, bottom-text, image-only, text-only, teletekst, full-width-text
- **Properties**: duration, visibility, transition effects, image position, show/hide status bar
- **Special features**: TinyMCE rich text editor, video URL support, teletekst channel/theme

### Styling

- SCSS modules in `src/styles/`
- Component-specific styles in `src/styles/components/`
- Variables defined in `_variables.scss`
- Uses MonaSans and Manrope variable fonts from `public/fonts/`

## Important Patterns

### Modal State Management
AdminView maintains modal state locally (not in Redux). Edit operations on slides use controlled component patterns with separate state variables (e.g., `modalImageUrl`, `modalTinyMCEContent`, `modalSlideName`).

### Image Upload Flow
1. Image selected in modal
2. Uploaded to Firebase Storage (`slides/{timestamp}_{filename}`)
3. Metadata saved to `mediaLibrary` collection (includes dimensions)
4. Download URL stored in slide data
5. Image library modal allows reusing previously uploaded images

### Trash System
- Slides moved to trash are stored in `trash` collection with original playlist metadata
- Trash modal allows restore to any playlist or permanent deletion
- Empty trash deletes all images from storage and removes trash documents

### Device Commands
Admin can send commands to displays via `device_commands` collection:
- Refresh command restarts slides and reloads browser
- Commands marked as processed after execution to prevent re-execution


### Real-time Listeners
DisplayView sets up multiple onSnapshot listeners:
- Device pairing status (`devices/{deviceId}`)
- Device commands (`device_commands/{deviceId}`)
- Content updates (`display/content`)
- Settings updates (`display/settings`)

All listeners are properly cleaned up on unmount.

## Common Tasks

### Adding a New Slide Layout
1. Add layout option in `LayoutSelector.js`
2. Implement rendering logic in `SlideDisplay.js`
3. Add corresponding styles in `_slide-display.scss`
4. Update layout type checks in DisplayView slide filtering

### Adding a New Setting
1. Add field in Settings sidebar component
2. Update `display/settings` document structure
3. Modify settings listener in DisplayView
4. Apply setting in relevant components

### Modifying Slide Progression Logic
The slide rotation logic is in DisplayView's slide rotation useEffect (line ~745). It uses setTimeout to handle variable durations and automatically advances to the next slide.

## Testing Device Pairing

1. Open `/` in an incognito window (or different browser)
2. Note the 5-digit pairing code displayed
3. Open `/admin` and navigate to Devices in sidebar
4. Enter pairing code and submit
5. Display should immediately show content

## Git Status Warning

The `.env` file contains sensitive Firebase credentials and must never be committed. Always use `.env.example` as a template for new setups.
