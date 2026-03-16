# AI Product Creation Pipeline

This document describes the AI-powered product creation flow that allows business owners to add products by simply taking a photo.

## Overview

The pipeline extracts product information from a photo and generates an emoji-style icon with transparent background for visual recognition in the POS system.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User takes     │────►│  AI identifies  │────►│  Remove bg #1   │────►│  AI generates   │────►│  Remove bg #2   │
│  product photo  │     │  product name   │     │  (client-side)  │     │  emoji icon     │     │  (transparent)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │                       │                       │
        ▼                       ▼                       ▼                       ▼                       ▼
   iPhone camera          GPT-4o Mini            @imgly/background      GPT Image 1 Mini       @imgly/background
   + HEIC conversion      Vision API             -removal (FREE)        OpenAI API             -removal (FREE)
```

## Pipeline Steps

### Step 1: Photo Capture & Compression (Client-side)

**Location:** `src/app/(dashboard)/productos/page.tsx`

When the user takes a photo or uploads an image:
1. Image is captured via `<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment">`
2. If HEIC/HEIF format detected, converted server-side via `heic-convert` (with `sips` fallback on macOS)
3. EXIF rotation is respected using `createImageBitmap({ imageOrientation: 'from-image' })`
4. Image is resized to max 1024px dimension
5. Compressed to JPEG at 80% quality (~100-200KB)

**Why:** iPhone photos are typically 12+ megapixels (4-5MB). Compression reduces upload time and API costs.

**HEIC Conversion:** Uses `heic-convert` library (works on all platforms including Vercel). Falls back to macOS `sips` command if needed.

### Step 2: Product Identification

**Location:** `src/app/api/ai/identify-product/route.ts`

| Property | Value |
|----------|-------|
| Model | OpenAI GPT-4o Mini Vision |
| Cost | ~$0.001 per image |
| Time | ~5-10 seconds |

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

### Step 3: Background Removal #1 (Client-side - FREE)

**Location:** `src/app/(dashboard)/productos/page.tsx`

| Property | Value |
|----------|-------|
| Library | [@imgly/background-removal](https://github.com/imgly/background-removal-js) |
| Cost | **FREE** (runs entirely in browser) |
| Time | ~2-5 seconds (depends on device) |

Removes background from the original product photo before sending to OpenAI:
- No API calls needed
- No privacy concerns (image never leaves device)
- Works offline
- No rate limits

```typescript
import { removeBackground } from '@imgly/background-removal'

const blob = await removeBackground(imageBlob)
```

### Step 4: Emoji Icon Generation

**Location:** `src/app/api/ai/generate-icon/route.ts`

| Property | Value |
|----------|-------|
| Model | OpenAI GPT Image 1 Mini |
| Cost | ~$0.005 per image |
| Time | ~5-10 seconds |

The background-removed image is sent to OpenAI's image edit API which:
- Transforms the product into an Apple iOS emoji style
- Returns a 1024x1024 PNG (with white background from OpenAI)

**Prompt:**
```
Transform this into a clean Apple iOS emoji style icon. Simple centered
single object, vibrant saturated colors, pure white background, stylized
like an official Apple emoji. No shadows, no gradients on background.
```

### Step 5: Background Removal #2 (Client-side - FREE)

**Location:** `src/app/(dashboard)/productos/page.tsx`

| Property | Value |
|----------|-------|
| Library | [@imgly/background-removal](https://github.com/imgly/background-removal-js) |
| Cost | **FREE** (runs entirely in browser) |
| Time | ~2-5 seconds (depends on device) |

Removes the white background from the generated icon to ensure transparency:
- OpenAI returns icons with white backgrounds
- This step guarantees a transparent PNG output
- Runs client-side, no additional API cost

**Result:** Final icon has a fully transparent background.

## Cost Analysis

### Per Product

| Step | Model/Library | Cost |
|------|---------------|------|
| Photo compression | Client-side | FREE |
| HEIC conversion | Server-side (heic-convert) | FREE |
| Product identification | GPT-4o Mini Vision | ~$0.001 |
| Background removal #1 | @imgly/background-removal | **FREE** |
| Emoji generation | GPT Image 1 Mini | ~$0.005 |
| Background removal #2 | @imgly/background-removal | **FREE** |
| **Total** | | **~$0.006** |

### At Scale

| Products/month | Cost/month |
|----------------|------------|
| 100 | $0.60 |
| 500 | $3.00 |
| 1,000 | $6.00 |
| 10,000 | $60.00 |

### Cost Comparison (Previous vs Current)

| Component | Previous (Replicate) | Current (Client-side) |
|-----------|---------------------|----------------------|
| Background removal | ~$0.0005/image | **FREE** |
| Emoji generation | ~$0.015 (FLUX) | ~$0.005 (GPT Image 1 Mini) |
| **Total** | ~$0.016/image | **~$0.006/image** |
| **Savings** | - | **62% cheaper** |

## Caching Strategy

When a user regenerates an icon (doesn't like the first result):
- The background-removed photo is cached in React state (base64)
- Only the emoji generation + final bg removal runs again (~$0.005)
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
# Required for product identification and icon generation
OPENAI_API_KEY=sk-...

# NOT needed anymore (background removal is client-side)
# REPLICATE_API_TOKEN=r8_...
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
| **@imgly/background-removal** | FREE | 2-5s | Excellent | **CHOSEN** - Client-side, no API |
| Replicate 851-labs/background-remover | $0.0005 | 3s | Good | API sometimes unavailable |
| Replicate cjwbw/rembg | $0.0003 | 2s | Good | Requires version ID |

### Emoji Generation

| Option | Cost | Speed | Quality | Notes |
|--------|------|-------|---------|-------|
| **GPT Image 1 Mini** | $0.005 | 5-10s | Excellent | **CHOSEN** - Best value |
| GPT Image 1 | $0.015 | 5-10s | Excellent | 3x more expensive |
| FLUX Kontext Dev | $0.015 | 10-15s | Excellent | Slower, same price as GPT-1 |
| DALL-E 2 | $0.020 | 5-10s | Good | Being deprecated |

### Product Identification

| Option | Cost | Speed | Quality | Notes |
|--------|------|-------|---------|-------|
| **GPT-4o Mini Vision** | $0.001 | 5-10s | Excellent | **CHOSEN** - Cheapest, great quality |
| GPT-4o Vision | $0.005 | 5-10s | Excellent | Overkill for this task |
| Claude 3 Haiku | $0.001 | 5-10s | Good | Similar pricing |

## Architecture Benefits

### Client-Side Background Removal

Moving background removal to the client provides:

1. **Zero API cost** - No per-image charges
2. **No rate limits** - Process as many images as needed
3. **Privacy** - Image never leaves user's device for this step
4. **Reliability** - No API downtime or 404 errors
5. **Offline capable** - Works without internet for bg removal
6. **Faster iteration** - One less API round-trip

### Dual Background Removal

Running background removal twice ensures:

1. **Clean input to OpenAI** - Better emoji generation quality
2. **Guaranteed transparency** - OpenAI returns white backgrounds, second pass removes it
3. **Consistent output** - Every icon has a transparent background

### Trade-offs

- Depends on user's device performance (older phones may be slower)
- Increases client bundle size (~2MB for ONNX models)
- First use downloads model (cached after)
- Two bg removal passes add ~4-10 seconds total

## Files

| File | Purpose |
|------|---------|
| `src/app/api/ai/identify-product/route.ts` | Product identification API |
| `src/app/api/ai/generate-icon/route.ts` | Icon generation API |
| `src/app/api/convert-heic/route.ts` | HEIC to JPEG conversion API |
| `src/app/(dashboard)/productos/page.tsx` | Product creation UI with AI flow |
| `docs/ai-product-pipeline.md` | This documentation |

## Future Improvements

1. **Batch generation:** Generate 4 icon variants at once, let user pick favorite
2. **Icon library:** Pre-generate common product icons, skip AI for known products
3. **Local emoji generation:** Explore client-side models when quality improves
4. **Offline mode:** Queue product creation when offline, process when online
5. **WebGPU acceleration:** Use GPU for faster client-side processing

## References

- [OpenAI Image Generation API](https://platform.openai.com/docs/guides/images)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [@imgly/background-removal](https://github.com/imgly/background-removal-js)
- [GPT Image 1 Mini Pricing](https://openai.com/pricing)
- [heic-convert](https://github.com/catdad-experiments/heic-convert)
