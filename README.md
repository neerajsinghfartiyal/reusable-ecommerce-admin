# Reusable eCommerce Admin

Admin dashboard for the **Reusable eCommerce** platform. This SPA manages catalog, sales, customers, store configuration, and content. It pairs with the separate [`reusable-ecommerce-backend`](../reusable-ecommerce-backend) API.

There is **no customer-facing storefront UI** in this repo. Cart, checkout, shipping, and payment flows are implemented on the backend and are intended for a future storefront or API clients (Postman, mobile app, etc.).

---

## Tech stack

| Layer | Technology |
|-------|------------|
| UI | React 19, React Router 7 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4, Radix UI primitives |
| HTTP | Axios |
| Icons | Lucide React |

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm**
- Backend API running locally (default `http://localhost:5000`)
- MongoDB populated and admin user seeded (see backend README)

---

## Install and run

```bash
# From this directory
npm install
cp .env.example .env   # or create .env manually (see below)
npm run dev
```

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (default `http://localhost:5173`) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

---

## Environment variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:5000
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend API origin (no trailing slash). All authenticated admin requests use this via `axiosClient`. |

**Notes**

- Login branding uses the **public** endpoint `GET /api/public/settings` (no auth) so the login page can show store name/logo before sign-in.
- After login, the sidebar refreshes store settings for branding and currency.

---

## Authentication

Default seeded admin (created by backend `npm run seed:admin`):

| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `admin123` |

JWT is stored in `localStorage` as `adminToken` and sent as `Authorization: Bearer <token>`.

---

## Admin feature overview

### Dashboard
- KPI cards: products, customers, orders, revenue, pipeline counts, open returns, low stock
- Recent orders, low-stock products, recent activity, quick actions
- Currency-aware revenue formatting

### Catalog
- **Products** — simple and variable products, variations, bulk status updates, media picker integration
- **Product Imports** — CSV/XLSX template download, upload preview, column mapping, validation, commit, import history, error CSV export
- **Categories, Brands, Unit Types, Attributes** — master catalog data used by products and import matching

### Sales
- **Orders** — list, filters, fulfillment/payment/status updates, tracking, shipping & payment method display on detail
- **Returns / Exchanges** — return requests, status workflow, replacement order create/link for exchanges
- **Customers** — list, create, inline edit, detail view with orders/returns; delete blocked when linked commerce records exist
- **Coupons** — percentage/fixed discounts with usage rules

### Store
- **Payment Methods** — admin CRUD; methods quoted at cart checkout when active
- **Shipping Methods** — admin CRUD; rates quoted at cart checkout when enabled
- **Store Settings** — branding, currency, contact, tax/shipping toggles, maintenance flag, logo via Media Library

### Content & system
- **Media Library** — upload, folders, product image management
- **CMS Pages** — static pages with slug routing (public API available)
- **Redirects** — URL redirect rules
- **Activity Logs** — audit trail of admin actions
- **Admin Users** — multi-admin management (super_admin role for create/delete)

---

## Currency, branding, and settings

| Concern | How it works |
|---------|----------------|
| **Branding** | `Store Settings` → `branding-config.js` applies store name, tagline, logos to sidebar/login |
| **Currency** | `Store Settings` currency fields → `lib/currency.js` + `useFormatCurrency` hook; refreshed on login and sidebar mount |
| **Settings API** | Authenticated: `GET/PUT /api/settings` |
| **Public settings** | `GET /api/public/settings` for login page branding only |

Price display across Dashboard, Orders, Products, Coupons, Shipping Methods, and Customer detail uses the shared currency layer.

---

## Project structure (high level)

```
src/
  api/              # Axios API modules per domain
  components/
    admin-shell/    # Layout, sidebar, topbar, branding config
    admin-ui/       # Reusable admin module components
    media-picker/   # Product/store image picker
    product-import/ # Import wizard, preview, history
  context/          # Auth, theme
  hooks/            # useFormatCurrency, etc.
  lib/              # currency, sales helpers, dashboard stats, store settings form
  pages/            # Route-level screens
  routes/           # AppRoutes.jsx
```

---

## Known limitations

- **No storefront UI** — demonstrate checkout via backend cart API (see backend README demo flow).
- **Variable product stock** — checkout and replacement orders decrement parent `product.quantity`; variation-level stock is not fully modeled in cart/replacement flows.
- **Maintenance mode** — configurable in Store Settings but not enforced on public/cart routes yet.
- **Dashboard analytics** — placeholder note; no external analytics integration.
- **Profile editing** — view-only message for password/profile changes.
- **Media backfill** — legacy product URL → media ID backfill is API-only (`/api/media/backfill/...`), no admin UI button.
- **Customer delete** — hard delete allowed only when customer has no linked orders or return requests; otherwise set status to `inactive`.
- **No automated frontend tests** in this repo.

---

## Suggested demo flow (admin UI)

Use this as a quick smoke test or portfolio walkthrough. Start the backend first, then this admin app.

1. **Login** — `admin@example.com` / `admin123`; confirm store branding on login page.
2. **Dashboard** — verify stats load, recent orders, and currency formatting.
3. **Store Settings** — set currency (e.g. `INR` / `₹`), store name, enable shipping/payment if needed.
4. **Shipping & Payment Methods** — create at least one active method of each.
5. **Catalog setup** — create a category, brand, and unit type (needed for product import matching).
6. **Media Library** — upload a product image.
7. **Create product** — add a simple published product with featured image from Media Library.
8. **Product Import** — download XLSX template, import a row (or use preview on a small file), commit, check history.
9. **Create customer** — Customers → Create Customer.
10. **Cart / checkout (API)** — follow the backend README cart demo to create an order (no UI in this repo).
11. **Order fulfillment** — open the new order in Orders; update fulfillment, tracking, payment status.
12. **Return / exchange** — create return from order detail or Returns module; for exchange: approve → create replacement order → mark exchanged.
13. **Customer delete guard** — try deleting a customer with orders; confirm blocked message and use `inactive` instead.

For the API portion of step 10, see **[Backend README — Suggested demo flow](../reusable-ecommerce-backend/README.md#suggested-demo-flow)**.

---

## Related repository

| Repo | Role |
|------|------|
| `reusable-ecommerce-backend` | Express + MongoDB REST API, cart/checkout, public endpoints |

Both repos are designed to run as sibling directories under the same parent folder.
