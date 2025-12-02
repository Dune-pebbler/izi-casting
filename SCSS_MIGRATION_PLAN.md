# SCSS Variable Migration Plan

## Overview

This document outlines the strategy for migrating from the current Tailwind-style color system (`$gray-500`, `$red-600`) to a semantic, shadcn-inspired design system using CSS custom properties for easy theming and dark mode support.

**Current System:** 108 lines of variables with Tailwind colors, aliases, and inconsistent naming
**Target System:** Semantic CSS custom properties (`--primary`, `--foreground`, `--border`) defined in `_variables_new.scss`

---

## Migration Statistics

### Variable Usage Across Codebase

**Most Used Colors:**
- `$primary` - 150+ occurrences (buttons, links, active states)
- `$text-primary` - 100+ occurrences (main text)
- `$text-secondary` - 80+ occurrences (secondary text)
- `$gray-*` series - 200+ total occurrences (borders, backgrounds, hover states)
- `$error`/`$danger` - 50+ occurrences (delete buttons, errors)
- `$success` - 30+ occurrences (success states)

**Hard-Coded Colors to Replace:**
- **218 hex color values** scattered across components
- **107 rgba() values** for opacity effects
- **Biggest offenders:**
  - `_slides.scss` - 43 hard-coded colors
  - `_slide-display.scss` - 46 hard-coded colors
  - `_teletekst.scss` - 19 colors (some intentional for theme)

### Files to Migrate
- **32 SCSS files** total (excluding node_modules)
- **26 component files** need migration
- **6 utility/base files** to update first

---

## Color Mapping Strategy

### Old → New Variable Mapping

```scss
// Brand Colors
$primary               → var(--primary)
$primary-dark          → var(--primary-hover) or var(--primary-active)
$secondary             → var(--secondary)

// Backgrounds & Surfaces
$background            → var(--background)
$surface / $white      → var(--surface)
$page-bg               → var(--background)

// Text Colors
$text-primary / $black → var(--foreground)
$text-secondary        → var(--foreground-secondary)
$text-tertiary         → var(--foreground-muted)

// Semantic Colors
$error / $danger       → var(--destructive)
$success               → var(--success)
$warning               → var(--warning)
$inactive / $disabled  → var(--inactive)

// UI Elements
$border-color          → var(--border)
$border-color-focus    → var(--ring)

// Gray Scale (Semantic Replacement)
$gray-50               → var(--muted) or var(--background)
$gray-100              → var(--muted-hover)
$gray-200              → var(--border)
$gray-300              → var(--border-hover) or var(--inactive)
$gray-400              → var(--muted-foreground)
$gray-500              → var(--foreground-muted)
$gray-600              → var(--foreground-secondary)
$gray-700              → var(--foreground)
$gray-800              → var(--foreground) with adjustments
$gray-900              → var(--foreground) with adjustments

// Contextual (Keep As-Is for Now)
$sidebar-bg            → var(--surface)
$sidebar-text          → var(--foreground)
$sidebar-border        → var(--border)
$sidebar-hover         → var(--muted-hover)
```

---

## Migration Challenges & Solutions

### 1. Darken/Lighten Functions

**Challenge:** Extensive use of `darken($primary, 8%)` and `lighten($primary, 5%)`

**Solution:** Use pre-calculated hover/active states
```scss
// OLD
background: $primary;
&:hover { background: darken($primary, 8%); }

// NEW
background: var(--primary);
&:hover { background: var(--primary-hover); }
```

### 2. Dynamic Opacity

**Challenge:** Many `rgba($primary, 0.1)` patterns (100+ instances)

**Solution:** Use pre-defined light variants
```scss
// OLD
background: rgba($primary, 0.1);

// NEW
background: var(--primary-light);
```

For custom opacity needs, use CSS color-mix (modern) or keep SCSS rgba with hex:
```scss
background: rgba(240, 113, 103, 0.1); // Acceptable for specific needs
```

### 3. Brand-Specific Colors

**Challenge:** Google button blue, YouTube red, etc.

**Solution:** Keep hard-coded for brand consistency
```scss
// Keep these hard-coded
.google-button {
  background: #4285f4; // Google brand color
}
```

### 4. Teletekst Theme Colors

**Challenge:** ANSI color palette for authentic teletekst styling

**Solution:** Keep hard-coded, document as intentional
```scss
// Intentionally hard-coded for theme authenticity
.teletekst-red { color: #ff0000; }
.teletekst-blue { color: #0000ff; }
```

### 5. Text Display Styling

**Challenge:** `_slides.scss` and `_slide-display.scss` have matching text styles

**Solution:** Create shared text formatting variables
```scss
// Add to _variables_new.scss
--text-display-primary: #1a1a1a;
--text-display-secondary: #666;
--text-display-muted: #999;
```

---

## Migration Phases

### Phase 1: Foundation (Easiest) - ~2 hours

**Goal:** Update utility files and base styles

**Files:**
1. `_utilities.scss` - Utility classes
2. `_base.scss` - Base HTML styles
3. `_overwrites.scss` - Framework overrides

**Steps:**
1. Import `_variables_new.scss` in `main.scss`
2. Replace old variables with new semantic ones
3. Test: Verify base styles render correctly

**Risk:** Low - These are simple, well-structured files

---

### Phase 2: Simple Components (Easy) - ~4 hours

**Goal:** Migrate straightforward UI components

**Files:**
4. `_forms.scss` - Input fields, selects, checkboxes
5. `_buttons.scss` - Button styles
6. `front-end/_fullscreen-indicator.scss`
7. `front-end/_progress-bar.scss`
8. `front-end/_display-container.scss`

**Steps:**
1. Replace `$gray-*` with semantic colors
2. Replace `$primary` with `var(--primary)`
3. Replace `darken()` with `var(--primary-hover)`
4. Test: Check admin form interactions

**Risk:** Low - Straightforward variable swaps

---

### Phase 3: Admin Components (Medium) - ~6 hours

**Goal:** Migrate admin interface components

**Files:**
9. `_sidebar.scss` - Sidebar navigation
10. `_devices.scss` - Device management
11. `_settings.scss` - Settings panel
12. `_playlist.scss` - Playlist management
13. `_feed-list.scss` - Feed list UI
14. `_feed.scss` - Feed display
15. `_modals.scss` - Shared modal styles
16. `_move-slide-modal.scss`
17. `_image-library.scss`

**Steps:**
1. Map all `$gray-*` to semantic equivalents contextually
2. Replace hard-coded colors with variables
3. Update hover/active states
4. Test: Navigate through all admin panels

**Risk:** Medium - Need to verify hover states and interactions

---

### Phase 4: Complex Admin (Medium-Hard) - ~4 hours

**Goal:** Migrate complex admin features

**Files:**
18. `_admin.scss` - Main admin layout
19. `_login.scss` - Login screen
20. `_trash-modal.scss` - Trash management

**Steps:**
1. Carefully map contextual grays
2. Handle login brand colors
3. Update trash preview styles
4. Test: Full admin workflow

**Risk:** Medium - More complex component interactions

---

### Phase 5: Slide Components (Hard) - ~6 hours

**Goal:** Migrate video and special slide types

**Files:**
21. `_video.scss` - Video slide styling
22. `_teletekst.scss` - Teletekst theme
23. `front-end/_pairing-screen.scss`
24. `front-end/_bottom-bar.scss`

**Steps:**
1. Keep brand colors for video platforms
2. Document intentional hard-coded teletekst colors
3. Update status bar theming
4. Test: All slide types in display view

**Risk:** Medium-High - Brand colors need careful handling

---

### Phase 6: Display Rendering (Hardest) - ~12 hours

**Goal:** Migrate the most complex display components

**Files:**
25. `front-end/_slide-display.scss` - Live slide rendering (46 hard-coded colors)
26. `_slides.scss` - Slide preview/editing (43 hard-coded colors, 2000+ lines)

**Steps:**
1. Create shared text display variables
2. Systematically replace hard-coded colors
3. Ensure editor preview matches display view
4. Handle text overlays and transitions
5. Test extensively: All layouts, all slide types

**Testing Checklist:**
- [ ] Text slides render correctly
- [ ] Image slides with text overlays work
- [ ] Video slides display properly
- [ ] Teletekst slides maintain theme
- [ ] All 8 layout types render correctly
- [ ] Transitions work smoothly
- [ ] Editor preview matches display
- [ ] Status bar theming works
- [ ] Progress bar colors correct

**Risk:** High - These files are critical for display functionality

---

## Implementation Steps

### Pre-Migration Setup

1. **Backup Current System**
   ```bash
   cp src/styles/_variables.scss src/styles/_variables_old_backup.scss
   ```

2. **Add New Variables to Build**

   In `src/styles/main.scss`:
   ```scss
   // Import new variables FIRST
   @import 'variables_new';

   // Then existing styles
   @import 'base';
   @import 'utilities';
   // ... rest of imports
   ```

3. **Create Git Branch**
   ```bash
   git checkout -b feature/scss-migration
   ```

### Migration Workflow (Per File)

1. **Open file for editing**
2. **Find all variable usages** (search for `$`)
3. **Replace according to mapping strategy**
4. **Remove hard-coded colors** where appropriate
5. **Update hover/active states** to use pre-calculated variants
6. **Test in browser** (admin and display views)
7. **Commit changes** with descriptive message
8. **Move to next file**

### Testing Checklist (Per Phase)

After each phase, verify:

**Admin Interface:**
- [ ] Forms render correctly
- [ ] Buttons have proper hover states
- [ ] Sidebar navigation works
- [ ] Modals open and display properly
- [ ] Slide editing interface functions
- [ ] Color inputs and pickers work
- [ ] Settings panel accessible
- [ ] Device management functional

**Display View:**
- [ ] Slides render correctly
- [ ] Transitions work
- [ ] Status bar displays
- [ ] Progress bar animates
- [ ] Text is readable
- [ ] Images display properly
- [ ] Videos play correctly

---

## Post-Migration Tasks

### 1. Clean Up Old Variables

Once migration is complete:
```bash
# Remove old variables file
rm src/styles/_variables.scss

# Rename new variables
mv src/styles/_variables_new.scss src/styles/_variables.scss
```

### 2. Update Imports

Update `main.scss`:
```scss
@import 'variables'; // Now points to new system
```

### 3. Remove Unused Files

```bash
rm src/styles/_variables_old_backup.scss # If no issues found
```

### 4. Documentation

Update `CLAUDE.md` with:
- New variable naming conventions
- How to add new semantic colors
- Dark mode implementation guide

---

## Dark Mode Implementation (Future)

Once migration is complete, dark mode is simple:

```scss
// In _variables_new.scss
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --surface: #1a1a1a;
    --foreground: #fafafa;
    --border: #2c2f32;
    // ... rest of dark theme
  }
}
```

Or via class-based theming:
```scss
[data-theme="dark"] {
  --background: #0a0a0a;
  // ... dark colors
}
```

---

## Timeline Estimate

- **Phase 1 (Foundation):** 2 hours
- **Phase 2 (Simple Components):** 4 hours
- **Phase 3 (Admin Components):** 6 hours
- **Phase 4 (Complex Admin):** 4 hours
- **Phase 5 (Slide Components):** 6 hours
- **Phase 6 (Display Rendering):** 12 hours
- **Testing & Polish:** 4 hours
- **Documentation:** 2 hours

**Total Estimated Time:** ~40 hours (1 week of focused work)

Can be done incrementally, one phase at a time, with testing between phases.

---

## Risk Mitigation

### Version Control Strategy

```bash
# Create feature branch
git checkout -b feature/scss-migration

# Commit after each phase
git commit -m "Phase 1: Migrate foundation files"
git commit -m "Phase 2: Migrate simple components"
# etc.

# If issues arise, can revert specific commits
git revert HEAD~1
```

### Rollback Plan

If critical issues are discovered:
1. Revert to previous commit
2. Fix specific issue
3. Re-run testing checklist
4. Continue migration

### Browser Testing

Test in:
- Chrome (primary)
- Firefox
- Safari
- Mobile Safari (iOS)
- Chrome Mobile (Android)

---

## Success Criteria

Migration is complete when:

- [ ] All SCSS files use new semantic variables
- [ ] No references to `$gray-*`, `$red-*` Tailwind colors
- [ ] Hard-coded colors reduced by 80%+
- [ ] Admin interface renders identically
- [ ] Display view renders identically
- [ ] All interactive states work (hover, active, focus)
- [ ] No console errors
- [ ] Dark mode can be implemented by swapping CSS custom properties
- [ ] Code is more maintainable and semantic

---

## Additional Resources

### Variable Reference Quick Guide

```scss
// Common patterns
.button-primary {
  background: var(--primary);
  color: var(--primary-foreground);
  border: 1px solid var(--primary);

  &:hover { background: var(--primary-hover); }
  &:active { background: var(--primary-active); }
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--foreground);
}

.input {
  background: var(--input);
  border: 1px solid var(--input-border);
  color: var(--foreground);

  &:hover { border-color: var(--border-hover); }
  &:focus {
    outline: 2px solid var(--ring);
    border-color: var(--primary);
  }
}

.danger-button {
  background: var(--destructive);
  color: var(--destructive-foreground);

  &:hover { background: var(--destructive-hover); }
}

.muted-text {
  color: var(--foreground-muted);
}

.disabled {
  background: var(--muted);
  color: var(--disabled-foreground);
}
```

---

## Questions / Issues

If you encounter edge cases during migration, document them here:

- Issue: [Description]
- Solution: [How it was resolved]
- File: [Affected file]

---

**Last Updated:** 2025-12-02
**Status:** Ready to begin Phase 1
