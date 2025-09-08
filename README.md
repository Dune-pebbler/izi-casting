# Izi Casting - Narrowcasting Application

A minimal proof-of-concept narrowcasting application built with React and Firebase Firestore. This application demonstrates real-time content updates between an Admin view and a Display view.

## Features

- **Admin View**: Create and manage text and image slides
- **Display View**: Real-time display of slides with automatic rotation
- **Image Upload**: Support for image files (JPG, PNG, GIF, etc.) up to 5MB
- **Slide Management**: Add, remove, and toggle visibility of slides
- **Real-time Updates**: Content changes are reflected immediately without page refresh
- **Simple Routing**: Toggle between Admin and Display views
- **Error Handling**: Graceful error handling for Firebase connection issues

## Technology Stack

- React 18.2.0 (Functional components with hooks)
- Firebase Firestore v10.7.0 (v9 modular SDK)
- Firebase Storage for image uploads
- React Scripts for development

## Project Structure

```
izi-casting/
├── public/
│   └── index.html
├── src/
│   ├── App.js          # Main application component
│   ├── firebase.js     # Firebase configuration
│   ├── index.js        # React entry point
│   └── styles/         # SCSS stylesheets
│       ├── main.scss
│       ├── _variables.scss
│       └── components/
│           ├── _admin.scss
│           ├── _display.scss
│           └── _slides.scss
├── package.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database in your project
3. Enable Firebase Storage in your project
4. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
5. Update the `.env` file with your Firebase configuration values from the Firebase Console:

```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-actual-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-actual-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

**Note**: The `.env` file is already included in `.gitignore` to keep your Firebase credentials secure.

### 3. Set Up Firebase Security Rules

#### Firestore Rules
In your Firebase Console, go to Firestore Database > Rules and set up the following rules for testing:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /display/{document} {
      allow read, write: if true;  // For testing only - not recommended for production
    }
  }
}
```

#### Storage Rules
In your Firebase Console, go to Storage > Rules and set up the following rules for testing:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /slides/{allPaths=**} {
      allow read, write: if true;  // For testing only - not recommended for production
    }
  }
}
```

**Note**: The more permissive rule above allows access to all files in Storage. For production, you should restrict access to specific paths.

### 4. Start the Development Server

```bash
npm start
```

The application will open at `http://localhost:3000`

## Usage

### Admin View (`/admin`)
- **Add Slides**: Click "Slide toevoegen" to create a new slide
- **Slide Types**: Choose between "Text Slide" or "Image Slide" using the dropdown
- **Text Slides**: Enter text content in the textarea
- **Image Slides**: Click the upload area to select an image file
- **Manage Slides**: 
  - Toggle visibility with the "Visible/Hidden" button
  - Remove slides with the "Remove" button
  - Remove images from image slides with "Remove Image"
- **Save Changes**: Click "Save Slides" to persist changes to Firestore

### Display View (`/`)
- Shows slides in rotation with 5-second intervals
- Displays text slides with large, centered text
- Shows image slides with responsive sizing
- Only displays visible slides with content
- Shows slide counter (e.g., "Slide 2 of 5")

## Data Structure

The application uses a single Firestore document:
- **Collection**: `display`
- **Document**: `content`
- **Fields**:
  - `slides` (array): Array of slide objects

### Slide Object Structure
```javascript
{
  id: number,           // Unique identifier
  type: string,         // 'text' or 'image'
  text: string,         // Text content (for text slides)
  imageUrl: string,     // Firebase Storage URL (for image slides)
  imageName: string,    // Storage filename (for image slides)
  isVisible: boolean    // Whether slide is shown in display
}
```

### Storage Structure
- **Bucket**: Firebase Storage
- **Path**: `slides/{timestamp}_{filename}`
- **Supported formats**: JPG, PNG, GIF, WebP, etc.
- **Size limit**: 5MB per image

## Key Implementation Details

### Real-time Listener
Both Admin and Display views use `onSnapshot` to listen for real-time updates:

```javascript
const unsubscribe = onSnapshot(displayDocRef, (doc) => {
  if (doc.exists()) {
    const data = doc.data();
    if (data.slides) {
      setSlides(data.slides);
    }
  }
});
```

### Image Upload Process
1. File validation (type and size)
2. Generate unique filename with timestamp
3. Upload to Firebase Storage
4. Get download URL
5. Update slide object with image data

### Slide Rotation
Display view automatically rotates through visible slides:
```javascript
useEffect(() => {
  if (slides.length === 0) return;
  
  const interval = setInterval(() => {
    setCurrentSlideIndex(prevIndex => 
      prevIndex === slides.length - 1 ? 0 : prevIndex + 1
    );
  }, 5000);
  
  return () => clearInterval(interval);
}, [slides]);
```

### Firebase Integration
- Uses Firebase v9 modular SDK for better tree-shaking
- Implements proper cleanup of listeners to prevent memory leaks
- Includes error handling for connection issues
- Automatic cleanup of deleted images from Storage

### State Management
- Uses React hooks (`useState`, `useEffect`) for state management
- Conditional rendering based on slide type
- Real-time state updates from Firestore
- Loading states for image uploads

## Production Considerations

For production deployment:

1. **Security Rules**: Implement proper Firestore and Storage security rules
2. **Environment Variables**: Move Firebase config to environment variables
3. **Authentication**: Add user authentication for Admin access
4. **Error Boundaries**: Implement React error boundaries
5. **Loading States**: Add proper loading indicators
6. **Image Optimization**: Implement image compression and resizing
7. **CDN**: Use Firebase Storage CDN for better image delivery
8. **Backup**: Implement regular backups of slide data

## Troubleshooting

### Common Issues

1. **Firebase Connection Errors**: Check your Firebase configuration in `src/firebase.js`
2. **Permission Denied**: Verify your Firestore and Storage security rules allow read/write access
3. **Real-time Updates Not Working**: Check browser console for Firebase connection errors
4. **Image Upload Fails**: 
   - Ensure Firebase Storage is enabled in your project
   - Update Storage rules to allow read/write access
   - Check file size (max 5MB) and format
   - Verify storage bucket URL matches Firebase config
5. **Images Not Displaying**: Check if image URLs are accessible and CORS is configured

### Debug Mode

The application includes console logging for debugging:
- Firebase connection status
- Real-time listener setup/cleanup
- Content update operations
- Image upload progress

## License

This is a proof-of-concept application for educational purposes.
