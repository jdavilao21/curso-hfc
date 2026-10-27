# Proposal

Ítem #3 de `docs/04-backlog/BACKLOG.md`.

## Why

El PRD pide usuario y contraseña con tres perfiles, el mismo mensaje para cualquier rechazo (criterio 2) y bloqueo ante intentos en serie (CB-02). La revisión adversarial marcó R-02, R-04, R-06 y R-07.

## What Changes

- `api/auth.py`: `hashear_clave`, `verificar_clave`, `HASH_SEÑUELO`, `emitir_token`, `verificar_token`, `token_de_cabecera`.
- `POST /api/hfc-login` en `api/main.py` con normalización, límite por (IP, usuario) y log sin contraseñas.
- `api/tests/test_auth.py`: 9 pruebas unitarias.

## Capabilities

### New Capabilities
- `acceso`

### Modified Capabilities

## Impact

- Nuevo: `api/auth.py`, `api/main.py` (ruta de login), `api/tests/`.
- ADR-0005, ADR-0010.
