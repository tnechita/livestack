# Transportation LiveStack

Transportation LiveStack is a story-led Oracle AI Database 26ai demo for governed fleet, freight, terminal, and disruption operations. Its nine connected scenes preserve the proven Manufacturing and High Tech interaction model while using transportation-specific data and terminology:

1. Data Foundation
2. Transportation Operations Command Center
3. Shipper Signal Intelligence
4. Transport Network Graph
5. Network Fulfillment Map
6. Transportation Orders
7. Transportation OML Analytics
8. Ask Transportation Data
9. Transportation AI Agent Console

The Oracle Internals panel on each scene is collapsed by default. Open it when you want the native implementation evidence behind the story.

## Quick start

Copy `.env.example` to `.env` only when you need to create a new local configuration. The distributed archive includes both files so a prepared demo remains reproducible.

```bash
podman compose up -d --build
```

Do not pass `-p` or another project-name override. The Compose project is canonically named from the root directory, `transportation`, so its containers, network, and volumes use the expected `transportation-*` identity.

When the stack is ready, open `http://localhost:8505`. The health endpoint is `http://localhost:8505/api/health`.

## Governed demo access

This is an isolated local demo and a non-production demonstration environment; its session boundary is not production authentication. Browser actor switching is established through a signed, same-origin, HttpOnly demo session. `X-Demo-User` is only a display-consistency header and is never trusted as authentication on its own.

Automation may use a separately provisioned server-side bearer-token map. Never place bearer tokens, database credentials, PAR URLs, or other secrets in browser code, source control, documentation, or diagnostic output.

Oracle Virtual Private Database policies fail closed when actor context is absent. Actor and role resolution, destructive dataset administration, and native feature readiness checks are enforced by the backend.

## Restore Demo Data

Use the administrator entry in the application:

1. Select the bundled dataset or upload a supported ZIP.
2. Review the dataset preview and validation result.
3. Enter the explicit destructive confirmation.
4. Start Restore Demo Data and wait for the durable job to complete.

Restore runs as an atomic generation lifecycle. Readers stay on the active generation until validation succeeds; failed or interrupted restores reconcile to the previously accepted snapshot.

## Native Oracle feature evidence

- Vector Search uses a fixed `VECTOR(384, FLOAT32)` contract and deployment-local ONNX model.
- Spatial readiness verifies the exact domain index and same-session execution plan.
- SQL Property Graph readiness verifies `TRANSPORT_SIGNAL_NETWORK`.
- JSON Relational Duality uses `ORDERS_DV` and `PRODUCTS_INVENTORY_DV`.
- Oracle Machine Learning owns and persists four DBMS Data Mining models during deployment; read APIs only score them.
- Unified Audit uses the exact enabled policy `SC_ORDER_AUDIT`.
- In-Memory reports its declared and observed state without fabricated population or compression claims.

## Packaging

The clean deliverable is `livestack-transportation.zip` with one top-level `transportation/` directory. It includes `.env` and `.env.example` and excludes generated dependencies, build outputs, caches, and validation-only artifacts. A package replay must also use `podman compose` without `-p`, preserving canonical `transportation-*` resources.
