# User Menu Dropdown - Contextual Menu Implementation

## Overview

Added a **contextual user menu dropdown** to the navbar that replicates the design from your screenshot. The menu appears when clicking on the user avatar and provides quick access to user actions.

## Features

### User Avatar Button
- **Orange gradient** circular button (`from-orange-500 to-orange-600`)
- **User initials** displayed (extracted from name or email)
- **Hover effect** with opacity change
- **Focus ring** for accessibility
- **Click to open** dropdown menu

### Dropdown Menu Structure

```
┌─────────────────────────────────────┐
│  [🟠 CP]  Carlos Peña              │
│           Senior Software Engineer  │
│           • Engineering             │
├─────────────────────────────────────┤
│  [👤] My Profile                   │
│  [⚙️] Settings                     │
├─────────────────────────────────────┤
│  [🚪] Log out                      │ (red text)
└─────────────────────────────────────┘
```

### Menu Sections

1. **Header Section**
   - Large avatar with initials
   - User name (extracted from email or provided)
   - Role/title subtitle

2. **Action Items**
   - **My Profile** - Navigate to user profile
   - **Settings** - Open settings page

3. **Sign Out** (separated)
   - Red text for emphasis
   - Logout icon
   - Calls `onSignOut` callback

## New Components

### [src/components/ui/dropdown-menu.tsx](src/components/ui/dropdown-menu.tsx)

Radix UI dropdown menu primitives with shadcn styling:
- `DropdownMenu` - Root component
- `DropdownMenuTrigger` - Button that opens menu
- `DropdownMenuContent` - Menu container
- `DropdownMenuItem` - Individual menu items
- `DropdownMenuSeparator` - Visual dividers

## Updated Navbar Component

### New Props

```typescript
interface NavbarProps {
  userEmail?: string;       // User email
  userName?: string;        // Full name (optional)
  userRole?: string;        // Role/department
  onSignOut?: () => void;   // Sign out callback
  onProfile?: () => void;   // Profile callback
  onSettings?: () => void;  // Settings callback
  showUserMenu?: boolean;   // Show dropdown menu
}
```

### Usage

```typescript
<Navbar
  userEmail="owner@residential.com"
  userName="Carlos Peña"
  userRole="Engineering"
  onSignOut={handleSignOut}
  onProfile={() => console.log('Go to profile')}
  onSettings={() => console.log('Go to settings')}
  showUserMenu
/>
```

## Smart Features

### 1. **Automatic Name Extraction**

If `userName` is not provided, it extracts from email:

```typescript
// Email: owner@residential.com
// Extracted: "Owner Residential"

// Email: carlos.pena@example.com
// Extracted: "Carlos Pena"
```

### 2. **Initials Generation**

Generates initials intelligently:

```typescript
// From name: "Carlos Peña" → "CP"
// From email: "owner@..." → "O"
// Fallback: "U"
```

### 3. **Conditional Menu Items**

Menu items only appear if callbacks are provided:

```typescript
{onProfile && (
  <DropdownMenuItem onClick={onProfile}>
    My Profile
  </DropdownMenuItem>
)}
```

## Implementation in Dashboard

### Before
```typescript
<Navbar
  userEmail={session?.user?.email}
  onSignOut={handleSignOut}
  showSignOut  // Old prop
/>
```

### After
```typescript
<Navbar
  userEmail={session?.user?.email}
  onSignOut={handleSignOut}
  showUserMenu  // New prop - enables dropdown
/>
```

## Visual Design

### Colors

**Avatar:**
- Background: `from-orange-500 to-orange-600`
- Text: White
- Size: 40px (navbar), 48px (dropdown header)

**Dropdown:**
- Width: 320px (`w-80`)
- Background: `bg-popover`
- Border: `border`
- Shadow: `shadow-md`
- Padding: 4px (`p-1`)

**Menu Items:**
- Hover: `bg-accent`
- Padding: 10px vertical (`py-2.5`)
- Icon spacing: 12px (`mr-3`)

**Log out:**
- Text color: Red (`text-red-600`)
- Maintains red on focus

### Icons

All icons are inline SVGs:
- **Profile**: User icon
- **Settings**: Gear icon
- **Log out**: Arrow with door icon

### Animations

Uses Radix UI animations:
- **Fade in/out** on open/close
- **Zoom** effect (95% to 100%)
- **Slide** from appropriate direction
- **Smooth transitions**

## Accessibility

✅ **Keyboard navigation** - Tab/Arrow keys
✅ **Focus management** - Proper focus ring
✅ **Screen readers** - ARIA labels
✅ **Escape key** - Closes menu
✅ **Click outside** - Closes menu

## Responsive Behavior

- **Desktop**: Full dropdown with all features
- **Mobile**: Same dropdown (adjusted positioning)
- **Touch**: Works with touch events

## Installation

### Dependencies

```bash
npm install @radix-ui/react-dropdown-menu
```

### Files Created

1. ✅ `src/components/ui/dropdown-menu.tsx` - Dropdown primitives
2. ✅ Updated `src/components/Navbar.tsx` - Integrated dropdown

### Files Modified

1. ✅ `src/pages/ResidentialDashboardPage.tsx` - Changed prop name

## Future Enhancements

Potential additions to the menu:

- 🔔 **Notifications** - Badge with unread count
- 🌙 **Theme toggle** - Light/Dark mode
- 🏢 **Residential selector** - For multi-residential users
- 👥 **Account switcher** - Multiple accounts
- 📱 **Mobile app link** - QR code/download
- ❓ **Help & Support** - Link to docs
- 🔐 **Privacy settings** - Quick access

## Testing

To test the dropdown menu:

1. **Start dev server**: `npm run dev`
2. **Login** as `owner@residential.com`
3. **Click avatar** (orange circle with initials)
4. **Verify menu appears** with:
   - User info header
   - Profile option
   - Settings option
   - Log out option (red)
5. **Test interactions**:
   - Hover over items
   - Click outside to close
   - Press Escape to close
   - Click Log out

## Example Menu Items

### Current Implementation

```tsx
<DropdownMenuItem onClick={onProfile}>
  <UserIcon />
  <span>My Profile</span>
</DropdownMenuItem>

<DropdownMenuItem onClick={onSettings}>
  <SettingsIcon />
  <span>Settings</span>
</DropdownMenuItem>

<DropdownMenuItem onClick={onSignOut}>
  <LogoutIcon />
  <span>Log out</span>
</DropdownMenuItem>
```

### Adding Custom Items

```tsx
<DropdownMenuItem onClick={() => navigate('/billing')}>
  <CreditCardIcon />
  <span>Billing</span>
</DropdownMenuItem>

<DropdownMenuItem onClick={() => navigate('/notifications')}>
  <BellIcon />
  <span>Notifications</span>
  <Badge>3</Badge>  {/* Unread count */}
</DropdownMenuItem>
```

## Comparison with Screenshot

Your screenshot shows:
- ✅ Circular avatar with initials
- ✅ User info header (name + role)
- ✅ "My Profile" option
- ✅ "Settings" option
- ✅ Separator line
- ✅ "Log out" in red

All features implemented! 🎉

## Build Status

✅ **Build passing** - No errors
✅ **TypeScript** - All types correct
✅ **Dependencies** - @radix-ui/react-dropdown-menu installed
✅ **Production ready**

## Summary

The navbar now has a professional contextual menu that:
- Matches your design reference
- Provides quick access to user actions
- Works seamlessly with existing auth system
- Follows accessibility best practices
- Is fully responsive and touch-friendly
