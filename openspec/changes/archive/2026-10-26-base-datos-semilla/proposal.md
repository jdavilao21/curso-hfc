# Proposal

Ítem #2 de `docs/04-backlog/BACKLOG.md`.

## Why

La API necesita una base con la forma de la real y sin datos reales, aislada de producción aunque comparta servidor (ADR-0001), con datos estables para los tests (ADR-0007).

## What Changes

- `sql/01_crear_bd.sql`: base `BD_CURSO_HFC`, logins `curso_hfc_app` (SELECT + DENY escritura) y `curso_hfc_carga`.
- `sql/02_esquema.sql`: `TBL_KPI_FRANJA`, `TBL_NOMINA`, `TBL_GESTION_ASESOR`, `TBL_USUARIOS`, `VW_DIARIO`, `VW_SUPERVISORES`.
- `sql/semilla.py`: genera y carga ago–sep 2026 en una transacción.

## Capabilities

### New Capabilities
- `datos-demo`

### Modified Capabilities

## Impact

- Nuevo: `sql/`. Sin dependencias nuevas fuera de `pyodbc`.
- ADR-0001, 0002, 0007; revisión R-03, R-10, R-11.
