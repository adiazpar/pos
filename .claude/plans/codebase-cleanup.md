# Codebase Cleanup Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up dead code, consolidate duplicate patterns, and split monolithic files for maintainability.

**Architecture:** Extract shared hooks for common patterns, split large page files into focused components, organize CSS by concern.

**Tech Stack:** Next.js 15, React 18, TypeScript, PocketBase

---

## Phase 1: Quick Wins

### Task 1: Remove Dead CSS Classes

**Files:**
- Modify: `src/app/globals.css`

- [ ] Remove `.skeleton` class (~line 3467)
- [ ] Remove `.success-toast` class (~line 3643)
- [ ] Remove `.error-toast` class (~line 3690)
- [ ] Remove `.empty-state-animated` class (~line 4119)
- [ ] Remove `.empty-state-lottie` class (~line 4129)
- [ ] Remove `.glass` and `.dark .glass` classes (~line 4137)
- [ ] Remove `.lottie-placeholder` class (~line 4150)
- [ ] Verify build passes

---

### Task 2: Remove Duplicate phoneToAuthEmail Function

**Files:**
- Modify: `src/contexts/auth-context.tsx`

- [ ] Find the local `phoneToAuthEmail` function in auth-context.tsx
- [ ] Replace with import from `@/lib/countries`
- [ ] Verify build passes

---

### Task 3: Create usePocketBaseData Hook

**Files:**
- Create: `src/hooks/usePocketBaseData.ts`
- Modify: `src/hooks/index.ts` (if exists, or create barrel export)

- [ ] Create hook with cancellation pattern:
```typescript
export function usePocketBaseData<T>(
  collectionName: string,
  options?: { sort?: string; expand?: string; filter?: string }
) {
  // Implements cancelled flag pattern used across pages
}
```
- [ ] Export from hooks index
- [ ] Verify build passes

---

### Task 4: Create useResourceModal Hook

**Files:**
- Create: `src/hooks/useResourceModal.ts`

- [ ] Create hook encapsulating common modal state:
```typescript
export function useResourceModal<T>() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<T | null>(null)
  // ... handlers
}
```
- [ ] Export from hooks index
- [ ] Verify build passes

---

### Task 5: Create usePocketBaseOperation Hook

**Files:**
- Create: `src/hooks/usePocketBaseOperation.ts`

- [ ] Create hook for CRUD operations with error handling:
```typescript
export function usePocketBaseOperation() {
  const { pb } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const execute = useCallback(async (
    operation: () => Promise<any>,
    options?: { errorMessage?: string; onSuccess?: () => void }
  ) => { ... }, [])

  return { execute, isLoading, error, setError, clearError }
}
```
- [ ] Export from hooks index
- [ ] Verify build passes

---

## Phase 2: Split Monolithic Files

### Task 6: Split globals.css into Organized Files

**Files:**
- Create: `src/app/styles/` directory
- Create: `src/app/styles/base.css` (~350 lines)
- Create: `src/app/styles/buttons.css` (~450 lines)
- Create: `src/app/styles/forms.css` (~350 lines)
- Create: `src/app/styles/interactive.css` (~400 lines)
- Create: `src/app/styles/animations.css` (~500 lines)
- Create: `src/app/styles/modal.css` (~300 lines)
- Create: `src/app/styles/utilities.css` (~150 lines)
- Modify: `src/app/globals.css` (reduce to imports only)

- [ ] Create styles directory
- [ ] Extract base layer (CSS variables, Tailwind directives, dark mode)
- [ ] Extract button styles (.btn-*)
- [ ] Extract form styles (input, select, textarea)
- [ ] Extract interactive components (list items, cards, balance hero)
- [ ] Extract animations (@keyframes, transition utilities)
- [ ] Extract modal/toast styles
- [ ] Extract utilities (skeleton, reduced motion)
- [ ] Update globals.css to import all files
- [ ] Verify build passes and styles work

---

### Task 7: Extract Shared Hooks from productos/page.tsx

**Files:**
- Create: `src/lib/products.ts` (constants, types)
- Create: `src/hooks/useProductFilters.ts`
- Create: `src/hooks/useProductCrud.ts`
- Create: `src/hooks/useOrderManagement.ts`

- [ ] Extract CATEGORY_CONFIG, FILTER_CONFIG, SORT_OPTIONS to lib/products.ts
- [ ] Extract filter/sort state management to useProductFilters.ts
- [ ] Extract product CRUD handlers to useProductCrud.ts
- [ ] Extract order handlers to useOrderManagement.ts
- [ ] Update productos/page.tsx to use extracted hooks
- [ ] Verify build passes

---

### Task 8: Extract Components from productos/page.tsx

**Files:**
- Create: `src/components/productos/` directory
- Create: `src/components/productos/ProductsTab.tsx`
- Create: `src/components/productos/OrdersTab.tsx`
- Create: `src/components/productos/ProductModal.tsx`
- Create: `src/components/productos/OrderModal.tsx`
- Create: `src/components/productos/AiPipelineNavigator.tsx`
- Modify: `src/app/(dashboard)/productos/page.tsx` (reduce to ~200 lines)

- [ ] Create productos components directory
- [ ] Extract AiPipelineNavigator component
- [ ] Extract ProductsTab component (products list, filters, search)
- [ ] Extract OrdersTab component (orders list, filters)
- [ ] Extract ProductModal component (add/edit product form)
- [ ] Extract OrderModal component (create/edit order)
- [ ] Update main page to compose extracted components
- [ ] Verify build passes

---

### Task 9: Extract Components from ajustes/equipo/page.tsx

**Files:**
- Create: `src/components/equipo/` directory
- Create: `src/components/equipo/RoleCard.tsx`
- Create: `src/components/equipo/RoleSelectionContent.tsx`
- Create: `src/components/equipo/CodeGeneratedContent.tsx`
- Create: `src/components/equipo/UserDetailsStep.tsx`
- Create: `src/components/equipo/PhoneChangeStep.tsx`
- Create: `src/components/equipo/RoleChangeStep.tsx`
- Create: `src/hooks/useTeamManagement.ts`
- Modify: `src/app/(dashboard)/ajustes/equipo/page.tsx` (reduce to ~300 lines)

- [ ] Create equipo components directory
- [ ] Extract RoleCard component
- [ ] Extract RoleSelectionContent component
- [ ] Extract CodeGeneratedContent component
- [ ] Extract UserDetailsStep component
- [ ] Extract PhoneChangeStep component (form + buttons)
- [ ] Extract RoleChangeStep component (form + buttons)
- [ ] Extract useTeamManagement hook (CRUD operations)
- [ ] Update main page to compose extracted components
- [ ] Verify build passes

---

### Task 10: Extract Components from caja/page.tsx

**Files:**
- Create: `src/lib/cash.ts` (constants, calculations)
- Create: `src/hooks/useCashMovements.ts`
- Create: `src/hooks/useCashSession.ts`
- Create: `src/components/caja/MovementsList.tsx`
- Create: `src/components/caja/AddMovementModal.tsx`
- Create: `src/components/caja/EditMovementModal.tsx`
- Modify: `src/app/(dashboard)/caja/page.tsx` (reduce to ~250 lines)

- [ ] Extract CATEGORY_LABELS and constants to lib/cash.ts
- [ ] Extract movement CRUD to useCashMovements.ts
- [ ] Extract session management to useCashSession.ts
- [ ] Extract MovementsList component
- [ ] Extract AddMovementModal component
- [ ] Extract EditMovementModal component
- [ ] Update main page to compose extracted components
- [ ] Verify build passes

---

## Verification

- [ ] Run full build: `npm run build`
- [ ] Test all pages manually
- [ ] Commit with descriptive message

---

## Summary

| Phase | Tasks | Est. Lines Saved |
|-------|-------|------------------|
| Phase 1 | 5 tasks | ~50 dead code + ~440 via hooks |
| Phase 2 | 5 tasks | Reorganization, better maintainability |

**Total estimated impact:**
- Remove ~50 lines dead CSS
- Create 5 reusable hooks (save ~440 lines across app)
- Split 4 monolithic files into ~35 focused files
- Average file size reduced from 1,500+ to ~200 lines
