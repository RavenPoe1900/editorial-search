# Product Editorial & Search Platform

A two-API system implementing an editorial workflow for product data (GS1-inspired), with:
- API A (Core / Editorial): GraphQL over Express + MongoDB (source of truth, workflow, audit).
- API B (Search): REST over Express + Elasticsearch (optimized read/search model).
- Asynchronous synchronization via RabbitMQ (topic exchange) using product lifecycle events.
- Role-based editorial flow (Provider vs Editor) with approval gating.
- AI-assisted development (see IA-report.md for methodology, tooling and reflections).

---

## Table of Contents
1. Vision & Goals  
2. High-Level Features  
3. Domain & Editorial Workflow  
4. Architecture Overview  
5. Component Responsibilities  
6. Data & Modeling  
7. Event-Driven Synchronization  
8. Search Index Design (API B)  
9. API Surface (Summary)  
10. Security & Authorization  
11. Audit / Change History Strategy  
12. Resilience & Reliability Patterns  
13. Error Handling & Conventions  
14. Logging & Observability  
15. Folder Structure  
16. Environment Variables  
17. Local Development (Manual & Containers)  
18. Elasticsearch Index Bootstrap & Reindexing  
19. Scripts  
20. Testing Strategy (Recommended)  
21. AI Tooling Usage (Summary)  
22. Extensibility & Future Enhancements  
23. FAQ  
24. License (Placeholder)

---

## 1. Vision & Goals

Provide a robust editorial platform where product data is authored, reviewed, approved, and published while exposing a performant, decoupled search experience. The system embraces:
- Separation of concerns (CQRS slice: Write/Editorial vs Read/Search).
- Event-driven propagation to decouple indexing lifecycle.
- Observability and operational readiness.
- Strong typing (TypeScript) for the search service; flexibility (JavaScript) possible for the editorial API to meet the requirement that at least one API is non-TypeScript.
- Extensibility toward richer data, faceting, analytics, or marketplace integration.

---

## 2. High-Level Features

| Feature | API A (GraphQL) | API B (REST) |
|---------|-----------------|--------------|
| Product CRUD | Yes (with roles) | Read-only (search) |
| Editorial workflow (PENDING_REVIEW → PUBLISHED) | Yes | Consumes only PUBLISHED | 
| Audit log / change history | Yes | Not directly (projection only) |
| Full-text search (name, brand, manufacturer, description) | N/A | Yes |
| Product index (Elasticsearch) | Emits events | Upserts/deletes |
| Role-based authorization | Provider vs Editor | Token required / optional policy |
| Event emission | product.created / updated / approved / deleted (+ optional snapshot) | Consumes & indexes |
| AI usage documentation | Yes (IA-report.md) | Yes (system-wide) |

---

## 3. Domain & Editorial Workflow

### Roles
- Provider: Can create products (initial state: PENDING_REVIEW). Can propose updates subject to review.
- Editor: Can create products directly as PUBLISHED. Can approve provider-submitted products. Can update & publish.

### Product Lifecycle
States:
1. PENDING_REVIEW (not searchable)  
2. PUBLISHED (searchable)  
3. (Optional future) RETIRED / ARCHIVED

Transitions:
- Provider create → PENDING_REVIEW
- Editor create → PUBLISHED
- Editor approves → PENDING_REVIEW → PUBLISHED
- Update (Provider) → Could revert to PENDING_REVIEW (policy-based) or remain pending (variant).
- Deletion → Emits product.deleted (removes from ES index)

### GS1-Inspired Fields (Minimum Implemented in Search Projection)
- gtin (Global Trade Item Number)
- name
- brand
- manufacturer (brand owner / producer)
- netWeight { value, unit } (e.g., GRM, KGM)
- description
- status
- updatedAt

---

## 4. Architecture Overview

Pattern influences:
- Modular layering (domain / application / infrastructure).
- CQRS separation: API A (command + canonical persistence) vs API B (query + search index).
- Event-driven propagation (RabbitMQ topic exchange).
- Projection & denormalization for search performance.
- Optional event snapshot pattern to reduce cross-service fetches.

```
+------------------+        product.* events        +---------------------+
|  API A (GraphQL) | ------------------------------> |  RabbitMQ Exchange  |
|  - MongoDB       |                                 +----------+----------+
|  - Editorial     |                                            |
|  - Audit         |                                            v
+------------------+                                 +---------------------+
                                                     | API B (Search REST) |
                                                     | - Consumer          |
                                                     | - Elasticsearch     |
                                                     +---------------------+
```

---

## 5. Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| Core Product Aggregate (API A) | Authoritative state, validation, workflow enforcement |
| Audit Log | Capture old/new deltas for significant changes |
| Event Publisher | Emits lifecycle messages (topic: product.*) |
| Event Consumer (API B) | Subscribes and calls indexer (snapshot or fetch) |
| Indexer | Upsert / delete docs in ES; transform or flatten fields as needed |
| Search Service | Compose ES queries (boosts, filters, pagination guard) |
| Controller / Router | Thin HTTP layer: validation + service invocation |
| Health/Readiness Probes | Operational introspection |
| Config Layer | Centralizes environment variables / runtime config |

---

## 6. Data & Modeling

### MongoDB (API A - Conceptual)
(Representative example; actual implementation may differ.)

```js
{
  _id: ObjectId,
  gtin: String (unique),
  name: String,
  brand: String,
  manufacturer: String,
  netWeight: { value: Number, unit: String },
  description: String,
  status: "PENDING_REVIEW" | "PUBLISHED",
  createdBy: UserRef,
  updatedAt: Date,
  history: [ ChangeLogRef ] // or separate collection with productId index
}
```

### Audit Log Approach
Option A (Embedded): history embedded with snapshots of changed fields.  
Option B (Separate Collection): product_changes { productId, changedBy, timestamp, diff, previous, next } (recommended for scaling).  

### Elasticsearch (Projection)
Mapping created via `scripts/create-products-index.ts`:
- name / brand / manufacturer / description: text (folded analyzer: lowercase + ascii folding)
- gtin / status / netWeight.unit: keyword
- netWeight.value: float
- updatedAt: date

---

## 7. Event-Driven Synchronization

### Routing Keys
- product.created
- product.updated
- product.approved
- product.deleted

### Payload Variants
1. Minimal: `{ "productId": "<id>" }`
2. Enriched (snapshot):  
```json
{
  "productId": "<id>",
  "snapshot": {
    "gtin": "...",
    "name": "...",
    "brand": "...",
    "manufacturer": "...",
    "netWeight": {"value": 500, "unit": "GRM"},
    "description": "...",
    "status": "PUBLISHED",
    "updatedAt": "2025-01-01T10:00:00Z"
  },
  "occurredAt": "2025-01-01T10:00:02Z",
  "version": 4
}
```

### Indexing Strategies
| Strategy | Pros | Cons |
|----------|------|------|
| Fetch on Event (current default) | Thin events, canonical fetch | Coupling, latency, extra failure point |
| Snapshot Events | Lower latency, no external fetch | Larger messages, potential version drift |
| Hybrid (Implemented) | Flexible migration path | Complexity |

---

## 8. Search Index Design (API B)

### Query Construction
- `multi_match` across: name^3, brand^2, manufacturer^2, description (fuzziness: AUTO).
- Editorial filter: status == PUBLISHED.
- Pagination: page (0-based), limit (1–100).
- Deep pagination guard: `page * limit` must not exceed 10,000 (classic `from+size` limitation).
- Potential enhancements: search_after, synonyms, semantic vector scoring (future).

### Relevance Notes
- Boosting heavily favors name.
- brand / manufacturer intermediate weight.
- description contributes but with base weight.

---

## 9. API Surface (Summary)

### API B (Search)
`GET /api/search?q=<term>&page=0&limit=10`  
Response:
```json
{
  "data": [
    {
      "id": "650af...",
      "score": 12.34,
      "gtin": "0123456789",
      "name": "...",
      "brand": "...",
      "manufacturer": "...",
      "netWeight": { "value": 500, "unit": "GRM" },
      "description": "...",
      "status": "PUBLISHED",
      "updatedAt": "2025-01-01T10:00:00Z"
    }
  ],
  "pagination": { "total": 42, "page": 0, "limit": 10, "totalPages": 5 }
}
```

### Health / Readiness
- `GET /api/health` → `{ "status": "ok" }`
- `GET /api/readiness` → `{ "ready": true | false }`

### API A (Illustrative - GraphQL)
Example minimal query:
```graphql
query ProductWithHistory($id: ID!) {
  product(id: $id) {
    id
    gtin
    name
    brand
    manufacturer
    netWeight { value unit }
    description
    status
    updatedAt
    history {
      changedAt
      changedBy { id username }
      diff {
        field
        oldValue
        newValue
      }
    }
  }
}
```

---

## 10. Security & Authorization

| Aspect | Approach |
|--------|----------|
| Authentication | JWT bearer in both APIs (Search may optionally relax) |
| Roles | provider, editor claims in token payload |
| Editorial Ops | Only editor may approve / publish |
| Search | Requires auth in current setup (configurable) |
| Service-to-Service (Future) | Add internal token or mTLS for GraphQL fetch calls |

---

## 11. Audit / Change History Strategy

Captured at API A only. Each meaningful mutation:
- Extract pre/post state for changed fields.
- Persist diff with metadata (user, timestamp).
- Potential future replication to analytics pipeline.

Not duplicated in search index to keep ES lean.

---

## 12. Resilience & Reliability Patterns

| Concern | Current | Future Enhancement |
|---------|---------|--------------------|
| Elasticsearch availability | Startup retry (ping) | Circuit breaker / fallback cache |
| RabbitMQ connectivity | Reconnect on close + startup retry | DLQ + exponential backoff |
| Event processing errors | nack (non requeue) | Distinguish transient vs permanent, DLX |
| Index write consistency | refresh: wait_for ensures visibility | Batched flush / auto refresh tuning |
| Pagination load | Hard result window guard | search_after API |
| Snapshot vs Fetch | Dual mode | Full migration to snapshots |
| Graceful shutdown | Closes server + consumer | In-flight message drain metrics |

---

## 13. Error Handling & Conventions

| Layer | Behavior |
|-------|----------|
| Validation (Joi) | 400 with descriptive message |
| Search Service | Returns ServiceResult status 400/500 with error string |
| Controller | Normalizes service errors to JSON `{ error: { message } }` |
| Consumer | Throws → triggers nack (current) |
| Indexer | Logs and rethrows to propagate failure |

---

## 14. Logging & Observability

Current logging: colorized contextual strings (e.g., SEARCH_SERVICE, INDEXER, EVENT_HANDLER).  
Recommended upgrades:
- Structured JSON logs (timestamp, level, context).
- Metrics (Prometheus exporter) for: events processed, indexing latency, error counts.
- Tracing (OpenTelemetry) across fetch + index pipeline.

---

## 15. Folder Structure (Key Extract)

```
src/
  app.ts
  _shared/
    config/
    integrations/
      elasticsearch/
        es.client.ts
        es.product.indexer.ts
    middlewares/
    root/
      setup.root.ts
      health.routes.ts
    service/
    utils/
  modules/
    search/
      domain/
        search.types.ts
        search.dto.ts
      application/
        search.service.ts
      infrastructure/
        searches.controller.ts
        searches.router.ts
    event-consumer/
      domain/
        event.types.ts
      application/
        event.handler.ts
        event-consumer.service.ts
scripts/
  create-products-index.ts
IA-report.md
```

---

## 16. Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| PORT | API B HTTP port | 3001 |
| CORS_ORIGIN | Allowed origin(s) | http://localhost:3000 |
| ELASTICSEARCH_URL | ES node URL | http://localhost:9200 |
| ELASTICSEARCH_PRODUCT_INDEX | Target index name | products |
| RABBITMQ_URL | AMQP connection string | amqp://guest:guest@localhost:5672 |
| RABBITMQ_EXCHANGE | Topic exchange name | product.events |
| RABBITMQ_SEARCH_QUEUE | Queue for search service | product.search.q |
| STARTUP_RETRIES | Retry attempts for ES / consumer | 5 |
| STARTUP_RETRY_DELAY_MS | Delay between retries (ms) | 2000 |
| API_A_URL | GraphQL endpoint for API A | http://localhost:3000/graphql |
| JWT_SECRET | Token verification | (secret) |

---

## 17. Local Development

### Prerequisites
- Node 18+ / Yarn
- Docker (for Mongo, Elastic, Rabbit) recommended

### Quick Start (Search API only)
```bash
# Install deps
yarn install

# Create ES index (once)
npx ts-node scripts/create-products-index.ts

# Run in dev (ts-node / nodemon)
yarn dev
```

### Docker Compose (Suggested Layout)
(Optional—supply your own docker-compose.yml)
- elasticsearch:9200 (single-node)
- rabbitmq:5672 (management UI on 15672)
- mongo:27017 (for API A)

### Rebuild & Clean
```bash
rm -rf dist
yarn build
yarn start
```

---

## 18. Elasticsearch Index Bootstrap & Reindexing

Initial creation:
```bash
npx ts-node scripts/create-products-index.ts
```

If schema changes (e.g., added fields):
1. Pause consumers.
2. DELETE existing index (if safe).
3. Recreate with script.
4. Replay events OR implement a one-off reindex script that pages through API A products and publishes snapshot events.

---

## 19. Scripts

| Script | Purpose |
|--------|---------|
| scripts/create-products-index.ts | One-off index creation with mappings / analyzers |
| (Future) reindex.ts | Rebuild index from canonical DB |
| (Future) seed-products.ts | Seed sample products & emit events |

---

## 20. Testing Strategy (Recommended Roadmap)

| Test Type | Scope |
|-----------|-------|
| Unit | search.service (query assembly, edge cases) |
| Unit | event.handler (routing key dispatch logic) |
| Integration | Indexer writes + search read cycle (requires ephemeral ES) |
| Contract | Event schema validation (snapshot vs minimal) |
| E2E | Provider create → Editor approve → Search visibility |
| Performance | Bulk events → indexing latency | 

Tooling suggestions: Jest + supertest + testcontainers (for ES/RabbitMQ ephemeral).

---

## 21. AI Tooling Usage (Summary)

Full details in IA-report.md, but highlights:
- AI-assisted refactors (consistent naming, doc generation).
- Prompt-driven generation of architectural commentary and code comments.
- Iterative error resolution (type guard corrections, file renaming).
- Design suggestions (dual snapshot/fetch indexing, deep pagination guard).
- Limitations: Context window constraints; manual validation required for domain correctness.

---

## 22. Extensibility & Future Enhancements

| Enhancement | Benefit |
|-------------|---------|
| Snapshot-first events | Reduce latency & dependency risk |
| DLQ + Retry policy | Prevent data loss on transient failures |
| search_after + sort | Scalable deep navigation |
| Faceted search (brand/manufacturer) | Enhanced UX |
| Semantic / vector search | Relevance uplift |
| Structured JSON logging + OTEL traces | Production observability |
| Circuit breaker for API A fetch | Resilience under partial outage |
| Multi-lingual analyzers / synonyms | Internationalization |
| Role-based field-level visibility | Advanced governance |
| Versioning & optimistic concurrency | Conflict safety |
| Signed internal service tokens | Zero-trust deployments |

---

## 23. FAQ

**Q: Why not index all fields from Mongo?**  
A: Projection principle—keep only necessary searchable/display fields to reduce index bloat.

**Q: Why the 10k deep pagination guard?**  
A: Performance limitation of from+size in ES; switch to search_after for scalable deep scrolls.

**Q: Can search be public?**  
Yes—remove the authentication middleware from the search route chain if business rules allow.

**Q: How to migrate to snapshot events?**  
Producers begin adding `snapshot` property; consumer auto-detects and skips fetch.

**Q: Does audit history appear in search results?**  
No. Search index is purpose-built for fast retrieval—history remains in API A.

---

## 24. License

Specify license (e.g., MIT) here.

---

## Contact / Maintenance

Owned by: (Add your team/contact)  
For operational incidents: Provide runbook linking future.

---

Happy indexing! 🚀