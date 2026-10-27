# Proposal

Ítem #5 de `docs/04-backlog/BACKLOG.md`.

## Why

Con la API lista, el front tiene que ingresar de verdad, cargar los datos y manejar sesión vencida y base caída como pide el PRD (CB-01, CB-03).

## What Changes

- El login usa `POST ${CFG.API}/hfc-login`; los datos, `fetchJSON` de `11-remote.js`.
- El envoltorio de `fetch` de `01-core.js` vuelve al login ante `401/403` de un pedido a `CFG.API` con el token vigente.
- Mensajes de error actualizados (sin referencias a n8n).
- Tests E2E: `tests/login.spec.js`, `tests/tablero.spec.js`.

## Capabilities

### New Capabilities
- `tablero`

### Modified Capabilities

## Impact

- `web/js/01-core.js`, `web/js/11-remote.js`, `tests/`, `playwright.config.js`.
- Criterios de éxito 1–5 del PRD.
