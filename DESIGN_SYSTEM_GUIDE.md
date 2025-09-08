# Izi Casting Design System Guide

This guide documents the design system implementation for the Izi Casting application, based on the specifications in `izi_design_system.json`.

## Color Palette

### Primary Colors
- **Primary**: `#4FC3F7` - Main brand color for primary actions
- **Secondary**: `#2196F3` - Secondary brand color for supporting elements
- **Background**: `#FAFAFA` - Main application background
- **Surface**: `#FFFFFF` - Card and component backgrounds

### Text Colors
- **Text Primary**: `#212121` - Main text color
- **Text Secondary**: `#757575` - Secondary text color

### Status Colors
- **Success**: `#4CAF50` - Success states and active indicators
- **Warning**: `#FF9800` - Warning states and recent time indicators
- **Error**: `#F44336` - Error states and danger actions
- **Inactive**: `#BDBDBD` - Inactive states and disabled elements

### Gray Scale
- **Gray 50**: `#FAFAFA` - Lightest background
- **Gray 100**: `#F5F5F5` - Hover states
- **Gray 200**: `#EEEEEE` - Borders and dividers
- **Gray 300**: `#E0E0E0` - Input borders
- **Gray 400**: `#BDBDBD` - Inactive elements
- **Gray 500**: `#9E9E9E` - Placeholder text
- **Gray 600**: `#757575` - Secondary text
- **Gray 700**: `#616161` - Muted text
- **Gray 800**: `#424242` - Dark text
- **Gray 900**: `#212121` - Primary text

## Typography

### Font Family
- **Primary**: Inter (with system font fallbacks)
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Font Sizes
- **XS**: 10px
- **SM**: 12px
- **Base**: 14px
- **LG**: 16px
- **XL**: 20px

## Spacing System

Based on 8px base unit:
- **XS**: 4px
- **SM**: 8px
- **MD**: 16px
- **LG**: 24px
- **XL**: 32px
- **XXL**: 48px

## Border Radius
- **SM**: 4px
- **MD**: 6px
- **LG**: 8px

## Shadows
- **SM**: `0px 1px 3px rgba(0, 0, 0, 0.08)`
- **MD**: `0px 2px 6px rgba(0, 0, 0, 0.12)`
- **LG**: `0px 4px 12px rgba(0, 0, 0, 0.16)`

## Components

### Buttons

#### Primary Button
```scss
.btn-primary {
  background-color: $primary;
  color: $surface;
}
```

#### Action Button
```scss
.btn-action {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid $gray-300;
  background-color: $surface;
  color: $text-secondary;
  font-size: 12px;
}
```

#### Icon Button
```scss
.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: transparent;
  color: $text-secondary;
}
```

### Form Elements

#### Input Field
```scss
.form-input {
  padding: 8px 12px;
  border: 1px solid $gray-300;
  border-radius: 4px;
  background-color: $surface;
  color: $text-primary;
}
```

#### Toggle Switch
```scss
.toggle-switch {
  width: 40px;
  height: 20px;
  border-radius: 10px;
  background-color: $inactive;
  
  &.active {
    background-color: $success;
  }
}
```

### Status Indicators

#### Status Badge
```scss
.status-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid;
  
  &.active {
    background-color: $success;
    border-color: $success;
  }
  
  &.inactive {
    background-color: $inactive;
    border-color: $inactive;
  }
}
```

#### Time Indicator
```scss
.time-indicator {
  font-size: 12px;
  
  &.recent { color: $warning; }
  &.old { color: $text-secondary; }
  &.active { color: $success; }
}
```

### Layout Components

#### Sidebar Section
```scss
.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background-color: $surface;
  border-right: 1px solid $gray-300;
}
```

#### Content Row Item
```scss
.content-row-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  min-height: 56px;
  background-color: $surface;
  border-bottom: 1px solid $gray-200;
}
```

## Utility Classes

### Color Utilities
- `.text-primary`, `.text-secondary`, `.text-success`, `.text-warning`, `.text-error`, `.text-inactive`
- `.bg-primary`, `.bg-secondary`, `.bg-surface`, `.bg-background`, `.bg-success`, `.bg-warning`, `.bg-error`

### Spacing Utilities
- `.mb-0` to `.mb-5` (margin-bottom)
- `.mt-0` to `.mt-5` (margin-top)
- `.p-0` to `.p-5` (padding)
- `.gap-1` to `.gap-5` (gap)

### Display Utilities
- `.d-flex`, `.d-block`, `.d-none`, `.d-inline-flex`
- `.justify-center`, `.justify-between`, `.justify-end`
- `.align-center`, `.align-start`, `.align-end`
- `.flex-column`, `.flex-wrap`, `.flex-1`

### Typography Utilities
- `.font-normal`, `.font-medium`, `.font-semibold`, `.font-bold`
- `.text-xs`, `.text-sm`, `.text-base`, `.text-lg`, `.text-xl`

### Border & Shadow Utilities
- `.border`, `.border-top`, `.border-bottom`, `.border-left`, `.border-right`
- `.rounded`, `.rounded-sm`, `.rounded-lg`, `.rounded-full`
- `.shadow-sm`, `.shadow-md`, `.shadow-lg`

## Usage Guidelines

1. **Consistency**: Always use the defined color variables and spacing system
2. **Typography**: Use Inter font family with appropriate weights
3. **Spacing**: Use the 8px base unit system for consistent spacing
4. **Shadows**: Use subtle shadows for depth and hierarchy
5. **States**: Implement hover, active, and disabled states for interactive elements
6. **Accessibility**: Ensure sufficient color contrast and focus states

## File Structure

```
src/styles/
├── _variables.scss          # Design system variables
├── _base.scss              # Base styles and typography
├── _utilities.scss         # Utility classes
├── main.scss              # Main stylesheet imports
└── components/
    ├── _buttons.scss       # Button components
    ├── _forms.scss         # Form elements
    ├── _sidebar.scss       # Sidebar and layout components
    ├── _login.scss         # Login page styles
    ├── _admin.scss         # Admin interface styles
    ├── _slides.scss        # Slide management styles
    └── _display.scss       # Display view styles
```

## Implementation Notes

- All colors are defined as SCSS variables for easy theming
- The design system uses a mobile-first approach
- Components are designed to be reusable and composable
- The system supports both light and dark themes (dark theme variables can be added)
- All interactive elements have proper hover and focus states
