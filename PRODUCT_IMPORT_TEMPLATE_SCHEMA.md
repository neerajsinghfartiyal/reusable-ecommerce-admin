# Product Import Template Schema

**Status:** Canonical schema aligned (Import-1A)  
**Companion doc:** `PRODUCT_IMPORT_ARCHITECTURE.md`  
**Source of truth (code):** `reusable-ecommerce-backend/src/config/productImportSchema.js`  
**Schema version:** `product-import-schema-v1.0`  
**Template files:** `product-import-template.csv` / `product-import-template.xlsx`  
**Last updated:** 2026-05-21

---

## 1. Overview

Import templates (CSV and XLSX) are generated from a single canonical column definition. CSV is built at download time; XLSX is a static file regenerated via `node scripts/generateProductImportTemplateXlsx.js`. Both use identical headers and example rows.

**Import-1A scope:** templates and documentation only — no upload, parse, or product writes.

---

## 2. Canonical header row (column order)

```text
template_version,product_type,parent_sku,product_name,slug,sku,category,brand,unit_type,status,short_description,description,price,sale_price,stock,featured_image,gallery_images,attribute_1_name,attribute_1_value,attribute_2_name,attribute_2_value,variation_options,seo_title,seo_description,tags,weight,length,width,height
```

**Naming rule:** snake_case import-facing keys. Do not use legacy aliases (`stock_quantity`, `featured_image_url`, `gallery_image_urls`) in v1 templates — those names are retired in favor of the columns below.

---

## 3. Importer field mapping (Product API)

| Import column | Backend field | Notes |
|---------------|---------------|--------|
| `product_name` | `name` | Required on all row types |
| `sku` | `sku` / `variations[].sku` | Globally unique per row |
| `slug` | `slug` | Optional; auto from name if omitted |
| `stock` | `quantity` / `variations[].quantity` | Integer inventory |
| `featured_image` | `featuredImage` / `variations[].image` | Variation row = variation image for now |
| `gallery_images` | `galleryImages[]` | Split on `\|` into URL array |
| `category` | `category` | Name/path → Category ObjectId resolver |
| `brand` | `brand` | Name → Brand ObjectId resolver |
| `unit_type` | `unitType` | Name → UnitType ObjectId resolver |
| `short_description` | `shortDescription` | |
| `description` | `description` | |
| `price` | `price` / `variations[].price` | |
| `sale_price` | `salePrice` / `variations[].salePrice` | |
| `status` | `status` | `draft`, `published`, `inactive` |
| `attribute_*` | `attributes[]` / `variations[].attributes[]` | Built from flat slots |
| `seo_title`, `seo_description` | — | **Ignored** until Product schema supports SEO |
| `tags`, `weight`, `length`, `width`, `height` | — | Forward-compatible / future |

### Product type mapping

| `product_type` | Meaning |
|----------------|---------|
| `simple` | One product row → single `Product` |
| `variable` | Parent/listing row → `Product` with variation attributes defined |
| `variation` | Child row → merged into parent `variations[]` via `parent_sku` |

---

## 4. Required vs optional by `product_type`

| product_type | Required columns | Notes |
|--------------|------------------|--------|
| **simple** | `template_version`, `product_type`, `product_name`, `sku`, `price` | `category` validation-required for API create |
| **variable** | `template_version`, `product_type`, `product_name`, `sku` | `price` optional if all pricing on variations |
| **variation** | `template_version`, `product_type`, `parent_sku`, `product_name`, `sku`, `price` | ≥1 attribute value (`attribute_1_value` and/or `attribute_2_value`) |

**Conditional** = required only for certain types (see XLSX Field Reference sheet).

**Variation inheritance:** variation rows may leave blank: `category`, `brand`, `unit_type`, descriptions, `gallery_images`, SEO — importer inherits from parent at commit (Import-2).

**Row order:** variable parent row must appear **before** its variation rows in the file.

---

## 5. Delimiters and accepted values

| Topic | Rule |
|-------|------|
| `product_type` | `simple`, `variable`, `variation` |
| `status` | `draft`, `published`, `inactive` |
| `gallery_images` | Pipe `\|` between URLs (`url1\|url2`). Comma fallback only if no pipe. |
| `variation_options` | Semicolon `;` between attribute names (`Color;Size`) |
| `tags` | Comma-separated |
| `category` | Name or breadcrumb path (`Apparel > Tees`) — matched by name on import |
| `brand`, `unit_type` | Matched by name on import |

---

## 6. Images

| Column | Use |
|--------|-----|
| `featured_image` | Primary image URL (simple/variable parent) |
| `gallery_images` | Additional URLs, pipe-separated |
| `featured_image` on **variation** row | Per-variation image (`variations[].image`) until a dedicated column is added |

---

## 7. XLSX workbook structure

| Sheet | Purpose |
|-------|---------|
| **Products** | Headers + example rows (same as CSV) |
| **Instructions** | Workflow, delimiters, accepted values, row order |
| **Field Reference** | All columns: required, type, maps_to, accepted values, examples |
| **Examples** | Simple product sample |
| **Variation Examples** | Variable parent + 2 variations |

Only the **Products** sheet will be imported in Import-2+.

---

## 8. CSV rules

- UTF-8 with BOM on download.
- Row 1 = headers only — **no comment rows** (would break parsing).
- Clarity via example data and XLSX Instructions / Field Reference.

---

## 9. Full column reference

| Column | Required | Type | Applies to | maps_to | Accepted values (summary) |
|--------|----------|------|------------|---------|---------------------------|
| `template_version` | yes | string | all | — | `product-import-schema-v1.0` |
| `product_type` | yes | enum | all | — | simple, variable, variation |
| `parent_sku` | conditional | string | variation | — | Parent variable SKU |
| `product_name` | yes | string | all | name | Any text |
| `slug` | optional | string | simple, variable | slug | URL-safe |
| `sku` | yes | string | all | sku | Unique |
| `category` | conditional | string | simple, variable | category | Catalog name/path |
| `brand` | optional | string | simple, variable | brand | Catalog name |
| `unit_type` | optional | string | simple, variable | unitType | Catalog name |
| `status` | optional | enum | all | status | draft, published, inactive |
| `short_description` | optional | text | simple, variable | shortDescription | Text/HTML |
| `description` | optional | text | simple, variable | description | Text/HTML |
| `price` | conditional | number | simple, variation (+ opt. variable) | price | ≥ 0 |
| `sale_price` | optional | number | simple, variation | salePrice | ≤ price |
| `stock` | optional | integer | simple, variation | quantity | ≥ 0 |
| `featured_image` | optional | url | all | featuredImage / variations[].image | http(s) URL |
| `gallery_images` | optional | string | simple, variable | galleryImages | Pipe URLs |
| `attribute_1_name` | conditional | string | variable / variation | attributes | Attribute label |
| `attribute_1_value` | conditional | string | variation | variations[].attributes | Value |
| `attribute_2_name` | optional | string | variable / variation | attributes | Second attribute |
| `attribute_2_value` | optional | string | variation | variations[].attributes | Value |
| `variation_options` | optional | string | variable | — | Semicolon names |
| `seo_title` | optional | string | simple, variable | — | Ignored until schema supports |
| `seo_description` | optional | string | simple, variable | — | Ignored until schema supports |
| `tags` | optional | string | simple, variable | — | Comma-separated |
| `weight` | optional | number | all | — | ≥ 0 |
| `length` | optional | number | all | — | ≥ 0 |
| `width` | optional | number | all | — | ≥ 0 |
| `height` | optional | number | all | — | ≥ 0 |

---

## 10. Example rows (abbreviated)

See downloaded template or `EXAMPLE_ROWS` in `productImportSchema.js`:

1. **simple** — `TEE-001` with gallery `url1|url2`
2. **variable** — `HD-100` with `variation_options` = `Color;Size`
3. **variation** — `HD-100-RED-M`, `parent_sku` = `HD-100`
4. **variation** — `HD-100-BLU-L` with `featured_image` on child

---

## 11. Versioning

| Label | Value |
|-------|--------|
| Schema | `product-import-schema-v1.0` |
| `template_version` column | Same value on each example row |

**MAJOR** = breaking column changes · **MINOR** = optional columns · **PATCH** = docs/examples only.

---

## 12. Planned columns (not in v1)

May appear in `product-import-schema-v1.1+`: `external_id`, `category_path`, `stock_status`, `image_alt_text`, `attribute_*_visible`, `attribute_*_variation`, `variation_image_url`, `seo_keywords`, `metadata_json`, `import_notes`.

---

*End of template schema document.*
