

# Premium UI Upgrade — Dashboard, Admin Panel & App-wide Polish

## Overview
Elevate the entire app interior (dashboard, admin, settings, profile, and all list pages) to match the polished, premium feel of the landing page. This involves refining card styles, adding subtle gradient accents, improving spacing, enhancing the sidebar, and creating a more cohesive visual identity throughout.

## What Changes

### 1. Enhanced CSS Variables & Utility Classes
- Add new utility classes: `.premium-card` (subtle gradient border glow on hover), `.stat-card` (gradient icon backgrounds), `.page-header` (consistent header with gradient accent line)
- Add a subtle radial gradient background overlay to the main content area (matching the landing page's `gradient-bg-subtle`)
- Refine glass-card hover states with smoother transitions and subtle primary border glow

### 2. Dashboard Page Overhaul
- Add gradient accent line under the welcome header
- Upgrade KPI stat cards: gradient icon backgrounds (green-to-blue), larger icons, bolder typography, subtle shimmer on hover
- Improve "Recent Funnels" cards with status badge pills (like landing pages), hover glow effect
- Add the `gradient-bg-subtle` background overlay to the main content area

### 3. Admin Dashboard Polish
- Upgrade admin KPI cards with colored gradient icon containers (matching each metric's semantic color)
- Add gradient accent underline to the "Admin Dashboard" header
- Improve card hover states with subtle border glow

### 4. Sidebar Refinements
- Add a subtle gradient accent line at the top of the sidebar (matching the landing page nav)
- Improve active nav item styling: gradient left border indicator instead of just background tint
- Refine the logo area with slightly more padding and polish

### 5. All List Pages (Funnels, Videos, Landing Pages, Leads, etc.)
- Standardize page headers with consistent gradient accent
- Improve search bar styling with better focus states (matching auth input glow)
- Upgrade filter tab pills with smoother active states
- Add subtle hover glow to all list item cards

### 6. Settings & Profile Pages
- Upgrade settings cards with icon containers (rounded gradient backgrounds)
- Add section dividers with subtle gradient lines
- Better spacing and visual hierarchy

### 7. DashboardLayout Main Content Area
- Apply `gradient-bg-subtle` background to the main content wrapper so every page gets the premium ambient glow
- This single change elevates all pages at once

## Files to Modify
- `src/index.css` — new utility classes
- `src/components/layout/DashboardLayout.tsx` — gradient bg, sidebar accent
- `src/components/layout/AdminLayout.tsx` — admin tab styling
- `src/pages/Dashboard.tsx` — premium KPI cards, header
- `src/pages/AdminDashboard.tsx` — premium admin cards
- `src/pages/SettingsPage.tsx` — enhanced card styling
- `src/pages/ProfilePage.tsx` — visual polish
- `src/pages/FunnelsPage.tsx` — card hover effects
- `src/pages/VideosPage.tsx` — card hover effects
- `src/pages/LandingPagesPage.tsx` — card hover effects

## Technical Approach
- All changes are CSS/styling only — no logic, data, or auth changes
- Leverage existing CSS variable system and Tailwind utilities
- Add 3-4 new reusable utility classes in `index.css`
- One key change in `DashboardLayout` (gradient bg on main area) will uplift all pages simultaneously

