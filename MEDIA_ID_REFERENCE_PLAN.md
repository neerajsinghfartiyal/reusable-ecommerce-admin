# Media ID Reference Plan (Product Images)

**Status:** Planning only (Media-5E-A — no implementation in this phase)  
**Project:** Reusable Ecommerce Admin + Backend  
**Version:** Media-5E  
**Last updated:** 2026-05-20  
**Related:** `MEDIA_USAGE_SAFETY_PLAN.md`, `MEDIA_PICKER_ARCHITECTURE.md`, `ProductForm.jsx`, `Media` model, `Product` model

---

## 1. Current state

### What exists today

| Area | Behavior |
|------|----------|
| **Product image storage** | `featuredImage: string`, `galleryImages: string[]` only. No `featuredMediaId` or `galleryMediaIds`. |
| **ProductForm** | MediaPicker for featured + gallery (max 20). Local `featuredMedia` / `galleryMedia` state; submit sends **URL strings only**. |
| **MediaPicker** | Selects library assets or uploads new; assets have Mongo `_id` in UI but IDs are **not persisted** on the product. |
| **Storefront / public API** | Consumers read `featuredImage` and `galleryImages` URL fields. |
| **Usage detection (Media-5B)** | Read-only scan: products `featuredImage` + `galleryImages` matched to `Media` via normalized URL/path. |
| **Delete protection (Media-5D / 5D.1)** | `DELETE /api/media/:id` and `PUT` deactivation (`isActive: false`) blocked when URL-based usage &gt; 0; **409** with `usageCount` + `usages`. |
| **MediaUsage table** | Not implemented. No stored `usageCount` on `Media`. |

### What is safe today

- Operators see Used/Unused and product usage in Media Library.
- Used media cannot be deleted or deactivated through supported admin API paths.
- URL normalization (admin + backend) collapses relative/absolute paths for matching.

### What is still URL-only

- Product ↔ Media relationship is **implicit** (string match), not a foreign key.
- Usage and protection do not use `Media._id` on the product document.
- Replace-media, cleanup reports, and CDN variant mapping remain harder than with stable IDs.

---

## 2. Problem statement

### Limitations of URL-only references

1. **Weak relationship** — Product stores a string, not a pointer to `Media`. Renames, re-uploads, or duplicate library rows break the logical link.

2. **Harder usage tracking** — Full product scans and path normalization are required on every check. No O(1) lookup by `mediaId`.

3. **Duplicate media paths** — Same file may exist as multiple `Media` documents; URL match may attribute usage to the wrong row or split counts.

4. **URL changes break references** — CDN domain changes, storage migration, or `fileUrl` updates leave products pointing at stale strings unless every product is updated.

5. **Replace media is harder** — Updating all products requires finding every matching path, not swapping one ID reference.

6. **Cleanup is less reliable** — “Unused” detection depends on heuristic URL equality; orphan URLs and external images are ambiguous.

7. **Future CDN / optimization** — Variants (`webp`, sizes) fit naturally on `Media.optimizedUrls`; products cannot reference that record without an ID.

8. **Integrity** — Cannot enforce “this product image must exist in the library” at the schema/API layer.

---

## 3. Target model

### Future product fields (additive)

| Field | Type | Purpose |
|-------|------|---------|
| `featuredMediaId` | `ObjectId \| null` | Ref `Media` for featured image |
| `galleryMediaIds` | `ObjectId[]` | Ordered refs `Media` (max 20, mirrors gallery order) |
| `featuredImage` | `string` | **Retained** — denormalized URL for storefront/legacy clients |
| `galleryImages` | `string[]` | **Retained** — denormalized URLs, same order as IDs when both present |

### Why keep both IDs and URLs during transition

| Consumer | Primary fields |
|----------|----------------|
| **Storefront, carts, legacy API clients** | `featuredImage`, `galleryImages` (unchanged contract) |
| **Admin, Media Library, usage, replace** | `featuredMediaId`, `galleryMediaIds` |
| **Dual-write period** | Backend resolves URL from `Media` when saving if ID provided; keeps URLs in sync |

IDs are the **source of truth for admin**; URLs are the **compatibility cache** until all clients migrate.

---

## 4. Backward compatibility strategy

### Principles

1. **Existing products** with only URLs continue to load, display, and save without IDs.
2. **Product API responses** always include `featuredImage` and `galleryImages` (never remove in transition).
3. **Optional IDs** — `featuredMediaId` / `galleryMediaIds` may be null or empty; not required for create/update.
4. **Admin hydration** — ProductForm can show picker selection by ID when present, else URL path match (current Media-4 pattern extended).
5. **Storefront** — No change required in phase B–D; reads URLs only.
6. **Import / external clients** — CSV or API payloads that send URLs only remain valid; backfill can add IDs later.
7. **Usage + delete protection** — URL fallback remains for legacy rows until ID coverage is high (phase E).

### Non-goals for early phases

- Breaking storefront image rendering.
- Requiring Media IDs on every product save immediately.
- Removing URL fields from schema or API.

---

## 5. Migration phases

| Phase | ID | Scope |
|-------|-----|--------|
| **A** | *(done)* | URL-only products + URL usage detection + delete/deactivate protection |
| **B** | Media-5E-B | Add optional `featuredMediaId`, `galleryMediaIds[]` to Product schema; API accepts/returns them; no ProductForm change required yet |
| **C** | Media-5E-C | Backfill script/report: match URLs → Media, write IDs where confident |
| **D** | Media-5E-D | ProductForm dual-write: send IDs + URLs from picker assets |
| **E** | Media-5E-E | Usage detection: ID-first match, URL fallback; dedupe same product/field |
| **F** | Media-5E-F | Replace media workflow driven by IDs |
| **G** | Media-5E-G | Orphan URL report; optional cleanup of stale URL-only refs |

```mermaid
flowchart LR
  A[Phase A URL safety] --> B[Schema optional IDs]
  B --> C[Backfill IDs]
  C --> D[ProductForm dual-write]
  D --> E[ID-first usage]
  E --> F[Replace workflow]
  F --> G[Orphan cleanup]
```

---

## 6. ProductForm behavior (future)

### Local state (unchanged conceptually)

- `featuredMedia`, `galleryMedia` — asset objects with `id`, `url`, title, alt, etc.
- Picker confirm / hydration already have access to `Media._id`.

### On save (dual-write)

| Asset state | Payload |
|-------------|---------|
| Has Mongo ID + URL | `featuredMediaId` / `galleryMediaIds[]` **and** `featuredImage` / `galleryImages[]` |
| URL only (legacy paste, external, no library row) | URL fields only; IDs omitted or cleared for that slot |
| Cleared featured | `featuredMediaId: null`, `featuredImage: ''` |
| Gallery remove | Remove parallel ID and URL at same index |

### Rules

- Order of `galleryMediaIds` must match order of `galleryImages`.
- Max 20 gallery entries (unchanged).
- Do not send invalid IDs; picker should only emit IDs from library/upload response.
- If upload returns new `Media`, use returned `_id` + resolved stored URL.

### Out of scope for ProductForm in 5E-B

- Changing variation image fields (still URL text unless separate phase).
- MediaUsage table sync (backend responsibility on product save in later phase).

---

## 7. API behavior (product create/update)

### Accept (optional)

```json
{
  "featuredImage": "/uploads/media/hero.jpg",
  "featuredMediaId": "507f1f77bcf86cd799439011",
  "galleryImages": ["/uploads/media/a.jpg", "/uploads/media/b.jpg"],
  "galleryMediaIds": ["507f...", "507f..."]
}
```

### Validation (recommended)

| Rule | Behavior |
|------|----------|
| `featuredMediaId` provided | Must be valid ObjectId; `Media` must exist; prefer `isActive` (policy: allow inactive with warning vs reject — default: **allow** if used, block new picks of inactive) |
| `galleryMediaIds` | Array of valid IDs; each exists; max length 20 |
| ID without URL | Resolve `fileUrl` from `Media` → store relative URL in `featuredImage` / `galleryImages` |
| URL without ID | Allow; leave ID null (legacy) |
| ID + URL both sent | URL should match resolved `Media.fileUrl` after normalization; if mismatch, **prefer ID** and overwrite URL from Media (configurable; recommend ID-wins on admin saves) |
| Invalid ID | **400** with clear message; do not partial-save corrupt IDs |

### Preserve compatibility

- Omitting ID fields behaves exactly as today.
- Response always includes URL fields.
- IDs returned when present (admin); storefront clients may ignore them.

### Product controller hooks (future)

- `normalizeProductMediaFields(product, body)` on create/update.
- Optional: strip `galleryMediaIds` entries when URL slot removed.

---

## 8. Read behavior

### Product list/detail (admin + API)

| Field | Always return |
|-------|----------------|
| `featuredImage`, `galleryImages` | Yes |
| `featuredMediaId`, `galleryMediaIds` | When set |

### Optional admin enrichment (later)

For `GET` product by id in **admin** context only (or `?enrichMedia=true`):

```json
{
  "featuredMedia": { "id", "title", "altText", "fileUrl", "thumbnailUrl" },
  "galleryMedia": [ { ... } ]
}
```

Storefront/public product endpoints: **URLs only** initially to avoid payload bloat and coupling.

### Population

- Mongoose `.populate('featuredMediaId')` for single ref.
- Gallery: populate `galleryMediaIds` in order (preserve array order).

---

## 9. Usage detection behavior (future)

### Match order (per product field)

1. **ID match** — `product.featuredMediaId === media._id` or `media._id` in `galleryMediaIds`.
2. **URL fallback** — normalized path match on `featuredImage` / `galleryImages[]` (current 5B logic).

### Dedupe (avoid double count)

- Same product + same logical field (featured vs gallery slot): one usage row.
- If ID and URL both point to same `Media` for one slot → **count once**.
- Dedupe key: `productId:field` (featured) or `productId:galleryImages:index` (per slot).

### Legacy products

- URL-only products: behavior identical to Media-5B until backfill adds IDs.
- ID-only mismatch (stale URL): ID match still protects delete.

### Performance path

- Phase E: index products by `featuredMediaId` and `galleryMediaIds` in memory map keyed by `mediaId` (fast path) + URL index for fallback.
- Long term: `MediaUsage` table maintained on product save (see `MEDIA_USAGE_SAFETY_PLAN.md`).

---

## 10. Delete protection behavior (future)

### Block when

- `usageCount > 0` from **combined** ID + URL detection (deduped).

### Rules

| Source | Blocks delete/deactivate |
|--------|-------------------------|
| `featuredMediaId` / `galleryMediaIds` | Yes |
| URL match on featured/gallery | Yes (legacy) |
| Same product, ID + URL same media | Once |

### Response

- Same **409** shape as Media-5D: `message`, `usageCount`, `usages[]` with `entityType`, `entityId`, `field`, `editUrl`.
- Optional `matchedBy: "id" | "url"` in usage entries for admin debugging (not required for 5E-B).

### Archived media

- Per safety plan: archived media may remain referenced; delete still blocked if usage &gt; 0; URLs on product still work.

---

## 11. Backfill strategy

### Goal

Populate `featuredMediaId` and `galleryMediaIds` for existing products where URL confidently maps to one `Media` record.

### Algorithm (per product)

1. Load `featuredImage`, `galleryImages`.
2. Normalize each URL (`normalizeMediaUrlPath` — same as 5B).
3. Query `Media` where normalized `fileUrl` / `filePath` / `/uploads/media/{fileName}` matches.
4. **Confidence rules:**
   - **High:** exactly one active `Media` match → write ID.
   - **Low:** zero matches → leave ID null; report orphan URL.
   - **Ambiguous:** multiple `Media` same path → pick canonical (oldest `createdAt` or lowest `_id`); flag row for manual review; do not auto-write without `--force-ambiguous` flag.

### Safety

- **Dry-run mode** default: report only.
- **Do not overwrite** existing non-null IDs unless `--overwrite` explicitly passed.
- Log: product id, field, url, matched media id, confidence.

### Deliverables (phase C)

- CLI script or admin-only `POST /api/admin/products/backfill-media-ids`
- CSV/JSON report: matched, unmatched, ambiguous.

---

## 12. Data integrity rules

| Rule | Recommendation |
|------|----------------|
| `featuredMediaId` | If set, must reference existing `Media`; null featured image → null ID |
| `galleryMediaIds` | Each ID must exist; max 20; no duplicate IDs in same gallery |
| Array alignment | When both arrays sent, `galleryMediaIds.length` should equal `galleryImages.length`; backend may trim/pad or reject mismatch (**recommend reject** on admin save) |
| Order | Gallery order = array order; reorder in UI updates both arrays |
| Detach from product | Clear ID **and** URL for that slot; do not delete `Media` row |
| Delete product | Remove usage references; do not delete library assets |
| Inactive media | Product may still reference; delete protection applies; new picks should prefer active media |
| External URL | No `Media` ID; URL-only allowed indefinitely |

---

## 13. Edge cases

| Case | Handling |
|------|----------|
| **Duplicate Media, same path** | Backfill picks canonical; usage attributes to all matching IDs or canonical only (recommend: usage on **requested media id** + URL match any duplicate path for legacy) |
| **External CDN URL** | No ID; URL-only; excluded from library delete rules for that URL string |
| **Missing Media record** | ID validation fails on save; URL-only legacy continues |
| **Archived / inactive media** | Still referenced; block delete; storefront URL unchanged |
| **Imported products** | URLs only until backfill or manual picker save |
| **Media replacement** | Phase F: update IDs + URLs on products; old media becomes unused |
| **Product duplication** | Copy IDs + URLs; usage counts increase for referenced media |
| **Draft products** | IDs and URLs copied; count as usage (same as 5D) |
| **Picker re-select same image** | Same ID; no duplicate gallery slot (existing dedupe) |
| **ID set, URL stale** | On read admin: refresh URL from Media; on save ID-wins |

---

## 14. Future replace media workflow

IDs enable precise updates:

| Operation | With IDs |
|-----------|----------|
| Replace everywhere | Find usages by `mediaId`; set new `featuredMediaId` / swap in `galleryMediaIds`; refresh URLs from new `Media` |
| Replace one product featured | Update one product’s `featuredMediaId` + `featuredImage` |
| Replace gallery index | Update `galleryMediaIds[i]` + `galleryImages[i]` only |
| Preserve metadata | Copy `altText`/`title` from old Media or new Media per operator choice |
| URL consistency | Always regenerate `featuredImage` / `galleryImages` from new Media `fileUrl` after replace |

URL-only replace (scan all products by path) remains fallback for legacy catalog rows.

---

## 15. API / schema risks

| Risk | Mitigation |
|------|------------|
| Migration inconsistency | Dual-write + ID-wins on admin save; backfill dry-run |
| Stale URL fields | Resolve from Media on save when ID present; admin refresh endpoint |
| Double counting usage | Dedupe by product + field (+ index for gallery) |
| Large backfill jobs | Batch processing; off-peak; progress logging |
| Old clients ignore IDs | URLs remain authoritative for storefront |
| Media deleted while ID on product | 5D blocks delete; if forced in DB, validation on read shows broken ref |
| Partial gallery arrays | Reject mismatched lengths or normalize with explicit rules |
| Race: save product vs delete media | Re-check usage at delete time (current pattern) |

---

## 16. Recommended implementation phases

| Phase | ID | Deliverables |
|-------|-----|----------------|
| **Planning** | **Media-5E-A** | This document |
| **Schema + API surface** | **Media-5E-B** | Optional Product fields; create/update/read pass-through; validation stub |
| **Backfill** | **Media-5E-C** | Script + unmatched/ambiguous report |
| **Admin dual-write** | **Media-5E-D** | ProductForm sends IDs + URLs; backend sync URLs from Media |
| **Usage ID-first** | **Media-5E-E** | `mediaUsageService` ID index + URL fallback + dedupe |
| **Replace workflow** | **Media-5E-F** | API + Media Library UI |
| **Cleanup** | **Media-5E-G** | Orphan URL report; optional admin tools |

**Dependency:** 5E-B before 5E-D; 5E-C can parallel 5E-B; 5E-E after 5E-D recommended; 5E-F after 5E-E.

---

## 17. Acceptance criteria

### Media-5E-A (this document)

- [ ] Plan reviewed; no code changes.

### Media-5E-B (schema + API)

- [ ] `featuredMediaId`, `galleryMediaIds` on Product schema (optional).
- [ ] Create/update/read return new fields without breaking existing clients.
- [ ] Storefront still uses URL fields only.
- [ ] Invalid media IDs return **400**, not 500.

### Media-5E-C (backfill)

- [ ] Dry-run report for full catalog.
- [ ] High-confidence matches write IDs; ambiguous flagged.
- [ ] Existing manual IDs not overwritten by default.

### Media-5E-D (ProductForm dual-write)

- [ ] Picker save sends IDs + URLs when asset has library id.
- [ ] URL-only selection still saves.
- [ ] Gallery order preserved across both arrays.
- [ ] No change to variation image URL fields unless scoped separately.

### Media-5E-E (usage)

- [ ] Used media detected by ID and URL.
- [ ] Same product/field not double-counted.
- [ ] DELETE and deactivate protection still return **409** when used.
- [ ] Legacy URL-only products still protected.

### Media-5E-F (replace)

- [ ] Replace updates product IDs and URLs.
- [ ] Old media usage drops; new media usage increases.

### Media-5E-G (cleanup)

- [ ] Report lists products with URLs and no matching Media / no ID.
- [ ] No automatic deletion of media or product data.

### Global (all implementation phases)

- [ ] No storefront breakage.
- [ ] Existing products load in admin and storefront.
- [ ] URL-only products work end-to-end.
- [ ] ID-backed products show accurate usage in Media Library.
- [ ] Delete/deactivate protection works for ID and URL references.
- [ ] Product API payload remains backward compatible (URLs always present).

---

## Summary

The platform is **safe at the URL layer** (Media-5B, 5D, 5D.1). The next step is **optional, additive media IDs** on products while **keeping URL fields** for storefront and legacy clients. Dual-write from ProductForm, ID-first usage with URL fallback, backfill, and replace workflow should roll out in small phases (**5E-B through 5E-G**) without breaking existing product APIs or image rendering.

---

*No application code, configuration, database schema, or API routes were modified in Media-5E-A.*
