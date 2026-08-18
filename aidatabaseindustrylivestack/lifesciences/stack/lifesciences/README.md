# Life Sciences Operations LiveStack

Life Sciences Operations is an Oracle AI Database LiveStack for governed clinical-supply, quality-signal, cold-chain, and regulatory-response investigation. It uses synthetic demonstration data in a four-service Podman Compose runtime.

## Operator journey

The application guides an operator through data readiness, quality-signal triage, relationship analysis, cold-chain coverage, clinical-supply requests, model-backed risk analysis, and governed data questions. The `Use Your Own Data` control provides a non-mutating validation preview before an authorized administrator can replace a dataset or restore the demonstration data.

## Governance boundary

Governed API routes require a signed same-origin demo session backed by an active Oracle `APP_USERS` identity. A displayed user header is a consistency check only. Dataset replacement and Restore require an active Oracle administrator plus an explicit destructive confirmation; an optional server-side dataset-admin token remains available for automation.

## Run locally

```bash
podman compose up -d --build
```

When all services are healthy, open `http://localhost:8505/` and check `http://localhost:8505/api/health`.

This Wave 3 working copy is under parity development. Oracle Vector, Spatial, SQL Property Graph, JSON Relational Duality, OML, Unified Audit, and In-Memory claims are accepted only when the current dataset generation has recorded native execution evidence.
