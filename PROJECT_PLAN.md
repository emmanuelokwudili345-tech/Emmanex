# EMMANEX — PROJECT PLAN & DEVELOPMENT BLUEPRINT

**Project:** Emmanex  
**Type:** Full-stack single-vendor e-commerce platform  
**Frontend:** React, TypeScript, Vite  
**Backend:** Node.js, Express, TypeScript  
**Database:** PostgreSQL via Neon  
**ORM:** Drizzle ORM  
**Status:** Foundation and initial database schema established

---

## 1. PROJECT VISION

Emmanex is a production-oriented e-commerce platform that enables a business to sell its own products online.

The platform must provide customers with a smooth shopping experience while giving administrators the tools to manage products, categories, inventory, orders, and the overall store.

The application will initially target Nigerian customers, with architecture that can support international customers in the future.

### Primary objectives

- Build a reliable and maintainable full-stack application.
- Provide a responsive, professional customer-facing interface.
- Implement secure authentication and role-based authorization.
- Maintain accurate product prices, inventory, and order records.
- Support a complete shopping and checkout workflow.
- Integrate a reliable payment provider.
- Keep hosting and service costs reasonable during the initial launch.
- Establish a clean architecture that can grow without unnecessary complexity.

### Product scope

Emmanex is a **single-vendor store**, not a marketplace. Only authorized administrators manage the store's inventory.

Do not introduce vendor registration, vendor dashboards, commissions, or marketplace-specific functionality unless explicitly requested.

---

## 2. BUSINESS REQUIREMENTS

### Customers

Customers must be able to:

- Browse products without registering.
- Browse categories and view individual product details.
- Search and filter available products.
- Add products to a shopping cart and change quantities.
- Register, sign in, and sign out.
- Provide delivery and contact information at checkout.
- Complete checkout through a supported payment method.
- View their orders and order statuses.
- Access their own account and order information.
- Receive clear feedback when actions succeed or fail.

### Administrators

Authorized administrators must be able to:

- Access protected administrative routes.
- Create, edit, and deactivate products.
- Manage product categories.
- Upload or update product images.
- Update product prices and stock quantities.
- View and manage customer orders.
- Update order statuses through valid transitions.
- Review relevant inventory and order information.

Administrative access must never depend solely on frontend route protection. The backend must verify authorization for every protected operation.

### Store rules

- Only active products may be purchased.
- Product prices must be obtained from trusted server-side data.
- Customers cannot purchase more units than are available.
- The server calculates order subtotals, shipping fees, and totals.
- Successful payment must be verified by the backend.
- Orders preserve the product names and prices recorded at purchase time.
- Customers can access only their own orders.
- Order history must remain consistent if a product is later deactivated or deleted.
- Inventory updates must prevent overselling during concurrent purchases.

---

## 3. TECHNOLOGY STACK

### Frontend

- React
- TypeScript
- Vite
- React Router for client-side navigation
- A consistent styling approach selected after reviewing the existing client setup
- A suitable HTTP client or the native Fetch API

### Backend

- Node.js
- Express
- TypeScript
- Drizzle ORM
- Neon serverless PostgreSQL driver
- Environment variable configuration through dotenv

### Database and infrastructure

- PostgreSQL hosted on Neon
- Drizzle Kit for schema management and migrations
- Cloudinary for product image hosting, once configured
- A suitable payment provider selected before payment implementation
- A suitable deployment platform selected before production release

### Dependency policy

- Inspect existing dependencies before installing new packages.
- Prefer stable, compatible versions.
- Do not upgrade major dependencies without a clear reason.
- Do not introduce a second ORM or database access library.
- Avoid unnecessary libraries when native platform features are sufficient.
- Verify official documentation when working with unfamiliar APIs or version-specific tooling.

**Important:** The project currently uses a recent Prisma-independent Drizzle setup. Do not introduce Prisma into the project.

---

## 4. EXISTING PROJECT FOUNDATION

The following work has already been completed:

- React and TypeScript frontend initialized.
- Express and TypeScript backend initialized.
- PostgreSQL database created on Neon.
- Backend database connection configured.
- Drizzle configuration established.
- Initial database tables generated and created.
- Orders and order items added to the schema.
- Initial order-status enum defined.
- Database constraints added to the Drizzle schema for product prices, stock, order-item quantities, and order-item monetary values.
- TypeScript checks have passed after the recent schema changes.
- Database migrations have been generated and applied during development.

### Existing database tables

| Table | Responsibility |
|---|---|
| `users` | Customer and administrator accounts |
| `categories` | Product categories |
| `products` | Product information, pricing, stock, and status |
| `orders` | Customer orders, delivery details, and totals |
| `order_items` | Product snapshots and quantities for each order |

### Immediate database task

The latest migration adding five check constraints was confirmed in Neon.

Before continuing with database-dependent features, verify the migration files and schema are consistent. Do not rerun successful migrations unnecessarily.

---

## 5. DATABASE DESIGN REQUIREMENTS

### Users

The `users` table contains:

- Unique email address
- First and last names
- Password hash
- Account role
- Account active status
- Creation and update timestamps

Requirements:

- Never store plaintext passwords.
- Enforce allowed roles through appropriate database and application validation.
- Normalize email addresses consistently.
- Never expose password hashes in API responses.
- Do not allow public registration to create administrator accounts.
- Protect administrator operations on the server.

### Categories

Categories contain a name, unique slug, optional description, and creation timestamp.

Requirements:

- Category names and slugs must remain unique.
- Slugs must be generated and validated consistently.
- Products may reference a category.
- Category deletion must not accidentally destroy product or order history.

### Products

Products contain a name, unique slug, description, price, stock, optional image URL, category relationship, active status, and timestamps.

Requirements:

- Prices cannot be negative.
- Stock cannot be negative.
- Validate product input on the backend.
- Prevent purchasing inactive products.
- Use consistent currency handling.
- Avoid floating-point arithmetic for monetary calculations.
- Use database constraints and transactional operations where appropriate.

### Orders

Orders contain a customer relationship, status, subtotal, shipping fee, total, delivery details, and timestamps.

Requirements:

- Preserve the delivery information supplied for each order.
- Validate order-status transitions.
- Calculate all monetary totals on the server.
- Ensure order totals agree with their item records and shipping charges.
- Prevent unauthorized order access.
- Preserve order history.

### Order items

Order items contain an order relationship, optional product relationship, product-name snapshot, unit-price snapshot, quantity, and line total.

Requirements:

- Quantity must be greater than zero.
- Unit price and line total must not be negative.
- Preserve historical product information.
- Validate monetary totals on the server.
- Ensure each order item belongs to a valid order.

### Future database work

Review and implement additional tables or fields only when justified by the requirements, including:

- Payment records and payment references
- Saved customer addresses
- Product reviews, if required
- Shipping and delivery information, if separate tracking becomes necessary
- Notifications, if required by the final customer experience

Do not create speculative tables before their purpose is clear.

---

## 6. BACKEND ARCHITECTURE

Use a clear separation of responsibilities.

Proposed structure:

```text
server/
├── src/
│   ├── config/
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── middleware/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── categories/
│   │   ├── products/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── payments/
│   │   └── admin/
│   ├── app.ts
│   └── server.ts
├── drizzle/
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

This is a target structure, not permission to reorganize everything immediately. Inspect the existing files before creating, moving, or deleting anything.

### Module responsibilities

- **Routes:** Define HTTP endpoints and connect requests to controllers.
- **Controllers:** Handle HTTP input, status codes, and response formatting.
- **Services:** Implement business rules and coordinate operations.
- **Database layer:** Access PostgreSQL through Drizzle.
- **Middleware:** Handle authentication, authorization, validation, and error processing.
- **Configuration:** Load and validate environment variables.

Keep the architecture proportionate to the application. Avoid unnecessary abstractions, duplicate logic, and oversized files.

---

## 7. FRONTEND ARCHITECTURE

The frontend must remain separate from backend business logic.

Expected feature areas:

- Public storefront
- Product listing and details
- Search and category browsing
- Shopping cart
- Authentication
- Checkout
- Customer account and order history
- Administrative dashboard

Requirements:

- Use TypeScript consistently.
- Reuse components where it improves maintainability.
- Keep API communication in a clear, reusable layer.
- Represent loading, empty, success, and error states.
- Protect user experience on mobile and desktop.
- Do not trust client-side validation as a security boundary.
- Avoid duplicating business rules that belong on the server.

Inspect the existing `client/` structure before choosing exact filenames and directories.

---

## 8. API DESIGN

Use a consistent REST API under `/api`.

Proposed endpoints:

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Products

- `GET /api/products`
- `GET /api/products/:slug`
- `GET /api/categories`
- `GET /api/categories/:slug/products`

### Cart and orders

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`

The cart may initially be managed on the client, but the backend must revalidate every product, quantity, and price at checkout.

### Payments

- `POST /api/payments/initialize`
- `GET /api/payments/verify/:reference`
- A payment-provider webhook endpoint where required

Payment endpoints must follow the selected provider's official integration requirements.

### Administration

- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`
- `DELETE /api/admin/products/:id`
- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:id`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status`

These endpoints are proposed contracts, not implemented functionality. Review naming, authorization, validation, and response requirements before implementation.

### API conventions

- Use appropriate HTTP status codes.
- Validate request parameters, bodies, and query strings.
- Return predictable JSON response structures.
- Avoid leaking internal errors or sensitive data.
- Implement centralized error handling.
- Add pagination to product and order listings where appropriate.
- Never expose private configuration or credentials.

---

## 9. SECURITY REQUIREMENTS

Security is mandatory throughout development.

- Hash passwords using a suitable password-hashing library.
- Use a secure authentication strategy appropriate for the deployment architecture.
- Protect authentication credentials and sessions.
- Enforce authorization on every protected backend operation.
- Validate and sanitize untrusted input.
- Restrict CORS to approved frontend origins in production.
- Add sensible rate limits to authentication and other abuse-prone endpoints.
- Keep secrets in environment variables.
- Never commit `.env` files.
- Verify payment status server-side.
- Verify payment webhook signatures.
- Prevent duplicate payment processing through idempotent operations.
- Use database transactions for operations that must succeed or fail together.
- Prevent overselling through safe inventory updates.
- Avoid returning stack traces or sensitive database details to clients.

Security-sensitive implementation choices must be explained before being introduced.

---

## 10. DEVELOPMENT PHASES

Follow the phases in order unless a dependency requires a justified change.

### Phase 1 — Project foundation

- [x] Initialize client and server
- [x] Configure TypeScript
- [x] Connect Neon PostgreSQL
- [x] Define initial database schema
- [x] Create initial migrations
- [ ] Review environment configuration
- [ ] Establish project documentation and coding rules
- [ ] Verify the current development commands

### Phase 2 — Backend infrastructure

- [ ] Separate Express application setup from server startup
- [ ] Configure environment validation
- [ ] Implement centralized error handling
- [ ] Add request validation
- [ ] Add a consistent API response convention
- [ ] Verify database access through Drizzle
- [ ] Add a health-check endpoint
- [ ] Add initial backend tests

### Phase 3 — Authentication and authorization

- [ ] Implement registration
- [ ] Implement login and logout
- [ ] Implement secure session or token handling
- [ ] Implement authenticated-user middleware
- [ ] Implement administrator authorization
- [ ] Add account validation and error handling
- [ ] Test unauthorized and forbidden requests

### Phase 4 — Product and category APIs

- [ ] List active products
- [ ] Retrieve product details
- [ ] Search and filter products
- [ ] Add pagination
- [ ] List categories
- [ ] Implement administrator product operations
- [ ] Implement administrator category operations
- [ ] Validate prices, slugs, and stock

### Phase 5 — Storefront

- [ ] Establish the storefront layout
- [ ] Build category navigation
- [ ] Build product listing and detail pages
- [ ] Connect the frontend to the API
- [ ] Implement loading and error states
- [ ] Ensure responsive layouts

### Phase 6 — Cart and checkout

- [ ] Implement cart operations
- [ ] Validate product availability
- [ ] Validate quantities and stock
- [ ] Calculate totals on the server
- [ ] Capture delivery details
- [ ] Create orders and order items transactionally
- [ ] Reduce inventory safely
- [ ] Prevent duplicate order creation

### Phase 7 — Payments

- [ ] Select a payment provider
- [ ] Configure provider credentials securely
- [ ] Initialize payments on the backend
- [ ] Verify payments server-side
- [ ] Handle signed webhooks
- [ ] Handle failed and pending payments
- [ ] Implement idempotency
- [ ] Test the payment lifecycle in the provider's test environment

### Phase 8 — Customer and admin dashboards

- [ ] Build customer account pages
- [ ] Build order history and details
- [ ] Build administrative product management
- [ ] Build inventory management
- [ ] Build order management
- [ ] Enforce role permissions throughout

### Phase 9 — Quality assurance

- [ ] Test core business rules
- [ ] Test API endpoints
- [ ] Test authentication and authorization
- [ ] Test order totals and inventory behavior
- [ ] Test payment verification
- [ ] Test responsive layouts
- [ ] Check accessibility and keyboard navigation
- [ ] Check production build and deployment configuration

### Phase 10 — Production release

- [ ] Configure production environment variables
- [ ] Configure production database access
- [ ] Apply reviewed database migrations
- [ ] Configure frontend and backend deployments
- [ ] Configure CORS and security settings
- [ ] Verify production health checks
- [ ] Perform a complete test purchase
- [ ] Document deployment and recovery procedures

---

## 11. CODING STANDARDS

All code produced for Emmanex must follow these rules:

- Use TypeScript instead of JavaScript for application code where practical.
- Use two spaces for indentation.
- Prefer small, focused functions.
- Prefer clear names over clever abstractions.
- Keep modules focused on one responsibility.
- Reuse existing project conventions.
- Avoid unnecessary dependencies.
- Avoid `any` unless there is a documented, justified reason.
- Never hardcode secrets.
- Do not silently swallow errors.
- Avoid excessive comments that merely repeat the code.
- Keep formatting consistent with the existing formatter configuration.
- Do not rewrite unrelated files while implementing a feature.
- Do not change existing UI or styling unless the task requires it.
- Use explicit types for important API and business data.
- Keep database schema, migrations, and application validation consistent.

---

## 12. CODING AGENT WORKFLOW

The coding agent must follow this workflow for every task.

### Before making changes

1. Read this project plan.
2. Inspect the relevant existing files and package scripts.
3. Understand the current architecture and dependencies.
4. Identify the exact files that need modification.
5. Explain the proposed change and any important trade-offs.
6. Identify risks, dependencies, and required environment variables.

### While implementing

1. Make small, focused changes.
2. Preserve unrelated code and existing UI.
3. Follow existing naming and formatting conventions.
4. Consult official documentation for version-sensitive behavior.
5. Never invent commands or assume that an API exists.
6. Never replace configuration files without inspecting them first.
7. Never expose or request private credentials.
8. Never apply destructive database changes without explicit review and approval.

### After implementation

1. Run the relevant type-check command.
2. Run linting and tests when configured.
3. Run the build when appropriate.
4. Inspect the changed files and generated migrations.
5. Report exactly what changed.
6. Report the commands that passed or failed.
7. List any remaining issues and the next recommended task.

The agent must not claim a feature works merely because the code was generated. Verify it with appropriate checks.

---

## 13. DEFINITION OF DONE

A feature is complete only when:

- The requirements are understood and implemented.
- Relevant input validation is present.
- Security and authorization requirements are satisfied.
- Database changes are represented by appropriate migrations.
- TypeScript checks pass.
- Relevant tests pass or untested behavior is explicitly identified.
- Existing functionality has not been unintentionally broken.
- The implementation follows the project's conventions.
- Documentation is updated where necessary.
- The result and any remaining limitations are reported clearly.

A successful type-check alone does not prove that a feature works correctly.

---

## 14. CURRENT NEXT ACTIONS

Work through these actions in order:

1. Review the current repository structure and existing scripts.
2. Confirm the latest schema and migration files are consistent.
3. Review the server's environment-variable loading and development startup.
4. Establish a clean Express application and error-handling foundation without breaking the current health endpoint.
5. Add the first backend tests.
6. Implement authentication and authorization.
7. Build the product and category APIs.
8. Continue through the phases above.

Do not begin all phases at once. Complete and verify one focused task before moving to the next.

---

## 15. SOURCE OF TRUTH

This document defines the intended product scope, architecture, engineering standards, and development sequence.

If a requirement is ambiguous, ask for clarification rather than inventing a business rule. If a proposed implementation conflicts with this plan, explain the conflict and recommend a change before proceeding.

Update this document when important architectural decisions change. Keep completed tasks accurate and do not mark features complete until they have been verified.

**Primary goal:** Build Emmanex as a secure, maintainable, production-ready e-commerce application through deliberate, tested, incremental development.