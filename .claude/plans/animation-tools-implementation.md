# Animation Tools Implementation Plan

## Overview

This plan outlines the animation tools and strategies to enhance the Chifles business management app with high-quality, performant animations that improve user experience without sacrificing speed.

---

## Recommended Tool Stack

| Tool | Purpose | Bundle Size | Cost |
|------|---------|-------------|------|
| **Motion** | UI transitions, modals, forms | ~15kb | Free (MIT) |
| **AutoAnimate** | List animations | ~2kb | Free (MIT) |
| **Lottie** | Illustrations, feedback | ~50kb | Free player |
| **CSS Transitions** | Simple hover/focus states | 0kb | Free |

**Total bundle impact**: ~70kb

### Installation

```bash
npm install motion @formkit/auto-animate lottie-react
```

---

## Tool Details

### 1. Motion (formerly Framer Motion)

**What it is**: The industry-standard React animation library, providing declarative animations with GPU acceleration.

**Documentation**: https://motion.dev/docs/react

**Key features**:
- `AnimatePresence` for exit animations
- Layout animations (automatic position/size transitions)
- Gesture support (drag, hover, tap)
- Scroll-linked animations
- Spring physics

**When to use**:
- Modal open/close transitions
- Form step transitions
- Page transitions
- Drawer/sidebar animations
- Accordion expand/collapse
- Toast notifications

---

### 2. AutoAnimate

**What it is**: Zero-config animation utility that automatically animates DOM changes (add, remove, reorder).

**Documentation**: https://auto-animate.formkit.com/

**Key features**:
- Single line of code to enable
- Automatic detection of DOM changes
- Works with any framework
- Tiny bundle size (~2kb)

**When to use**:
- Product lists
- Cart items
- Sale items in current transaction
- Order items
- Any list where items are added/removed/reordered

---

### 3. Lottie (via lottie-react)

**What it is**: JSON-based animation format for vector animations created in After Effects or Lottie Creator.

**Documentation**: https://lottiereact.com/

**Key features**:
- Scalable vector animations
- Small file sizes
- Interactive controls (play, pause, loop)
- Large free library at LottieFiles.com

**When to use**:
- Success/error feedback animations
- Loading states
- Empty states (no products, no sales)
- Onboarding illustrations
- Branded animations

**Free animation sources**:
- https://lottiefiles.com/free-animations
- https://lordicon.com/ (icon animations)

---

### 4. CSS Transitions

**What it is**: Native browser transitions requiring no JavaScript.

**When to use**:
- Button hover/active states
- Focus indicators
- Color changes
- Simple opacity fades
- Transform effects on hover

---

## Implementation by Feature Area

### Ventas (Sales Register)

| Element | Animation | Tool |
|---------|-----------|------|
| Add item to cart | Slide in from right | AutoAnimate |
| Remove item | Fade + slide out | AutoAnimate |
| Quantity change | Number counter | Motion |
| Payment method select | Scale + highlight | CSS |
| Sale complete | Success checkmark | Lottie |
| Total update | Number morph | Motion |

**Example - Cart list with AutoAnimate**:
```tsx
import { useAutoAnimate } from '@formkit/auto-animate/react'

function SaleItems({ items }) {
  const [parent] = useAutoAnimate()

  return (
    <div ref={parent} className="space-y-2">
      {items.map(item => (
        <SaleItemRow key={item.id} item={item} />
      ))}
    </div>
  )
}
```

**Example - Sale success feedback**:
```tsx
import Lottie from 'lottie-react'
import successAnimation from '@/assets/animations/success-check.json'

function SaleSuccess() {
  return (
    <Lottie
      animationData={successAnimation}
      loop={false}
      style={{ width: 120, height: 120 }}
    />
  )
}
```

---

### Caja (Cash Drawer)

| Element | Animation | Tool |
|---------|-----------|------|
| Open drawer | Slide down + fade in content | Motion |
| Close drawer | Slide up + fade out | Motion |
| Cash count update | Number counter | Motion |
| Transaction entry | Slide in | AutoAnimate |
| Balance mismatch warning | Shake + pulse | Motion |

**Example - Drawer open/close**:
```tsx
import { motion, AnimatePresence } from 'motion/react'

function CashDrawerPanel({ isOpen, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

---

### Productos (Product Catalog)

| Element | Animation | Tool |
|---------|-----------|------|
| Product grid load | Staggered fade in | Motion |
| Add new product | Slide in | AutoAnimate |
| Delete product | Fade + scale out | AutoAnimate |
| Toggle active/inactive | Color transition | CSS |
| Empty state | Illustrated animation | Lottie |

**Example - Staggered grid load**:
```tsx
import { motion } from 'motion/react'

function ProductGrid({ products }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {products.map((product, i) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <ProductCard product={product} />
        </motion.div>
      ))}
    </div>
  )
}
```

---

### Modals & Forms

| Element | Animation | Tool |
|---------|-----------|------|
| Modal backdrop | Fade in | Motion |
| Modal content | Scale + fade | Motion |
| Form step change | Slide left/right | Motion |
| Validation error | Shake input | Motion |
| Submit loading | Spinner | Lottie or CSS |
| Submit success | Checkmark | Lottie |

**Example - Modal with backdrop**:
```tsx
import { motion, AnimatePresence } from 'motion/react'

function Modal({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-xl"
            initial={{ opacity: 0, scale: 0.95, y: '-45%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-45%' }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

**Example - Multi-step form**:
```tsx
import { motion, AnimatePresence } from 'motion/react'

function MultiStepForm({ step, children }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

---

### Navigation & Layout

| Element | Animation | Tool |
|---------|-----------|------|
| Page transitions | Fade + slide | Motion |
| Bottom nav active | Scale indicator | CSS |
| Sidebar toggle | Slide + backdrop | Motion |
| Pull to refresh | Spinner rotation | Lottie/CSS |
| Tab switch | Underline slide | Motion (layout) |

**Example - Bottom nav indicator**:
```tsx
import { motion } from 'motion/react'

function BottomNav({ activeTab }) {
  return (
    <nav className="flex">
      {tabs.map(tab => (
        <button key={tab.id} className="relative flex-1 py-3">
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"
            />
          )}
        </button>
      ))}
    </nav>
  )
}
```

---

### Feedback & States

| State | Animation | Tool |
|-------|-----------|------|
| Loading spinner | Rotation | CSS or Lottie |
| Skeleton loaders | Shimmer | CSS |
| Success | Checkmark burst | Lottie |
| Error | Shake + X icon | Motion + Lottie |
| Empty state | Illustrated loop | Lottie |
| Offline indicator | Pulse | CSS |
| Sync in progress | Rotating arrows | Lottie |

---

## Animation Timing Guidelines

### Durations
| Animation Type | Duration |
|----------------|----------|
| Micro-interactions (hover, tap) | 100-150ms |
| Small transitions (fade, slide) | 200ms |
| Modal/drawer open | 200-250ms |
| Page transitions | 250-300ms |
| Attention-grabbing (success) | 400-600ms |

### Easing
| Direction | Easing | CSS/Motion Value |
|-----------|--------|------------------|
| Enter/appear | ease-out | `[0, 0, 0.2, 1]` |
| Exit/leave | ease-in | `[0.4, 0, 1, 1]` |
| Movement | ease-in-out | `[0.4, 0, 0.2, 1]` |
| Spring | spring | `{ type: 'spring', damping: 20 }` |

### Motion Values
| Property | Enter | Exit |
|----------|-------|------|
| Opacity | 0 -> 1 | 1 -> 0 |
| Scale | 0.95 -> 1 | 1 -> 0.95 |
| Y offset | 10-20px -> 0 | 0 -> -10px |
| X offset (forward) | 20px -> 0 | 0 -> -20px |

---

## Accessibility

### Reduced Motion Support

Always respect user preferences for reduced motion:

```tsx
import { useReducedMotion } from 'motion/react'

function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
    >
      Content
    </motion.div>
  )
}
```

Or globally via CSS:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Performance Guidelines

1. **Animate transform and opacity only** - These properties don't trigger layout recalculation
2. **Use `will-change` sparingly** - Only on elements about to animate
3. **Avoid animating during data entry** - Keep the sales flow fast
4. **Limit simultaneous animations** - Max 3-4 elements animating at once
5. **Use `layout` prop carefully** - Can be expensive on large lists
6. **Lazy load Lottie files** - Don't bundle all animations upfront

---

## Recommended Lottie Animations to Download

From LottieFiles.com (free):

| Use Case | Search Terms | Suggested Size |
|----------|--------------|----------------|
| Sale success | "success checkmark", "payment complete" | 120x120px |
| Loading | "loading dots", "spinner minimal" | 40x40px |
| Empty cart | "empty cart", "shopping bag empty" | 200x200px |
| Empty products | "empty box", "no items" | 200x200px |
| Error | "error x", "failed" | 80x80px |
| Offline | "no wifi", "cloud offline" | 60x60px |
| Sync | "sync arrows", "refresh" | 40x40px |

---

## Implementation Priority

### Phase 1: Core Interactions (High Impact)
1. Install Motion and AutoAnimate
2. Add modal open/close animations
3. Add list animations to sale items
4. Add form step transitions

### Phase 2: Feedback (Medium Impact)
1. Download success/error Lottie files
2. Add success animation after sale
3. Add loading states
4. Add empty state illustrations

### Phase 3: Polish (Lower Priority)
1. Page transitions
2. Staggered list loading
3. Number counter animations
4. Bottom nav indicator animation

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/components/ui/modal.tsx` | Animated modal wrapper |
| `src/components/ui/animated-list.tsx` | AutoAnimate list wrapper |
| `src/components/ui/page-transition.tsx` | Page transition wrapper |
| `src/components/feedback/success-animation.tsx` | Lottie success component |
| `src/components/feedback/loading.tsx` | Loading spinner |
| `src/components/feedback/empty-state.tsx` | Empty state with Lottie |
| `src/assets/animations/` | Lottie JSON files |
| `src/lib/motion.ts` | Shared animation variants |

---

## Shared Animation Variants

Create reusable animation presets:

```tsx
// src/lib/motion.ts
export const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 }
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 }
}

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2 }
}

export const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
}
```

---

## Tools NOT Recommended for This App

| Tool | Reason |
|------|--------|
| GSAP | Overkill for POS app, larger bundle |
| React Spring | Motion is easier and covers all needs |
| Rive | Requires $9/mo for exports, complex |
| Anime.js | Less React-friendly than Motion |

---

## Resources

- Motion Docs: https://motion.dev/docs/react
- AutoAnimate Docs: https://auto-animate.formkit.com/
- Lottie React: https://lottiereact.com/
- LottieFiles Library: https://lottiefiles.com/free-animations
- Motion Examples: https://motion.dev/docs/react-examples
