# Proposal

Ítem #4 de `docs/04-backlog/BACKLOG.md`.

## Why

El front necesita `hfc-diario` y `hfc-supervisores` con el contrato de producción (ADR-0003). La revisión adversarial (R-01) mostró que el Cliente Claro recibiría el detalle por asesor si la API no filtra por perfil.

## What Changes

- `api/db.py`: consultas fijas, conversión de tipos, caché de 60 s, tiempos límite de 10 s (conexión) y 30 s (consulta).
- `POST /api/hfc-diario`, `POST /api/hfc-supervisores`, `GET /api/health`.
- `PERMISOS` por perfil y `_agregar_por_supervisor` para CLIENTE CLARO.
- `SERVIR_WEB=1` monta `web/` en `/` para desarrollo y E2E; `/docs` y `/openapi.json` apagados.

## Capabilities

### New Capabilities
- `api-datos`

### Modified Capabilities

## Impact

- `api/db.py`, `api/main.py`.
- ADR-0003, 0006, 0009; revisión R-01, R-09.
