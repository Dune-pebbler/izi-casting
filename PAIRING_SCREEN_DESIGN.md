# New Pairing Screen Design

## Overview
The pairing screen has been completely redesigned with a clean Apple-like aesthetic, featuring a 30-second countdown timer and automatic code refresh functionality.

## Design Features

### Visual Design
- **Clean Apple-like aesthetic** with minimal, modern styling
- **White input boxes** with subtle shadows and rounded corners
- **Retained background color** from settings
- **Typography** using Apple's SF Pro Display font family
- **Subtle animations** and transitions

### Timer Functionality
- **30-second countdown** timer for each pairing code
- **Visual progress bar** that shows remaining time
- **Color-coded timer bar**:
  - Blue (#007AFF) for normal countdown
  - Red (#FF3B30) when 5 seconds or less remain
- **Automatic code refresh** when timer reaches 0
- **Flashing animation** when time is running out (last 5 seconds)

### Code Display
- **5-digit pairing code** displayed in individual white boxes
- **Clean typography** with proper spacing
- **Flashing effect** when time is running out
- **Loading spinner** while generating new code

### User Experience
- **No mouse/keyboard required** - fully automated
- **Clear visual feedback** for time remaining
- **Error handling** with styled error messages
- **Responsive design** that works on different screen sizes

## Technical Implementation

### State Management
```javascript
const [codeTimeRemaining, setCodeTimeRemaining] = useState(30);
const [isCodeFlashing, setIsCodeFlashing] = useState(false);
```

### Timer Logic
- Countdown updates every second
- Flashing starts at 5 seconds remaining
- New code generated automatically at 0 seconds
- Timer resets to 30 seconds with new code

### Styling
- Uses CSS Grid and Flexbox for layout
- Apple-style color palette (#007AFF, #FF3B30, grays)
- Smooth transitions and animations
- Mobile-responsive design

## CSS Classes

### Main Components
- `.pairing-screen` - Main container
- `.pairing-content` - Content wrapper
- `.pairing-main` - Main content area
- `.pairing-code-section` - Code display section

### Code Display
- `.pairing-code-value` - Code container
- `.pairing-code-digit` - Individual digit boxes
- `.flashing` - Animation class for flashing effect

### Timer
- `.pairing-timer-container` - Timer bar container
- `.pairing-timer-bar` - Progress bar
- `.pairing-timer-text` - Time remaining text

### Loading
- `.loading-spinner` - Spinning animation
- `.generating-text` - Loading text

## Animations

### Flash Animation
```css
@keyframes flash {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.02); }
}
```

### Spinner Animation
```css
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

## Color Scheme
- **Primary Blue**: #007AFF (Apple's system blue)
- **Error Red**: #FF3B30 (Apple's system red)
- **Background**: Retained from settings
- **Text**: Black for contrast
- **Borders**: Light gray (#E5E5E7)

## Responsive Design
- Works on all screen sizes
- Maintains readability on small displays
- Proper spacing and sizing for touch interfaces
- Optimized for display screens without mouse/keyboard

This design provides a clean, professional appearance that matches Apple's design language while maintaining functionality for the pairing process.
