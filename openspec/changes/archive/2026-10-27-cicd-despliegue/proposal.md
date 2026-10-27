# Proposal

Ítem #6 de `docs/04-backlog/BACKLOG.md`.

## Why

Hoy los tableros se despliegan a mano por MobaXterm: nada impide publicar con un test roto. El repo será público y el servidor es el de producción (R-13).

## What Changes

- `.github/workflows/ci-cd.yml`: quality → e2e → deploy → smoke.
- `deploy/desplegar.sh` (comando forzado, valida SHA, rollback), `deploy/curso-hfc-api.service`, `deploy/nginx-curso-hfc.conf`.
- `.env.example` y `.gitignore` sin secretos.

## Capabilities

### New Capabilities
- `despliegue`

### Modified Capabilities

## Impact

- Nuevo: `.github/`, `deploy/`.
- ADR-0008; DEPLOY-PLAN.
