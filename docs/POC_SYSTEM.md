# POC System Documentation

## What is the POC System?

The Proof-of-Concept (POC) system allows you to test UI variations safely without affecting production. All changes are stored in-memory and never persisted to the database.

## Accessing POC

1. Navigate to `/aib/poc` (or `/poc` depending on your base path configuration)
2. Choose a variant to test
3. Interact with the UI (all changes are temporary)
4. Return to production at any time

## Current Variants

### Variant A: Unified Side Drawer
- **Route:** `/aib/poc/drawer-variants/a`
- **Description:** Single drawer on right side with tabs for NFRs and Reports
- **Features:**
  - Tab switcher: NFRs ↔ Report
  - Resizable drawer (drag left edge)
  - Live alignment updates
  - In-memory state (no persistence)
  - Opens by default showing NFRs tab

## Using POC Mode

- All data is mocked (pre-filled demo project with realistic NFRs)
- Changes are NOT saved to the database
- Click "Reset State" in POC banner to restore initial data
- Click "Back to Production" to return to `/aib/cloud-architecture`

## File Structure

```
frontend/src/modules/poc/
├── pages/
│   ├── POCIndex.tsx                    # Landing page
│   └── DrawerVariantsPOC.tsx           # Variant router
├── components/
│   ├── POCLayout.tsx                   # Shared wrapper with POC banner
│   └── VariantA_UnifiedDrawer.tsx      # Variant A implementation
├── context/
│   └── POCContext.tsx                  # In-memory state management
└── data/
    └── mockData.ts                     # Demo project with realistic NFRs
```

## How It Works

### In-Memory State
- `POCContext` provides state management without API calls
- `DEMO_PROJECT` contains all 8 NFR sections with realistic pre-filled data
- `calculateMockAlignment()` and `calculateMockCost()` provide real-time metrics
- All updates happen in React state only

### Isolation
- POC routes are wrapped in `POCProvider` (separate from production `ProjectProvider`)
- Uses lazy loading to avoid bloating main bundle
- No backend calls - everything runs client-side
- Can't accidentally save changes to database

## Removing POC System

If you want to completely remove the POC system:

### Step 1: Remove POC Routes

Edit `frontend/src/App.tsx`:

```typescript
// DELETE this entire block:
<Route path="/poc/*" element={
  <POCProvider>
    <Suspense fallback={<div className="p-8 text-center">Loading POC...</div>}>
      <Routes>
        <Route path="" element={<POCIndex />} />
        <Route path="drawer-variants/:variant" element={<DrawerVariantsPOC />} />
      </Routes>
    </Suspense>
  </POCProvider>
} />

// DELETE these imports:
import { lazy, Suspense } from 'react'
import { POCProvider } from './modules/poc/context/POCContext'
const POCIndex = lazy(() => import('./modules/poc/pages/POCIndex'))
const DrawerVariantsPOC = lazy(() => import('./modules/poc/pages/DrawerVariantsPOC'))
```

### Step 2: Delete POC Directory

```bash
rm -rf frontend/src/modules/poc
```

### Step 3: Clean Up Any POC Entry Points

If you added a "POC" button in the header/nav, remove it:

```typescript
// Search for and DELETE:
<button onClick={() => navigate('/poc')}>🧪 POC</button>
// or
<Link to="/poc">🧪 POC</Link>
```

### Step 4: Verify Build

```bash
cd frontend
npm run build
```

If there are no errors, POC system is fully removed.

### Step 5: Optional - Remove Documentation

```bash
rm docs/POC_SYSTEM.md
```

## Promoting POC to Production

If you want to make a POC variant the new production UI:

### Option 1: Copy and Adapt
1. Copy code from `VariantA_UnifiedDrawer.tsx` to `CloudArchitecturePage.tsx`
2. Replace `usePOC()` with `useProject()`
3. Replace mock data references with real API calls
4. Test thoroughly in production
5. Optionally remove POC system (see above)

### Option 2: Gradual Migration
1. Keep POC system for future experiments
2. Create new components in production using patterns from POC
3. Test with real data before fully switching
4. Deprecate old UI once new UI is stable

## Notes

- POC uses lazy loading (doesn't bloat main bundle)
- POC state is isolated (doesn't interfere with production)
- POC can remain in codebase indefinitely if useful for future experiments
- Drawer width is persisted to localStorage (`poc-drawer-width`)

## Testing Checklist

When testing a POC variant:

- [ ] Can navigate to `/aib/poc`
- [ ] Can see variant in list
- [ ] Can click to open variant
- [ ] POC banner is visible at top
- [ ] "Back to Production" works
- [ ] "Reset State" restores initial data
- [ ] Changes are NOT persisted (refresh page = data resets)
- [ ] No errors in browser console
- [ ] Production UI is unaffected (`/aib/cloud-architecture` still works)

## Troubleshooting

### POC routes return 404
- Verify `App.tsx` has POC routes added
- Check browser base path configuration (VITE_BASE_PATH)
- Try `/poc` if `/aib/poc` doesn't work

### POC loads but shows errors
- Check browser console for import errors
- Verify all POC files were created
- Run `npm install` to ensure dependencies are up to date

### Changes are being saved
- This shouldn't happen - POC uses in-memory state only
- If this occurs, you may have accidentally modified production code
- Check that `usePOC()` is being used, not `useProject()`

### Drawer won't resize
- Ensure you're dragging the left edge of the drawer (thin resize handle)
- Check that mouse events aren't being blocked by other elements
- Try refreshing the page

## Future Enhancements

To add more POC variants:

1. Create new component in `frontend/src/modules/poc/components/`
2. Add route in `DrawerVariantsPOC.tsx`
3. Add card to `POCIndex.tsx` landing page
4. Test with existing mock data from `POCContext`

Example:
```typescript
// In DrawerVariantsPOC.tsx
if (variant === 'b') {
  return <VariantB_TabSpecific />
}

// In POCIndex.tsx
<Link to="/aib/poc/drawer-variants/b">
  Try Variant B →
</Link>
```
