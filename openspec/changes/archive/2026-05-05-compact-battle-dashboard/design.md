# Design: Compact Battle Analysis Dashboard

## Component Changes

### 1. `ResultsPanel` (Main Container)
- Reduce outer padding: `p-6` → `p-4`
- Reduce section gap: `space-y-6` → `space-y-4`
- Shrink header: Reduce padding or font size of "Battle Analysis Dashboard"

### 2. `MoveResultColumn`
- Reduce outer gap: `space-y-4` → `space-y-2`
- Reduce inner padding of the gray container: `p-6` → `p-4`
- Tighten gap between sections: `space-y-6` → `space-y-4`

### 3. Health Status Section
- Shrink HP bar height: `h-3` → `h-2`
- Shrink Incoming Impact Range box:
  - Padding: `p-4` → `p-2`
  - Text: `text-3xl` → `text-xl`
  - Margin: `mt-2` → `mt-1`

### 4. Move Damage Assessment Section
- Shrink move cards:
  - Padding: `p-4` → `p-2`
  - Text: `text-2xl` → `text-lg`
- Shrink empty slots: `h-16` → `h-10`
- Reduce card gap: `gap-3` → `gap-2`

### 5. VS Divider
- Shrink "VS" circle size: `w-10 h-10` → `w-8 h-8`

## Responsive Design
Ensure the grid layout remains effective but prioritizes vertical density on all screens.
