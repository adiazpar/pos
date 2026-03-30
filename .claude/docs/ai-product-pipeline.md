# AI Product Creation Pipeline

This document describes the AI-powered product creation flow that allows business owners to add products by simply taking a photo.

## Overview

The pipeline extracts product information from a photo and generates an emoji-style icon with transparent background for visual recognition in Kasero.

```
┌─────────────────┐     ┌─────────────────────────────────┐     ┌─────────────────┐
│  User takes     │────►│  PARALLEL EXECUTION             │────►│  Remove bg      │
│  product photo  │     │  ┌─────────────────────────┐    │     │  (transparent)  │
└─────────────────┘     │  │ AI identifies (GPT-4o)  │    │     └─────────────────┘
        │               │  └─────────────────────────┘    │             │
        ▼               │  ┌─────────────────────────┐    │             ▼
   iPhone camera        │  │ AI generates (Nano Ban) │    │         BiRefNet
   + HEIC conversion    │  └─────────────────────────┘    │         fal.ai (~FREE)
                        └─────────────────────────────────┘
```

**Parallel execution saves ~2-3 seconds** by running identification and icon generation simultaneously.

## Pipeline Steps

### Step 1: Photo Capture & Compression (Client-side)

**Location:** `src/app/[businessId]/products/page.tsx`

When the user takes a photo or uploads an image:
1. Image is captured via `<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment">`
2. If HEIC/HEIF format detected, converted server-side via `heic-convert` (with `sips` fallback on macOS)
3. EXIF rotation is respected using `createImageBitmap({ imageOrientation: 'from-image' })`
4. Image is resized to max 768px dimension (sufficient for AI processing)
5. Compressed to JPEG at 70% quality (~60-150KB)

**Why:** iPhone photos are typically 12+ megapixels (4-5MB). Compression reduces upload time and API costs.

**HEIC Conversion:** Uses `heic-convert` library (works on all platforms including Vercel). Falls back to macOS `sips` command if needed.

### Step 2: Product Identification

**Location:** `src/app/api/ai/identify-product/route.ts`

| Property | Value |
|----------|-------|
| Model | OpenAI GPT-4o Mini Vision |
| Cost | ~$0.001 per image |
| Time | ~1-2 seconds |

The compressed image is sent to GPT-4o Mini which:
- Analyzes the product packaging/label
- Extracts the product name in Spanish
- Returns structured JSON: `{ name: "Chifles Sabor Pollo" }`

**Prompt:**
```
Analyze this product image and identify:
1. Product name in Spanish (be specific about flavor/variant if visible on label)

Return JSON: { "name": "..." }
```

### Step 3: Emoji Icon Generation

**Location:** `src/app/api/ai/generate-icon/route.ts`

| Property | Value |
|----------|-------|
| Model | Nano Banana (Gemini 2.5 Flash Image via fal.ai) |
| Cost | ~$0.039 per image |
| Time | ~2-5 seconds |

The compressed image is sent to Nano Banana on fal.ai which:
- Transforms the product into an Apple iOS emoji style
- Returns a square PNG with white background
- Uses prompt guidance for consistent styling
- Produces excellent cartoon-like emoji quality

**Prompt:**
```
Transform into a clean Apple iOS emoji style icon. Simple centered single
object, vibrant saturated colors, cartoon-like, pure white background,
stylized like an official Apple emoji. No shadows, no gradients on background.
```

**API Configuration:**
```typescript
import { fal } from '@fal-ai/client'

fal.config({ credentials: process.env.FAL_KEY })

// Use run() instead of subscribe() for faster direct execution (no queue overhead)
const result = await fal.run('fal-ai/nano-banana/edit', {
  input: {
    prompt: '...',
    image_urls: [base64DataUrl], // Nano Banana accepts array of image URLs/data URIs
  },
})
```

### Step 4: Background Removal (Server-side via BiRefNet)

**Location:** `src/app/api/ai/remove-background/route.ts`

| Property | Value |
|----------|-------|
| Model | BiRefNet (via fal.ai) |
| Cost | **~FREE** ($0 per compute second) |
| Time | ~1-3 seconds |

Removes the white background from the generated icon to ensure transparency:
- Nano Banana returns icons with white backgrounds
- BiRefNet removes the background server-side (much faster than client-side)
- Also trims transparent pixels to ensure the icon fills the frame

```typescript
// Use run() instead of subscribe() for faster direct execution (no queue overhead)
const result = await fal.run('fal-ai/birefnet', {
  input: {
    image_url: iconDataUrl,
    model: 'General Use (Light)',
    output_format: 'png',
    refine_foreground: true,
  },
})
```

**Result:** Final icon has a fully transparent background.

### Step 5: Icon Compression

**Location:** `src/hooks/useAiProductPipeline.ts`

The final icon is compressed to fit typical upload size limits:
- Target: 400KB max (with safety margin)
- Progressive resizing: 512 → 384 → 288 → ... until under limit
- Output: PNG with transparency preserved

## Cost Analysis

### Per Product

| Step | Model/Library | Cost |
|------|---------------|------|
| Photo compression | Client-side | FREE |
| HEIC conversion | Server-side (heic-convert) | FREE |
| Product identification | GPT-4o Mini Vision | ~$0.001 |
| Emoji generation | Nano Banana (fal.ai) | ~$0.039 |
| Background removal | BiRefNet (fal.ai) | **~FREE** |
| **Total** | | **~$0.04** |

### At Scale

| Products/month | Cost/month |
|----------------|------------|
| 100 | ~$4.00 |
| 500 | ~$20.00 |
| 1,000 | ~$40.00 |
| 10,000 | ~$400.00 |

**Note:** fal.ai charges ~$0.039/image for Nano Banana (Gemini 2.5 Flash Image).

## Caching Strategy

When a user regenerates an icon (doesn't like the first result):
- The background-removed photo is cached in React state (`cachedBgRemoved`)
- Only the emoji generation + final bg removal runs again (~$0.039)
- No additional photo processing needed

Cache is cleared when:
- User takes a new photo
- Product is saved
- User navigates away

## API Routes

### POST /api/ai/identify-product

Identifies a product from an image.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Chifles Sabor Pollo"
  }
}
```

### POST /api/ai/generate-icon

Generates an emoji-style icon from a background-removed image.

**Request:**
```json
{
  "image": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "icon": "data:image/png;base64,..."
  }
}
```

### POST /api/convert-heic

Converts HEIC/HEIF images to JPEG (server-side).

**Request:** FormData with `file` field containing the HEIC file.

**Response:**
```json
{
  "success": true,
  "data": {
    "image": "data:image/jpeg;base64,..."
  }
}
```

**Platform Support:**
- **Vercel/Linux/Windows:** Uses `heic-convert` library
- **macOS (fallback):** Uses native `sips` command

## Environment Variables

```bash
# Required for product identification
OPENAI_API_KEY=sk-...

# Required for emoji icon generation (Recraft V3 on fal.ai)
# Get from: https://fal.ai/dashboard/keys
# Cost: ~$0.04/image
FAL_KEY=your-fal-api-key
```

## Error Handling

| Error | Cause | User Message |
|-------|-------|--------------|
| 400 | Missing image | "Se requiere una imagen" |
| 429 | Rate limit | "Limite de velocidad alcanzado" |
| 500 | API error | "Error al generar el icono" |
| 504 | Timeout | "Tiempo de espera agotado" |

## Model Alternatives Considered

### Background Removal

| Option | Cost | Speed | Quality | Notes |
|--------|------|-------|---------|-------|
| **BiRefNet (fal.ai)** | ~FREE | 1-3s | Excellent | **CHOSEN** - Server-side, very fast |
| @imgly/background-removal | FREE | 10-30s | Excellent | Client-side, slow on mobile |
| rembg-webgpu | FREE | 3-10s | Excellent | WebGPU acceleration, newer |
| Bria RMBG 2.0 | $0.018 | 1-2s | Excellent | Commercial license included |

### Emoji Generation

| Option | Cost | Speed | Prompt Support | Notes |
|--------|------|-------|----------------|-------|
| **Nano Banana (fal.ai)** | $0.039 | 2-5s | **Yes** | **CHOSEN** - Best emoji quality, Gemini 2.5 Flash |
| Google Nano Banana (direct) | $0.039 | 2-5s | Yes | No free tier, requires billing |
| Recraft V3 | $0.04 | 3-4s | Yes | Good for icons, but too literal |
| FLUX Dev img2img | $0.03 | 2-3s | Yes | Good quality, slightly cheaper |
| GPT Image 1 Mini | $0.005 | 20-25s | Yes | Previous choice, slow |
| FLUX Schnell Redux | $0.003 | 1s | **No** | Fast but no prompt guidance |

### Product Identification

| Option | Cost | Speed | Quality | Notes |
|--------|------|-------|---------|-------|
| **GPT-4o Mini Vision** | $0.001 | 1-2s | Excellent | **CHOSEN** - Cheapest, great quality |
| GPT-4o Vision | $0.005 | 1-2s | Excellent | Overkill for this task |
| Claude 3 Haiku | $0.001 | 1-2s | Good | Similar pricing |

## Why Nano Banana?

We evaluated several models:

1. **FLUX Schnell Redux** ($0.003/image) - Fast but **does not support text prompts**, only creates image variations
2. **FLUX Dev img2img** ($0.03/image) - Good quality with prompt support
3. **Recraft V3** ($0.04/image) - Too literal interpretation of prompts
4. **Nano Banana** ($0.039/image) - **Best emoji quality** with Gemini 2.5 Flash Image

Nano Banana (Gemini 2.5 Flash Image) via fal.ai produces the best cartoon-like emoji icons. It understands the "Apple iOS emoji style" prompt and creates stylized, simplified representations of products rather than literal interpretations.

## Architecture Benefits

### Server-Side Background Removal (BiRefNet)

Using BiRefNet on fal.ai provides:

1. **~FREE** - $0 per compute second pricing
2. **Very fast** - 1-3 seconds vs 10-15 seconds client-side
3. **Consistent performance** - No dependency on user's device
4. **High quality** - Professional-grade edge detection
5. **Simple integration** - Same fal.ai client already used for icon generation

### Nano Banana for Icon Generation

Using Nano Banana (Gemini 2.5 Flash Image) on fal.ai provides:

1. **~5-10x faster** - 2-5 seconds vs 20-25 seconds (vs GPT Image 1 Mini)
2. **Emoji-optimized** - Understands "Apple iOS emoji style" prompt naturally
3. **Prompt-guided** - Full control over transformation style
4. **Reliable** - fal.ai provides consistent API availability and fast inference

### Single Background Removal (Post-Generation)

Background removal runs once, after icon generation:

1. **Simpler pipeline** - One bg removal step instead of two
2. **Guaranteed transparency** - Nano Banana returns white backgrounds, bg removal ensures transparency
3. **Faster overall** - Saves ~10-15 seconds by not pre-processing the photo

The original photo doesn't need background removal because Nano Banana generates a completely new image - it doesn't copy the background from the input.

### Trade-offs

- Requires internet for bg removal (no offline support)
- Adds ~1-3 seconds for server round-trip
- Depends on fal.ai availability

## Performance Optimizations

### Implemented Optimizations

| Optimization | Savings | Details |
|--------------|---------|---------|
| **Parallel execution** | ~2-3s | Identification + icon generation run simultaneously |
| **Direct API calls** | ~100-300ms | Using `fal.run()` instead of `fal.subscribe()` (no queue overhead) |
| **Lower resolution** | ~500ms-1s | 768px instead of 1024px (sufficient for AI processing) |
| **Lower JPEG quality** | ~50-100ms | 70% instead of 80% (sufficient for AI processing) |
| **Server-side bg removal** | ~7-12s | BiRefNet via fal.ai instead of client-side |

### Why These Optimizations Work

**`fal.run()` vs `fal.subscribe()`:** The `subscribe()` method adds queue submission and polling overhead. `run()` makes direct HTTP requests with no queue involved, providing the fastest possible path.

**Lower resolution (768px):** AI models don't benefit from extra resolution when generating stylized emoji icons. 768px provides the same quality output while reducing upload time and processing.

**Lower JPEG quality (70%):** The AI generates entirely new stylized images, so input compression artifacts don't affect output quality.

### Future Optimizations (Not Implemented)

#### Enable SharedArrayBuffer

Adding these headers enables SIMD + threading for 26x faster background removal:

```javascript
// next.config.js
headers: [
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' }
]
```

This can reduce bg removal from ~20s to ~2s per image (if using client-side).

#### WebGPU Acceleration

Consider `rembg-webgpu` library for 3-5x faster bg removal on supported devices.

## Files

| File | Purpose |
|------|---------|
| `src/app/api/ai/identify-product/route.ts` | Product identification API |
| `src/app/api/ai/generate-icon/route.ts` | Icon generation API (Nano Banana) |
| `src/app/api/ai/remove-background/route.ts` | Background removal API (BiRefNet) |
| `src/app/api/convert-heic/route.ts` | HEIC to JPEG conversion API |
| `src/hooks/useAiProductPipeline.ts` | Pipeline orchestration with cancellation |
| `src/app/[businessId]/products/page.tsx` | Product creation UI with AI flow |
| `.claude/docs/ai-product-pipeline.md` | This documentation |

## References

- [fal.ai Dashboard](https://fal.ai/dashboard) - Get API key here
- [Nano Banana Edit API](https://fal.ai/models/fal-ai/nano-banana/edit/api)
- [BiRefNet API](https://fal.ai/models/fal-ai/birefnet/api) - Background removal
- [@fal-ai/client](https://www.npmjs.com/package/@fal-ai/client)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [heic-convert](https://github.com/catdad-experiments/heic-convert)
