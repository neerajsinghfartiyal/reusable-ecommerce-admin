# Frontend Design System Plan (Ecommerce Admin)

## Purpose

This document defines a practical, system-first UI migration roadmap for the ecommerce admin frontend.  
The goal is to stop random page-by-page styling patches and move to a consistent design system architecture.

Scope of this plan:
- Frontend styling and component structure only
- No backend, API, route contract, or business-logic changes

---

## Long-Term UX Target: Shadcn Admin SaaS Foundation

Long-term direction:
- The final frontend should feel like the Shadcn Admin SaaS foundation, adapted to an ecommerce CMS workflow.
- The current design-system migration should continue safely without interrupting ongoing module stabilization.
- After DS page migrations are stable, run a dedicated **Dashboard + Navigation + SaaS Experience Refinement** phase.

Long-term patterns to implement later:
- Top horizontal navigation
- Dashboard tabs
- SaaS metric cards
- Chart/widget layout
- Integrated header/search/theme/settings/avatar experience
- Polished dashboard rhythm and spacing
- Consistent light/dark tokens
- True design-system-driven page layouts

Important note:
- Do not massively rewrite unrelated pages during the current DS migration.

---

## 1) Current UI Architecture Problem

The current frontend has grown through multiple styling eras. This creates maintenance cost and visual inconsistency.

### Mixed styling systems
- Legacy global CSS in `src/index.css`
- Old custom UI wrappers in `src/components/ui`
- New shadcn primitive components in `src/components/ui`
- Admin wrappers in `src/components/admin-ui`
- Direct Tailwind classes inside many page files
- Native HTML controls styled differently per page

### Duplicated/overlapping components
- `PageHeader.jsx` vs newer module/admin header patterns
- `AdminCard.jsx` vs modern card wrappers
- `DataTable.jsx` vs newer table wrapper patterns
- `StatusBadge.jsx` vs modern status badge wrappers
- `ActionButton.jsx` vs shadcn `Button` / admin action patterns

### Dark mode inconsistency
- Some UI surfaces use shared dark-aware wrappers, others use legacy light-first classes
- Per-page hardcoded fixes are used instead of shared semantic tokens
- Native controls and legacy pagination often need page-local dark mode patches

### Legacy CSS conflicts
- Large global CSS file introduces class collisions and non-semantic visual rules
- Page-level classes can override component-level styling unexpectedly

### Native controls inconsistency
- Raw `select`/`input`/`textarea` are styled differently across pages
- Form controls do not always share spacing, borders, focus states, or dark-mode behavior

### Page-level styling problem
- Pages often decide styling details themselves instead of using shared patterns
- This increases duplicate class strings and regression risk in light/dark themes

---

## 2) Target Frontend Architecture

Use a clear 4-layer model.

## Layer 1: Global Theme Layer

Responsibilities:
- Define semantic CSS tokens
- Support light/dark mode from one source of truth
- Avoid direct color usage in page code unless truly required

Minimum token groups:
- `background`
- `foreground`
- `card`
- `muted`
- `border`
- `primary`
- `destructive`

---

## Layer 2: Base UI Layer

Use shadcn primitives only in this layer.

Core components:
- `Button`
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `Card`
- `Table`
- `Badge`
- `Dialog`
- `Dropdown`
- `Avatar`

Rules:
- Keep these components generic and reusable
- No admin-page-specific layout logic here

---

## Layer 3: Admin Design System Layer

This is the main reusable UI layer for admin pages (`src/components/admin-ui`).

Target shared components:
- `AdminPage`
- `AdminPageHeader`
- `AdminCard`
- `AdminToolbar`
- `AdminDataTable`
- `AdminFormGrid`
- `AdminField`
- `AdminStatusBadge`
- `AdminPagination`
- `AdminEmptyState`
- `AdminAlert`
- `AdminActions`

Rules:
- Admin pages should compose these components instead of hand-coding structure/styling
- Shared components should expose clear variants and props for common admin needs

---

## Layer 4: Page Pattern Layer

Define standard page compositions so each page is predictable.

Patterns:
- **List page pattern**: header + filters/toolbar + table + pagination + empty/loading/error states
- **Form page pattern**: header + form sections + field/help/error patterns + sticky actions
- **Detail page pattern**: summary cards + related tables/sections + contextual actions
- **Dashboard page pattern**: stat cards + trend/content blocks + quick actions + recent activity

---

## 3) Components to Keep and Standardize

Keep and strengthen these foundations:
- `src/components/admin-shell` (active app shell)
- shadcn primitives in `src/components/ui` (base layer)
- `src/components/admin-ui` as the primary admin design-system layer

---

## 4) Components to Deprecate Later

Deprecate after safe migration is complete:
- `PageHeader.jsx`
- `AdminCard.jsx`
- `DataTable.jsx`
- `Toolbar.jsx`
- `StatusBadge.jsx`
- `ActionButton.jsx`
- `EmptyState.jsx`
- Old `src/components/layout` components
- Legacy page-specific CSS classes (remove in controlled batches after migration)

---

## 5) New Shared Components to Build First (Priority)

Build in this order:
1. `AdminPage`
2. `AdminPageHeader`
3. `AdminField`
4. `AdminSelect`
5. `AdminPagination`
6. `AdminDataTable`
7. `AdminFormSection`
8. `AdminAlert`
9. `AdminConfirmDialog`

Why this order:
- It fixes the highest-frequency inconsistencies first (layout, fields, select, pagination, table)
- It reduces future per-page patches and speeds up migration safely

---

## 6) Migration Rules

Mandatory rules for all future frontend UI work:
- No new page-specific hardcoded color classes unless absolutely necessary
- Prefer semantic tokens and shared components
- No raw native `select` without `AdminSelect` (or an approved shared class abstraction)
- No raw pagination implementation in pages
- No new usage of old `AdminCard` / `PageHeader` / `DataTable` in new work
- Backend/API/business logic must remain unchanged
- Page migration work should be layout/styling only

---

## 7) Implementation Order

Follow this phased sequence:

### Phase 1: Create design system plan
- Finalize and approve this document
- Align team on layering model and migration rules

### Phase 2: Theme token cleanup
- Consolidate semantic tokens and dark-mode mapping
- Reduce direct color usage in global/frontend shared styles

### Phase 3: Build missing admin-ui components
- Build prioritized missing shared components in `admin-ui`
- Keep props backward-compatible where practical

### Phase 4: Replace pagination/select/form primitives
- Migrate raw select usage to `AdminSelect`
- Replace legacy pagination with `AdminPagination`
- Normalize form field structure with `AdminField`/`AdminFormSection`

### Phase 5: Migrate remaining legacy pages
- Move pages still on old wrappers/classes to admin-ui patterns
- Keep behavior unchanged

### Phase 6: Standardize dashboard
- Align dashboard with official dashboard pattern and tokens
- Remove custom one-off style islands

### Phase 7: Remove/deprecate old UI components
- Remove unused legacy wrappers after all dependents migrate
- Delete dead CSS blocks in controlled PRs

### Phase 8: Final QA
- Validate light/dark consistency
- Run full regression pass for major CRUD workflows

---

## 8) Page Migration Map

| Page | Current UI status | Target pattern | Priority | Notes |
|---|---|---|---|---|
| Dashboard | Migrated but still has page-level custom styling | Dashboard page pattern | High | Standardize cards/tables/actions via shared wrappers |
| Products | Mostly migrated; still mixed with direct Tailwind/native controls | List page pattern | High | Move remaining controls to shared select/pagination/field patterns |
| ProductForm | Partially standardized, still page-specific form styling in places | Form page pattern | High | Normalize sections/field/help/actions |
| Attributes | Recently improved and using shared styles | Form + List hybrid pattern | Medium | Use as reference for future migrations; continue pattern cleanup |
| Categories | Migrated to admin-ui wrappers | List page pattern | Medium | Verify full compliance with new shared select/pagination rules |
| Brands | Migrated to admin-ui wrappers | List page pattern | Medium | Standardize filter/action composition |
| UnitTypes | Migrated to admin-ui wrappers | List page pattern | Medium | Ensure table/empty/loading consistency |
| Orders | Migrated but still mixed in controls/styling | List page pattern | High | Normalize filters, status actions, pagination |
| OrderDetails | Dark mode improved; likely still custom detail composition | Detail page pattern | High | Consolidate summary blocks and status/action areas |
| Returns | Migrated but with mixed page-level styling | List page pattern | High | Align controls and table semantics |
| ReturnDetails | Dark mode improved; detail layout still page-authored | Detail page pattern | High | Standardize detail sections and field patterns |
| Customers | Migrated list with some custom control styling | List page pattern | High | Normalize filter/edit controls and pagination |
| CustomerDetails | Legacy wrappers likely still active | Detail page pattern | High | One of the highest-priority legacy migrations |
| Coupons | Migrated to admin-ui wrappers | List/Form pattern | Medium | Validate against shared form/list primitives |
| PaymentMethods | Migrated to admin-ui wrappers | List/Form pattern | Medium | Replace any leftover raw controls |
| ShippingMethods | Migrated to admin-ui wrappers | List/Form pattern | Medium | Ensure full pattern compliance |
| Pages | Migrated module UI | List page pattern | Medium | Align with shared actions/status/table conventions |
| PageForm | Migrated module UI | Form page pattern | Medium | Standardize form sections/actions |
| MediaLibrary | Migrated module UI | List/Detail hybrid pattern | Medium | Standardize toolbar/cards/empty states |
| Redirects | Migrated module UI | List/Form pattern | Medium | Normalize controls and alerts |
| StoreSettings | Legacy wrappers/classes still likely active | Form page pattern | High | Major blocker due to old component usage |
| ActivityLogs | Migrated but still contains custom row/detail patches | List + Detail modal pattern | Medium | Normalize modal/detail presentation components |
| AdminUsers | Migrated module UI | List/Form pattern | Medium | Verify status/actions/table tokens |

---

## 9) Safety Checklist

Use this checklist during execution:
- Build after each phase
- Accept only expected file changes per phase
- Confirm no backend changes
- Confirm no API payload or contract changes
- Test both light mode and dark mode
- Test primary CRUD actions after each page migration

Recommended per-phase validation:
- Run frontend build
- Smoke-test navigation and shell
- Validate one high-priority list page + one form page in both themes

---

## Success Criteria

Migration is successful when:
- New UI work is built from shared components, not ad hoc page classes
- Light/dark mode behavior is consistent across all major pages
- Legacy wrappers and conflicting CSS are no longer required
- Future page development is faster and more predictable
