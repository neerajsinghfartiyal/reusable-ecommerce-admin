# Media Picker Architecture

**Status:** Planning only (no implementation in this phase)  
**Project:** Reusable Ecommerce Admin + Backend  
**Version:** Media-1B (planning clarifications)  
**Last updated:** 2026-05-20  
**Related:** `MediaLibrary.jsx`, `ProductForm.jsx`, `mediaApi.js`, `Media` model

---

## 1. Problem statement

### Current state

| Area | Today | Gap |
|------|--------|-----|
| **Media Library** | Full CRUD page: search, folder/type filters, upload modal, edit metadata (title, alt, folder), delete, copy URL | Central asset hub exists but is **not wired into product editing** |
| **ProductForm** | Native `<input type="file">` for Featured Image and Gallery Images | Uploads via **`uploadProductImages`** (product upload API), stores **URL strings** on `featuredImage` and `galleryImages[]` | Feels like a legacy form, not a CMS |
| **Variation images** | URL text field | No media picker |
| **Product import** | URL columns in template | Consistent with URL model; picker is complementary |

### Why this is a problem

1. **Two upload paths** — Product uploads may bypass Media Library records, causing orphaned files and duplicate assets.
2. **No reuse** — Operators cannot pick an image already uploaded for another product or CMS page.
3. **Weak discoverability** — Search, folders, and alt text live only on `/media`; product workflow ignores them.
4. **Unprofessional SaaS UX** — Modern ecommerce CMS products (Shopify, WooCommerce admin, Contentful-style DAM) use a **library + picker modal**, not raw file inputs.
5. **Delete risk** — Media Library delete has no awareness of product usage; products only store URLs with no back-reference.

### Goal

A **hybrid media workflow** integrated across the admin: choose existing assets or upload new ones, always anchored in the Media Library as the system of record.

---

## 2. Recommended approach: hybrid workflow

### Hybrid model

Every image selection surface offers:

1. **Choose from Media Library** — opens `MediaPickerModal` (browse, search, filter, multi-select).
2. **Upload New** — dropzone or file picker inside the same modal (or inline panel); file is uploaded via **`POST /api/media/upload`**, creates a `Media` record, then auto-selected.

### Why not native file inputs only?

| Issue | Impact |
|-------|--------|
| No catalog of assets | Re-upload same file repeatedly |
| Bypasses metadata | alt text, folder, title unused at product level |
| Inconsistent storage | Product upload endpoint vs media endpoint |
| Poor preview UX | No grid, no library context |

### Why not Media Library page only?

| Issue | Impact |
|-------|--------|
| Context switching | Leave product form → upload → copy URL → paste back |
| Error-prone | Manual URL copy; variation fields especially fragile |
| Breaks flow | Save product interrupted; higher cognitive load |

### Why hybrid wins

- **Single source of truth** — all bytes land in Media Library.
- **Fast reuse** — pick existing hero shot for a new SKU.
- **Inline upload** — new shoot still one modal, no navigation away.
- **Familiar pattern** — matches WordPress media modal, Shopify “Select image”, etc.
- **Incremental adoption** — URL fallback preserved during migration (see §5).

---

## 3. Media picker architecture

### Component hierarchy

```
MediaPickerButton / inline trigger
└── MediaPickerModal (Dialog)
    ├── Header: title, close, mode tabs [Library | Upload]
    ├── Toolbar: search, folder filter, type filter (images default)
    ├── Body (flex)
    │   ├── MediaAssetGrid
    │   │   └── MediaAssetCard[] (selectable, multi mode)
    │   └── MediaUploadDropzone (when Upload tab or split pane)
    ├── Footer: selection count, Cancel, Confirm
    └── Optional: SelectedImagePreview strip (single-select / featured)

ProductForm (consumer)
├── Featured: SelectedImagePreview + MediaPickerButton
└── Gallery: GalleryImageGrid + MediaPickerButton (multi)
```

### Component responsibilities

| Component | Responsibility |
|-----------|----------------|
| **`MediaPickerModal`** | Orchestrates open/close, tab state (Library \| Upload), `getMedia` fetch, selection state, confirm/cancel; **Confirm disabled when selection is empty**; single vs multi mode |
| **`MediaAssetGrid`** | Responsive grid; pagination or infinite scroll; empty/loading states; keyboard focus |
| **`MediaAssetCard`** | Thumbnail, file name, type badge, folder, alt text tooltip; selected ring/checkbox; double-click to confirm (single mode) |
| **`MediaUploadDropzone`** | Drag/drop + file input; calls `uploadMedia`; progress per file; on success append to grid and mark selected |
| **`SelectedImagePreview`** | Large preview for featured image; alt text read-only or quick-edit link to media edit |
| **`GalleryImageGrid`** | Sortable thumbnails (reorder in Media-4+); remove per tile; add via picker |
| **`MediaPickerButton`** | Consistent trigger: “Choose from Library”, icon + label; opens modal with props (`mode`, `max`, `accept`) |

### Props contract (illustrative)

```typescript
// Planning-only types — not implemented
MediaPickerModal {
  open: boolean
  onClose: () => void
  onConfirm: (assets: MediaAsset[]) => void
  mode: 'single' | 'multiple'
  maxSelection?: number
  acceptTypes?: ('image' | 'video')[]
  defaultFolder?: string
  initialSelectedIds?: string[]
}

MediaAsset {
  id: string
  fileUrl: string
  fileName: string
  altText?: string
  mimeType?: string
  type: 'image' | 'video' | 'document' | 'other'
}
```

### Location in codebase (future)

```
src/components/media-picker/
  MediaPickerModal.jsx
  MediaAssetGrid.jsx
  MediaAssetCard.jsx
  MediaUploadDropzone.jsx
  SelectedImagePreview.jsx
  GalleryImageGrid.jsx
  MediaPickerButton.jsx
  useMediaPicker.js          // fetch, selection, upload helpers
  mediaPickerTypes.js
```

Reuse existing `mediaApi.js`; do not duplicate HTTP client logic.

### Default modal UX (V1)

Use **one `MediaPickerModal`** with **two tabs** — not separate modals per action:

| Tab | Behavior |
|-----|----------|
| **Library** | Browse existing assets: search, optional folder filter, type filter (default **image** for ProductForm), pagination, single- or multi-select per `mode` |
| **Upload** | Upload to Media Library first via `uploadMedia`, then auto-select uploaded asset(s) in session |

ProductForm buttons **Choose from Media Library** and **Upload New** both open the same modal; **Upload New** lands on the **Upload** tab. **Confirm** applies selection to the form.

| Mode | `mode` | `maxSelection` | Used by |
|------|--------|----------------|---------|
| Featured image | `single` | 1 | ProductForm featured |
| Gallery | `multiple` | 20 (default max) | ProductForm gallery |
| CMS hero | `single` | 1 | PageForm (future) |
| Category banner | `single` | 1 | Categories (future) |

---

## 4. ProductForm UX

### Featured Image

**Replace** native file input block with:

```
┌─────────────────────────────────────────┐
│ Featured Image                          │
├─────────────────────────────────────────┤
│ ┌─────────────────┐                     │
│ │ SelectedImage   │  [Choose Library]   │
│ │ Preview         │  [Upload New]       │
│ │ (or empty state)│  [Remove]           │
│ └─────────────────┘                     │
└─────────────────────────────────────────┘
```

| Action | Behavior |
|--------|----------|
| **Preview card** | Show image from resolved URL; broken-image fallback (existing pattern); optional alt text caption from Media record |
| **Choose from Media Library** | Open `MediaPickerModal` single-select; on confirm set selection |
| **Upload New** | Open modal on Upload tab or inline dropzone; `uploadMedia` → select returned asset |
| **Remove** | Clear featured selection; does not delete Media record. **Do not** clear featured via empty Confirm — use Remove only. |

**Remove:** `<input type="file" id="featuredImage">` from primary UX (may remain as hidden fallback during migration — not recommended long term).

### V1 ProductForm local state (Media-3 / Media-4)

```javascript
// Planning-only — React state in ProductForm
featuredMedia: {
  id?: string
  url: string
  altText?: string
  title?: string
} | null

galleryMedia: Array<{
  id?: string
  url: string
  altText?: string
  title?: string
}>
```

- Populate `url` (and optional `id`, metadata) from picker / `getMediaById` when available.
- **Persist to API (Media-3/4):** map to existing fields only — `featuredImage: featuredMedia?.url`, `galleryImages: galleryMedia.map(m => m.url)` — unless backend already exposes `featuredMediaId` / `galleryMediaIds`.
- **Media-5+:** backend may add ID fields; optional dual-write IDs + denormalized URLs during transition.

### Gallery Images

```
┌─────────────────────────────────────────┐
│ Gallery Images                          │
├─────────────────────────────────────────┤
│ [thumb] [thumb] [thumb]  [+ Add]        │
│                                         │
│ [Choose from Media Library]  (multi)    │
│ [Upload New]                            │
└─────────────────────────────────────────┘
```

| Action | Behavior |
|--------|----------|
| **Thumbnail grid** | `GalleryImageGrid`; each tile: image, remove icon; optional drag handle (reorder **later**, Media-4+) |
| **Choose from Media Library** | Multi-select modal; **append** to `galleryMedia` (default, not replace) |
| **Upload New** | Upload tab; each upload creates Media entry and **appends** to gallery selection |
| **Remove image** | Remove from `galleryMedia` only; Media record unchanged |
| **Reorder** | Deferred (Media-4+ stretch) — until then, preserve existing order; manual reorder later |

**Gallery selection rules (V1):**

- **Append** selected assets to current `galleryMedia`.
- **Dedupe:** by `id` first, then by `url`.
- **Order:** keep existing order; new items appended at end unless user reorders later.
- **Max count:** default **20**; at limit, disable further selection or show inline warning.
- **Confirm:** disabled when zero assets selected (multi mode still requires ≥1 to add on confirm).

### Variation image (phase note)

- V1 picker focus: featured + gallery.
- Variation `image` URL field → **MediaPickerButton** compact variant in Media-4+ or Media-3b.

### Loading and errors

- Upload progress on dropzone.
- Use `AdminAlert` for failures (match ProductForm patterns).
- Disable confirm while upload in flight.

---

## 5. Data strategy

### Current model (compatibility)

**Product schema today:**

- `featuredImage: String` (URL)
- `galleryImages: String[]` (URLs)
- Variation `image: String` (URL)

**ProductForm today:**

- Upload via `uploadProductImages` → URLs written to form state → saved on product payload.

**V1 picker compatibility path:**

- Picker returns `Media` record → map to `featuredMedia` / `galleryMedia` local state; persist `fileUrl` as `featuredImage` / `galleryImages[]`.
- Display and save continue to work with existing API — **no backend change required for Media-2/3/4**.

### Media ID field timing

| Phase | ProductForm / API persistence |
|-------|----------------------------------|
| **Media-2** | Picker shell only — **no** ProductForm persistence changes |
| **Media-3** | Featured: write existing **`featuredImage`** URL from `featuredMedia.url` |
| **Media-4** | Gallery: write existing **`galleryImages[]`** URLs from `galleryMedia[].url` |
| **Media-5** | Backend may add **`featuredMediaId`**, **`galleryMediaIds[]`**; optional dual-write IDs + denormalized URLs |

### Future preferred model

```javascript
// Target product fields (backend migration — Media-5+)
featuredMediaId: ObjectId  // ref Media
galleryMediaIds: [ObjectId]
// Optional denormalized cache for storefront/performance:
featuredImageUrl: String   // derived from Media.fileUrl
galleryImageUrls: String[]
```

### Why reference Media records?

| Benefit | Explanation |
|---------|-------------|
| **Stable identity** | URL path can change (CDN move); ID reference survives |
| **Metadata** | alt text, title, folder live on Media; products inherit for SEO/a11y |
| **Usage tracking** | Query which products reference `mediaId` before delete |
| **Dedup** | Same asset ID on many products — one file, clear inventory |
| **Transforms** | Future CDN/WebP variants keyed by `mediaId` |
| **Audit** | uploadedBy, timestamps on asset not duplicated per product |

### Resolver strategy (transition — Media-5+)

1. **Read:** If `featuredMediaId` present → populate URL from Media; else use `featuredImage` string.
2. **Write (Media-5+):** Picker may set both `featuredMediaId` / `galleryMediaIds` and denormalized URL fields.
3. **Import:** URL columns remain valid; optional job to register URLs as Media records.

---

## 6. Upload behavior

### Rule: ProductForm upload → Media Library first (upload API parity)

```
User picks file in Upload tab
  → POST /api/media/upload (same as Media Library page)
  → Media document created
  → Picker auto-selects new asset
  → ProductForm featuredMedia / galleryMedia updated
```

**Upload New must mirror current Media Library upload** — no separate product upload path. Implement using the same `uploadMedia` helper and FormData fields as `MediaLibrary.jsx`:

| FormData field | Notes |
|----------------|--------|
| `file` | Required |
| `folder` | Default per context (see table below) or `general` |
| `title` | Optional |
| `altText` | Optional |

**Do not** use `uploadProductImages` in the new picker flow. Deprecate after ProductForm is fully on `uploadMedia`.

### `getMedia` defaults (picker Library tab)

Reuse existing `getMedia(params)` from `mediaApi.js` (same as Media Library):

| Param | ProductForm default | Notes |
|-------|---------------------|--------|
| `type` | `image` | Default filter for product picker |
| `page` | `1` | Reset on open / filter change |
| Page size | `12` or `24` | Match library (`pageLimit` 12 today); pick one constant in Media-2 |
| `search` | optional | Toolbar search |
| `folder` | optional | Omit or `all` unless folder filter UI is shown |

Pass through response pagination shape already handled in Media Library (`extractList` / `extractPagination` patterns).

**Folder convention (suggested):**

| Context | Default `folder` |
|---------|----------------|
| Product featured | `products/featured` |
| Product gallery | `products/gallery` |
| CMS | `pages` |
| General library | `general` |

### Draft products

- Draft products may reference Media immediately — no “temporary upload” bucket required in V1.
- Media exists independently of product publish state.

### Temporary uploads (future scope)

- Optional `isTemporary: true` on Media with TTL cleanup if never linked to an entity.
- Not in V1 — avoids orphan complexity until usage tracking exists.

### Bulk upload in modal

- Multiple files in `MediaUploadDropzone` → parallel or queued uploads → all appear in grid when complete.

---

## 7. Delete and media usage safety

### Problem today

- `deleteMedia` removes library entry with no check for product references.
- Products hold bare URLs — hard to find references without full collection scan.

### Recommendations

| Capability | Description |
|------------|-------------|
| **Usage tracking** | `MediaUsage` collection or embedded `usageCount` + `usedIn: [{ entityType, entityId, field }]` updated on product save/delete |
| **Soft delete / archive** | `isActive: false` or `deletedAt`; hide from picker; URLs may still resolve until purge |
| **Hard delete guard** | Block delete if `usageCount > 0`; show modal: “Used in 3 products” with links |
| **Admin UI** | Media Library card badge: “Used in X products”; detail drawer lists entities |
| **Product remove** | Removing image from product decrements usage; does not delete Media |

### API sketch (future)

```
GET  /api/media/:id/usage
POST /api/media/:id/archive
DELETE /api/media/:id  → 409 if in use (unless force=admin)
```

### Product save hook (future)

On `createProduct` / `updateProduct`:

- Diff old vs new `featuredMediaId` / `galleryMediaIds`.
- Update usage registry accordingly.

---

## 8. Reusable asset picker strategy

Design `MediaPickerModal` as a **shared admin primitive**:

| Consumer | Field(s) | Mode | Phase |
|----------|----------|------|-------|
| **ProductForm** | featured, gallery | single / multi | Media-3, Media-4 |
| **ProductForm** | variation image | single | Media-4+ |
| **Categories** | banner / thumbnail | single | Post Media-5 |
| **Brands** | logo | single | Post Media-5 |
| **PageForm** | hero, section images | single / multi | Post Media-5 |
| **CMS blocks** | inline images | multi | Future |
| **Banners / sliders** | slide images | multi | Future |
| **Store settings** | logo, favicon | single | Future |

**Configuration via props only** — no forked modals per page.

---

## 9. Future media capabilities

Backlog (not V1–V2):

| Area | Features |
|------|----------|
| **Video** | `type: video` in picker when `acceptTypes` includes video; poster frame thumbnail |
| **CDN** | `fileUrl` points to CDN; signed URLs; cache purge on replace |
| **Formats** | WebP/AVIF conversion pipeline on upload; original retained |
| **Compression** | Max dimension, quality slider, auto compress on upload |
| **Responsive sizes** | `media.variants[]` — thumbnail, medium, large, og:image |
| **Delivery** | Lazy loading helpers for storefront (out of admin scope) |
| **AI** | Alt text generation from image; optional title suggestion |
| **Upload UX** | Drag/drop everywhere; paste from clipboard; bulk folder upload |
| **Storage** | S3, Cloudinary, Azure Blob adapters behind `fileUrl` abstraction |
| **Rights** | License expiry, photographer credit in metadata |

---

## 10. Recommended implementation phases

| Phase | Name | Scope | Deliverables |
|-------|------|-------|--------------|
| **Media-1** | Planning | This document | Architecture sign-off |
| **Media-2** | Picker UI shell | Tabs (Library \| Upload), grid, card, dropzone, button; `getMedia` + `uploadMedia` parity; Confirm disabled when empty | **No ProductForm persistence** |
| **Media-3** | Featured image | `featuredMedia` state; preview + picker + remove; persist **`featuredImage`** URL only | Backward compatible saves |
| **Media-4** | Gallery | `galleryMedia` state; append, dedupe, max 20; persist **`galleryImages[]`** URLs only | Reorder optional stretch |
| **Media-5** | Usage safety + IDs | Usage registry; optional **`featuredMediaId`** / **`galleryMediaIds`** + dual-write URLs | Backend + Media Library UI |
| **Media-6** | Optimization | CDN, WebP/AVIF, variants, video in picker | Infrastructure |

### Dependencies

- Media-2 before Media-3/4.
- Media-5 can parallel Media-4 but needs product save hooks.
- Media-6 independent.

### Out of scope per phase

- Do not change product import URL template in Media-2–4.
- Do not refactor entire Media Library page layout in Media-2 (picker reuses APIs, not necessarily shared grid component — extract shared primitives when useful).

---

## 11. Alignment with existing codebase

| Asset | Role in picker plan |
|-------|---------------------|
| `MediaLibrary.jsx` | Reference UX for filters, edit modal, upload; picker shares APIs |
| `mediaApi.js` | `getMedia`, `uploadMedia`, `getMediaById` |
| `uploadApi.uploadProductImages` | **Phase out** for product images after Media-3 |
| `Product.js` | URL fields today; `featuredMediaId` future |
| `Media.js` | `fileUrl`, `altText`, `folder`, `type`, `isActive` |

---

## 12. V1 defaults (Media-1B)

| Topic | Default |
|-------|---------|
| Modal layout | One modal, tabs: **Library** \| **Upload** |
| Featured clear | **Remove** button only — not empty Confirm |
| Confirm | Disabled when **no asset selected** |
| Gallery max | **20** images |
| Gallery add | **Append**; dedupe by **id** then **url** |
| Permissions | Same as Media Library access (`admin` / `super_admin` initially); future: `media.select`, `media.upload` |
| Page size | **12** (align with Media Library) unless UX testing prefers 24 |

### Legacy `uploadProductImages`

- **Existing product image URLs remain valid** — no forced migration on read.
- **`uploadProductImages` deprecated** once ProductForm featured/gallery use `uploadMedia` only.
- Files uploaded historically without a `Media` record: **orphan cleanup / backfill** is **future ops**, not Media-2–4.

### Remaining open decisions (Media-2 kickoff)

1. Extract shared grid primitives from Media Library vs lean picker-only grid?
2. Page size **12** vs **24** in picker (default **12** per table above).

---

*End of media picker architecture document.*
