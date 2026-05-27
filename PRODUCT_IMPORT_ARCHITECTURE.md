# Product Import Architecture

**Status:** Planning only (no implementation in this phase)  
**Project:** Reusable Ecommerce Admin + Backend  
**Template version:** `product-import-template-v1.0`  
**Schema version:** `product-import-schema-v1.0`  
**Last updated:** 2026-05-21

---

## Import-1A alignment note

Canonical import column keys, headers, examples, Field Reference, and importer mapping notes live in **`reusable-ecommerce-backend/src/config/productImportSchema.js`**. CSV and XLSX templates are generated from that module. Use import-facing names (`stock`, `featured_image`, `gallery_images`) — not legacy planning aliases (`stock_quantity`, `featured_image_url`). See **`PRODUCT_IMPORT_TEMPLATE_SCHEMA.md`** for the full v1 column list.

---

## 1. Import goals

### Business goals

- Enable merchants to onboard large catalogs without manual one-by-one product entry.
- Support **simple products** and **variable products** (parent + variations) consistent with the existing admin product model.
- Preserve data integrity for **SKU uniqueness**, **category requirements**, **pricing**, and **inventory**.
- Provide a **preview-before-commit** workflow so operators can fix mapping errors before writes.
- Scale to **thousands of rows** via background jobs without blocking the admin UI.
- Lay groundwork for **multi-source imports** (native template, Shopify, WooCommerce, marketplaces, supplier feeds).

### Technical goals

- Align import payloads with current `Product` schema and `POST/PUT /api/products` behavior.
- Resolve references (category, brand, unit type, attributes) by **stable keys** (slug/code/SKU), not only MongoDB IDs.
- Treat media as **URL-first** in v1 (matching current admin URL-based image fields), with optional Media Library linking in later phases.
- Produce **auditable import runs** (who, when, what changed, errors, warnings).
- Support **idempotent re-import** strategies (update vs skip vs create) keyed by SKU and/or external ID.

### Non-goals (v1)

- Real-time sync with external platforms (batch only).
- Automatic image binary upload from arbitrary URLs without validation (deferred).
- Full rollback of partial imports without explicit job design (see rollback strategy).
- Modifying catalog taxonomy (Categories/Brands/Attributes) inside the same file unless explicitly enabled.

---

## 2. Professional import architecture

### High-level components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Admin UI (Import Wizard)                        │
│  Upload → Parse → Map → Validate → Preview → Confirm → Summary          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Import API (new module, future)                      │
│  Sessions · Jobs · Row validation · Reference resolution · Writes       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
   │ File store   │    │ Job queue    │    │ Import audit DB  │
   │ (CSV/XLSX)   │    │ (workers)    │    │ runs/rows/logs   │
   └──────────────┘    └──────────────┘    └──────────────────┘
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                ▼
                    ┌───────────────────────┐
                    │ Existing catalog APIs │
                    │ Product · Category ·    │
                    │ Brand · Attribute ·     │
                    │ Media (optional)        │
                    └───────────────────────┘
```

### Design principles

1. **Separation of concerns:** Parsing/mapping (stateless) vs persistence (transactional per row or batch).
2. **Fail-safe defaults:** Invalid rows do not abort entire job; errors are row-scoped (row-level best-effort commit in V1).
3. **Explicit operator intent:** Duplicate policy, variation grouping, and media behavior are chosen before import.
4. **Schema versioning:** Template version in file metadata; parser rejects or migrates unknown versions.
5. **Extensibility:** Source adapters (Shopify, CSV native, etc.) normalize into a common **canonical import row** model.

### Canonical import row model (internal)

Each parsed row normalizes to:

| Field group | Purpose |
|-------------|---------|
| Identity | `external_id`, `parent_sku`, `product_type` (simple \| variable \| variation) |
| Product core | `product_name`, sku, slug (optional), status, descriptions |
| Taxonomy | `category` / `category_path`, brand, unit_type (by slug/name/code) |
| Pricing & stock | price, sale_price, `stock_quantity` (parent and/or variation) |
| Attributes | `attribute_N_name` / `attribute_N_value` (+ visible / variation flags) |
| Variation axes | Attribute value columns on variation rows → variation combination |
| Media | `featured_image_url`, `gallery_image_urls` (pipe-delimited; see §V1.8) |
| SEO / meta | optional columns → stored when backend supports |
| Provenance | `source`, `source_row_number`, `template_version` |

Adapters map external formats → canonical rows → existing product create/update payloads.

---

## 3. End-to-end workflow

### 3.1 Upload

- Operator selects **CSV** or **XLSX** (and later ZIP with images + manifest).
- Max file size / row count enforced server-side.
- File stored with checksum; **import session** created (`draft`).
- Optional: download official template from same screen (static v1, dynamic v2).

### 3.2 Parse

- Detect encoding (UTF-8 default; BOM strip).
- For XLSX: read named sheets (`Products` required; ignore hidden instruction sheets for data).
- Infer delimiter for CSV; header row required.
- Map headers → canonical fields (auto-map + manual override UI).
- Store parsed rows in session staging (DB or object storage JSON chunks).

### 3.3 Map

- **Column mapping UI:** file column → system field (with samples from first N rows).
- **Reference mapping:** category slug, brand slug, attribute codes (preview unresolved refs).
- **Variation grouping key:** `parent_sku` + `product_type`.
- Save mapping profile for reuse (`mapping_profile_name`).

### 3.4 Validate

Validation layers:

| Layer | Examples |
|-------|----------|
| Schema | Required columns present, types, enums (`status`: draft/published/inactive) |
| Reference | Category exists (or auto-create if policy allows), brand optional, attribute codes exist |
| Uniqueness | SKU unique in file and vs DB under chosen duplicate policy |
| Variation | Parent row exists for variation rows; axis values match attribute definitions |
| Business | price ≥ 0, sale_price ≤ price (warning), quantity ≥ 0 |
| Media | URL format; optional HEAD request for reachability (async, warning only) |

Output: `errors` (blocking), `warnings` (non-blocking), per-row status.

### 3.5 Preview

- Paginated grid: resolved names, SKU, category, variation summary, issues badges.
- Filters: errors only, warnings only, parents only, variations only.
- No writes; session status → `validated`.

### 3.6 Import (commit)

- Operator confirms **duplicate policy**, **batch size**, **dry-run** (optional).
- Job enqueued: `import_jobs` status `queued` → `running`.
- Worker processes rows in dependency order:
  1. Parents / simple products
  2. Variations (attach to parent by SKU)
  3. Post-process: slug conflicts, media association
- Progress streamed to UI (SSE or polling): % complete, success/fail counts.

### 3.7 Summary

- Final report: created / updated / skipped / failed counts.
- Downloadable **error CSV** (row number, sku, message).
- Link to **import history** detail.
- Session status → `completed` or `completed_with_errors`.

---

## 4. Product, variation, media, and inventory handling

### 4.1 Simple products

- One row, `product_type=simple`.
- Maps to single `Product` with `variations=[]` (or empty).
- Parent-level `sku`, `price`, `stock_quantity`, `featuredImage`, `galleryImages`.

### 4.2 Variable products (variable parent + variations)

Aligned with current admin behavior:

- **Parent row:** `product_type=variable` — `product_name`, category, brand, unit type, descriptions, attributes assignment, parent `sku` (listing SKU).
- **Variation rows:** `product_type=variation`, `parent_sku` required — per-variation `sku`, `price`, `sale_price`, `stock_quantity`, `variation_image_url`, status, attribute value columns.
- Importer builds `attributes[]` on parent from distinct variation axes, then `variations[]` with `attributes` entries matching `normalizeProductVariations` expectations.

**V1 variation update/merge (default):**

- **Merge by variation SKU** — not full replace of `variations[]`.
- Existing variation SKU in DB → update that variation’s fields from the row.
- New variation SKU → append variation.
- Variation rows **missing** from the file → **do not delete** existing variations (unless a future explicit **replace all variations** mode is selected).
- Duplicate variation SKUs **within the uploaded file** → validation **errors** (all conflicting rows flagged).

**Generation vs explicit rows:**

| Mode | Description |
|------|-------------|
| Explicit rows (v1) | Each variation is a row; importer does not auto-cartesian product |
| Generated (v2) | Parent row lists axis values; system generates combinations like admin UI |

### 4.3 Attributes

- Reference attributes by **`code`** (unique, lowercase in DB).
- Values by **`value`** or **`label`** (resolver matches attribute value list).
- Unknown attribute: error (default) or auto-create attribute (policy, phase 3+).
- `isVariationAttribute` inferred from variation columns or explicit column.

### 4.4 Media

Current system: **URL strings** on product and variations.

| Strategy | v1 | Later |
|----------|----|-------|
| URL pass-through | Store URL in `featuredImage` / `galleryImages` / variation `image` | — |
| Media Library link | — | Resolve URL → existing media doc or import to library |
| Download & host | — | Background fetch, virus scan, S3/CDN |
| Filename column | — | Map to uploaded ZIP manifest |

**Gallery format in CSV:** pipe `|` is the **preferred** delimiter for `gallery_image_urls`; comma is fallback only. If both appear, **pipe wins**. URLs trimmed; empty segments ignored (see template schema §Gallery).

### 4.5 Inventory

- **Simple:** `quantity` on product root.
- **Variable:** `quantity` on each variation row; parent quantity optional (sum or max policy — default: **do not set parent quantity** when variations exist).
- Low-stock dashboard reads existing snapshot APIs; no separate inventory ledger in v1.

---

## 5. Duplicate detection

### Keys (priority order)

1. **SKU** (primary) — product root `sku` and **all variation SKUs** participate in one **global SKU namespace**.
2. **External ID** (optional) — see §V1.5; reporting and future persistence.
3. **Slug** (secondary warning) — see §V1.4.

### Variation SKU uniqueness (V1 import-layer rule)

- **Variation SKUs must be globally unique** across all products and all variations in the catalog.
- **Parent SKU must not be reused** as a variation SKU (same string → validation error).
- Treat duplicate variation SKU the same as duplicate product SKU (in-file and vs database under duplicate policy).
- Current backend may only enforce uniqueness on root `Product.sku`; until extended, the **import validator and commit step must enforce** global variation SKU uniqueness before write.

### In-file duplicates

- Duplicate SKUs in file (any row type) → validation error on conflicting rows.
- Duplicate variation SKUs in file → validation error (even under same parent).

### Operator policies (per import run)

| Policy | Behavior |
|--------|----------|
| `skip` | Existing SKU → skip row, log as skipped |
| `update` | Merge non-empty fields into existing product |
| `replace` | Full replace of product payload (dangerous; admin-only) |
| `create_only` | Fail row if SKU exists |

Default recommendation: **`update`** for migrations, **`skip`** for additive feeds.

---

## 6. SKU strategy

- **Required** for simple products and each variation (matches API: name, sku, price, category required).
- Trim whitespace; case-sensitive uniqueness (document for operators).
- Parent SKU for variable products:
  - **Option A:** Parent has its own SKU (listing SKU); variations have distinct SKUs (recommended).
  - **Option B:** Parent SKU omitted; system generates internal placeholder (not ideal for channels).
- **Supplier SKU** column optional → maps to metadata, not primary key.
- **Barcode/GTIN** optional column → metadata until first-class schema support.

---

## 7. Slug strategy

**V1 behavior (template + import layer):**

| Case | Rule |
|------|------|
| `slug` provided | Normalize (slugify rules); validate uniqueness; use on write **when backend supports manual slug** |
| `slug` missing | Generate from `product_name`; if conflict, append numeric suffix (`-2`, `-3`, …) |
| Backend lacks manual slug | Accept and validate `slug` column in template; **warn and ignore on write** safely (generated slug from name used instead) |
| Update | Do not change existing slug unless `slug` provided and `update_slug` policy enabled (future) |

- Preview shows slug collision warnings before commit.
- Backend today auto-generates slug from `name` on save; import layer prepares slug values for when API accepts overrides.

---

## 8. Category and brand strategy

### Categories (required)

- Resolve by **`category`** (slug/name) or **`category_path`** (breadcrumb path) per template schema.
- Policies:
  - `strict` — must exist (default).
  - `auto_create` — create inactive category (phase 2+).
- Multiple categories per product: **not in v1** (single `category` ObjectId today).

### Brands (optional)

- Resolve by **`brand_slug`** or **`brand_name`**.
- Missing brand → `null` (allowed).
- Auto-create brand: optional policy phase 2+.

### Unit types (optional)

- Resolve by **`unit_type_slug`** or name.
- Missing → `null`.

---

## 9. Media handling strategy

See §4.4. Additional rules:

- Validate URL scheme (`http`, `https`).
- Strip tracking query params optionally (config).
- Max gallery count (e.g. 20) per product.
- Broken URL → warning, not hard fail (v1).
- Duplicate URLs in gallery → dedupe.

### Gallery delimiter (V1)

- **Preferred:** pipe `|` — e.g. `https://a.jpg|https://b.jpg`
- **Fallback:** comma `,` only when pipe is absent in the cell value.
- **If both present:** split on pipe first; comma-separated segments inside pipe segments are not treated as separate URLs unless no pipe exists.
- Trim whitespace; drop empty URL tokens.

---

## 10. Import jobs and background processing

### Job model (conceptual)

```
ImportSession
  id, admin_id, file_uri, template_version, mapping_json, policy_json
  status: draft | validated | queued | running | completed | failed | cancelled
  stats: { total, valid, invalid, created, updated, skipped, failed }

ImportJob
  session_id, started_at, finished_at, worker_id, progress_pct

ImportRowResult
  session_id, row_number, sku, status, product_id, messages[]
```

### Processing

- **Chunk size:** 50–100 rows per batch (tunable).
- **Concurrency:** single worker per session initially; global worker pool later.
- **Idempotency:** row result keyed by `session_id + row_number`; retries skip completed rows.
- **Rate limiting:** protect MongoDB and API from thundering herd.

### Infrastructure options

| Phase | Approach |
|-------|----------|
| 1 | In-process queue (Node + BullMQ/Redis) |
| 2 | Dedicated worker service |
| 3 | Serverless functions per chunk (large scale) |

---

## 11. Rollback and failure boundaries

### V1 import transaction model

- **Row-level, best-effort import:** one failed row does not fail the whole job.
- Successful rows commit independently; failed rows recorded in `ImportRowResult` with messages.
- **No chunk-level rollback** in V1 (future scope).
- **No full import rollback** in V1 (future advanced scope — see below).

### v1 operator recovery (pragmatic)

- Import summary stores **created product IDs** and **updated product IDs** per session.
- Operator actions: bulk deactivate imported products, export revert CSV (manual).
- **Dry-run mode:** validate + simulate counts without writes.

### v2+ (future)

- Compensating transaction log / snapshot before-update.
- Rollback job from session manifest; optional chunk-level rollback.

---

## 12. Import logs and history

### Admin UI (future)

- **Import History** page under Catalog: list sessions, status, operator, counts, duration.
- Drill-down: row-level errors, downloadable error file, re-run mapping.

### Activity integration

- Log `PRODUCT_IMPORT_STARTED`, `PRODUCT_IMPORT_COMPLETED` via existing activity log module.
- Include session id, file name, counts.

### Retention

- Staging files: 30 days.
- Summary metadata: 1 year.
- PII: file may contain supplier data — encrypt at rest, access admin-only.

---

## 13. Future platform and feed support

### Adapter pattern

```
SourceAdapter (interface)
  detect(file) → boolean
  parse(file) → CanonicalRow[]
  suggestMapping() → ColumnMap
```

### Planned sources

| Source | Notes |
|--------|-------|
| **Native template** | CSV/XLSX per `PRODUCT_IMPORT_TEMPLATE_SCHEMA.md` |
| **Shopify** | Products export CSV; variant SKU, options, images |
| **WooCommerce** | WC product export; parent/child via `Type` column |
| **Amazon** | Listing flat files (ASIN, SKU, quantity, price) |
| **eBay** | File exchange format |
| **Supplier feed** | Scheduled SFTP CSV/JSON; recurring import jobs |
| **Google Sheets** | Published CSV export URL (read-only pull job) |

Normalization handles platform-specific option names → attribute codes.

---

## 14. Phased implementation roadmap

### Phase 0 — Planning (current)

- Architecture doc + template schema doc.
- Stakeholder sign-off on SKU/duplicate/variation rules.

### Phase 1 — MVP import (native CSV)

- Backend: import session API, CSV parse, validation, synchronous small imports (&lt;200 rows).
- Frontend: wizard (upload → map → preview → import → summary).
- Simple products only; strict category resolution; URL media; skip/update policy.

### Phase 2 — Variations + XLSX

- Parent/child rows; XLSX multi-sheet parser.
- Mapping profiles; error export CSV.
- Background job queue for &gt;200 rows.

### Phase 3 — Resilience and ops

- Import history UI; activity logs; dry-run.
- Auto-create taxonomy (optional policies).
- Media Library URL registration.

### Phase 4 — Rollback and advanced inventory

- Before-update snapshots; rollback job.
- Supplier external_id; recurring scheduled imports.

### Phase 5 — External adapters

- Shopify + WooCommerce adapters.
- Amazon/eBay pilot mappings.
- Webhook notify on completion.

---

## 15. API surface (planned, not implemented)

Illustrative endpoints for implementation reference:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/product-imports/template` | Download template (version, format) |
| POST | `/api/product-imports/sessions` | Upload file, create session |
| PATCH | `/api/product-imports/sessions/:id/mapping` | Save column mapping |
| POST | `/api/product-imports/sessions/:id/validate` | Run validation |
| GET | `/api/product-imports/sessions/:id/preview` | Paginated preview rows |
| POST | `/api/product-imports/sessions/:id/run` | Start import job |
| GET | `/api/product-imports/sessions/:id` | Status + summary |
| GET | `/api/product-imports/sessions/:id/errors.csv` | Error export |
| GET | `/api/product-imports/history` | List past sessions |

All routes admin-authenticated; reuse existing auth middleware.

---

## 16. Security and compliance

### Permissions (V1)

- Restrict product import to **`super_admin` and `admin` roles** initially (same gate as sensitive catalog operations).
- Later: fine-grained **`product.import`** permission when role system supports it.

### Other controls

- Virus scan on uploaded files (clamav or cloud AV).
- SSRF protection if validating image URLs server-side.
- Row limits and timeout caps per job.
- Audit trail immutable for compliance.

---

## 17. Alignment with current codebase

| Existing asset | Import use |
|----------------|------------|
| `Product` model | Target document for writes |
| `POST /api/products` | Create path |
| `PUT /api/products/:id` | Update path |
| Categories / Brands / Unit Types | Reference resolution |
| Attributes (`code`, values) | Variation axes + assignment |
| Media Library | Phase 3+ association |
| Admin ProductForm payload | Canonical payload template |

---

## 18. V1 implementation defaults (Import-0B)

Canonical column spec: **`PRODUCT_IMPORT_TEMPLATE_SCHEMA.md`** (`product-import-schema-v1.0`).

### 18.1 Parent SKU and variation rows

- Every **variation** row must include **`parent_sku`**.
- Parent must exist **in the same import file** (variable row with that SKU) **or** already in the database.
- If parent is missing → row **error**; do not queue row for commit.
- **Staged multi-upload** (child file before parent file) is **future scope**, not V1 default.

### 18.2 Variation SKU uniqueness

See §5 — global uniqueness; parent SKU cannot equal any variation SKU.

### 18.3 Variation merge

See §4.2 — merge-by-variation-SKU default; no silent deletion of omitted variations.

### 18.4 Slug

See §7.

### 18.5 external_id

- **Optional** column.
- **V1:** If product schema supports metadata/custom fields → persist `external_id` there (e.g. `metadata_json` or dedicated meta).
- **If metadata not supported yet:** use `external_id` for **validation, preview, and import reporting only**; document in summary; persistence in Phase 2+.

### 18.6 Failure boundary

See §11 — row-level best-effort; no whole-job or chunk rollback in V1.

### 18.7 Permissions

See §16 — `super_admin` / `admin` only in V1.

### 18.8 Gallery delimiter

See §9 — pipe preferred; comma fallback; pipe wins if both present.

### 18.9 Remaining open decisions (track before build)

1. Max rows per job for sync vs async threshold (default proposal: 200 sync, above → queue).
2. Auto-create categories/brands: off by default in V1 (strict resolution).
3. **Replace all variations** mode: off in V1; add in advanced import policies later.

---

*End of architecture document.*
