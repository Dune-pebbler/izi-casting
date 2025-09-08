# SCSS Cursor Rules for Component-Specific Styling

## Overview
The goal of component-specific SCSS files is to maintain the exact same nested structure as the HTML/JSX in the React components. This ensures consistency, maintainability, and makes it easy to locate and modify styles for specific elements.

## File Structure
```
src/styles/
├── _variables.scss          # Global variables and design tokens
├── _base.scss              # Base styles and resets
├── _overwrites.scss        # Third-party library overrides
├── _utilities.scss         # Utility classes
└── components/
    ├── _component-name.scss # Component-specific styles
    └── _another-component.scss
```

## Core Principles

### 1. **Mirror the HTML Structure Exactly**
- Follow the exact nesting hierarchy from the JSX/HTML
- Use the same class names and structure
- Maintain the same logical grouping

### 2. **Use BEM-like Naming Convention**
- `.component-name` - Main component container
- `.component-name__element` - Child elements (optional)
- `.component-name--modifier` - State modifiers

### 3. **Consistent Indentation and Spacing**
- Use 2 spaces for indentation
- Add blank lines between major sections
- Group related styles together

## SCSS Structure Rules

### Component Container
```scss
.component-name {
  // Base styles for the component
  display: flex;
  flex-direction: column;
  
  // Use & for pseudo-selectors and modifiers
  &:hover {
    // Hover styles
  }
  
  &.modifier {
    // Modifier styles
  }
}
```

### Nested Elements
```scss
.component-name {
  // Container styles
  
  .element-name {
    // Element styles
    
    .nested-element {
      // Nested element styles
    }
  }
}
```

### Pseudo-selectors and States
```scss
.component-name {
  .element-name {
    &:hover {
      // Hover state
    }
    
    &:focus {
      // Focus state
    }
    
    &:disabled {
      // Disabled state
    }
  }
}
```

### Media Queries
```scss
.component-name {
  .element-name {
    // Base styles
    
    @media (max-width: $breakpoint-md) {
      // Responsive styles
    }
  }
}
```

## Example: Sidebar Component

### JSX Structure (from Sidebar.js):
```jsx
<div className="sidebar">
  <button className="sidebar-toggle-btn">...</button>
  <div className="sidebar-logo">...</div>
  <div className="sidebar-section">
    <h2>Schermen ({linkedDevices.length})</h2>
    <div className="sidebar-content">
      <div className="pairing-section">...</div>
      <div className="devices-list">...</div>
    </div>
  </div>
</div>
```

### Corresponding SCSS Structure:
```scss
.sidebar {
  // Base sidebar styles
  
  .sidebar-toggle-btn {
    // Toggle button styles
  }
  
  .sidebar-logo {
    // Logo section styles
  }
  
  .sidebar-section {
    // Section container styles
    
    h2 {
      // Section heading styles
    }
    
    .sidebar-content {
      // Content wrapper styles
      
      .pairing-section {
        // Pairing section styles
      }
      
      .devices-list {
        // Devices list styles
      }
    }
  }
}
```

## Best Practices

### 1. **Group Related Styles**
```scss
.component-name {
  // Layout and positioning
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  
  // Typography
  font-family: $font-family-base;
  font-size: $font-size-base;
  color: $text-primary;
  
  // Visual styling
  background-color: $surface;
  border: 1px solid $border-color;
  border-radius: $border-radius-md;
  
  // Transitions and animations
  transition: $transition-base;
}
```

### 2. **Use Variables for Consistency**
```scss
.component-name {
  padding: $spacing-md;
  margin-bottom: $spacing-lg;
  border-radius: $border-radius-md;
  color: $text-primary;
  background-color: $surface;
  border: 1px solid $border-color;
}
```

### 3. **Handle States and Modifiers**
```scss
.component-name {
  // Base styles
  
  &.collapsed {
    // Collapsed state
    transform: translateX(-100%);
  }
  
  &.expanded {
    // Expanded state
    transform: translateX(0);
  }
  
  &.loading {
    // Loading state
    opacity: 0.7;
    pointer-events: none;
  }
}
```

### 4. **Responsive Design**
```scss
.component-name {
  .element-name {
    // Base styles
    
    @media (max-width: $breakpoint-sm) {
      // Small screen adjustments
      font-size: $font-size-sm;
      padding: $spacing-sm;
    }
    
    @media (max-width: $breakpoint-md) {
      // Medium screen adjustments
      flex-direction: column;
    }
  }
}
```

### 5. **Animation and Transitions**
```scss
.component-name {
  .element-name {
    transition: $transition-base;
    
    &:hover {
      transform: scale(1.05);
    }
    
    &.animated {
      animation: slideIn 0.3s ease-out;
    }
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Common Patterns

### 1. **Form Elements**
```scss
.component-name {
  .form-group {
    margin-bottom: $spacing-md;
    
    label {
      display: block;
      margin-bottom: $spacing-xs;
      font-weight: $font-weight-medium;
      color: $text-primary;
    }
    
    input, select, textarea {
      width: 100%;
      padding: $spacing-sm;
      border: 1px solid $border-color;
      border-radius: $border-radius-sm;
      
      &:focus {
        outline: none;
        border-color: $primary;
        box-shadow: 0 0 0 2px rgba($primary, 0.2);
      }
    }
  }
}
```

### 2. **Button Styles**
```scss
.component-name {
  .btn {
    padding: $spacing-sm $spacing-md;
    border: none;
    border-radius: $border-radius-sm;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: $transition-base;
    
    &.btn-primary {
      background-color: $primary;
      color: $surface;
      
      &:hover:not(:disabled) {
        background-color: darken($primary, 8%);
      }
      
      &:disabled {
        background-color: $gray-400;
        cursor: not-allowed;
      }
    }
  }
}
```

### 3. **Modal and Overlay Styles**
```scss
.component-name {
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal {
    background-color: $surface;
    border-radius: $border-radius-lg;
    padding: $spacing-xl;
    max-width: 600px;
    width: 90%;
    box-shadow: $shadow-lg;
  }
}
```

## File Organization

### 1. **Import Order in main.scss**
```scss
// 1. Variables and base
@import 'variables';
@import 'base';
@import 'overwrites';
@import 'utilities';

// 2. Component styles (alphabetical order)
@import 'components/admin';
@import 'components/buttons';
@import 'components/display';
@import 'components/forms';
@import 'components/login';
@import 'components/sidebar';
@import 'components/slides';
```

### 2. **Component File Structure**
```scss
// _component-name.scss

// 1. Main component container
.component-name {
  // Base styles
}

// 2. Major sections
.component-name {
  .section-name {
    // Section styles
  }
}

// 3. Interactive elements
.component-name {
  .interactive-element {
    // Base styles
    
    &:hover, &:focus, &:active {
      // State styles
    }
  }
}

// 4. Responsive adjustments
@media (max-width: $breakpoint-md) {
  .component-name {
    // Responsive styles
  }
}
```

## Validation Checklist

Before committing SCSS files, ensure:

- [ ] SCSS structure mirrors the HTML/JSX structure exactly
- [ ] All class names match between component and styles
- [ ] Proper nesting and indentation (2 spaces)
- [ ] Variables are used for colors, spacing, and typography
- [ ] States and modifiers are properly handled
- [ ] Responsive design considerations are included
- [ ] Transitions and animations are smooth
- [ ] File is imported in main.scss
- [ ] No duplicate or conflicting styles
- [ ] Proper use of SCSS features (nesting, variables, mixins)

## Common Mistakes to Avoid

1. **Over-nesting** - Don't go deeper than 4-5 levels
2. **Missing states** - Always handle hover, focus, active states
3. **Hard-coded values** - Use variables for consistency
4. **Inconsistent naming** - Follow the established naming convention
5. **Missing responsive design** - Consider mobile and tablet layouts
6. **Poor organization** - Group related styles together
7. **Ignoring accessibility** - Ensure focus states and contrast ratios

## Tools and Extensions

- **VS Code**: SCSS IntelliSense, SCSS Formatter
- **Linting**: stylelint with SCSS rules
- **Preprocessing**: node-sass or sass
- **Validation**: CSS Validator, Browser DevTools

Remember: The goal is to make the SCSS as readable and maintainable as the HTML/JSX it styles. When in doubt, refer back to the component structure and maintain that same logical organization in your styles.
