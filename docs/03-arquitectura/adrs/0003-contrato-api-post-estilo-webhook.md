# ADR 0003: Contrato de la API — POST JSON con los nombres de webhook del front

## Estado

Aceptado

## Contexto

El front de producción habla con n8n/`atc-api` mediante webhooks: `POST` a
`/webhook/hfc-login`, `/webhook/hfc-diario`, `/webhook/hfc-supervisores`, con JSON en el
cuerpo y el token en `Authorization: Bearer`. El front maneja `401` volviendo al login.

## Decisión

Mantener el mismo contrato bajo el prefijo `/api`: `POST /api/hfc-login`,
`POST /api/hfc-diario`, `POST /api/hfc-supervisores`, más `GET /api/health`. Las respuestas de
datos son un arreglo JSON de filas con las columnas de la vista; los errores son
`{ok:false, msg}` con `400`, `401`, `403`, `429` o `503`. Todas las respuestas llevan
`Cache-Control: no-store`. La documentación automática de FastAPI (`/docs`, `/openapi.json`)
está apagada.

## Alternativas consideradas

- **REST "puro"** (`GET /api/kpi/franjas`, `GET /api/asesores`): más idiomático, pero obliga a
  tocar `11-remote.js`, `01-core.js` y el envoltorio de `fetch` del front sin beneficio para el usuario.

## Consecuencias

- El front solo cambia una línea (`CFG.API = '/api'`).
- Los endpoints de datos usan `POST` aunque sean lecturas: no se cachean en proxies y no quedan
  en el historial con parámetros. Es una herencia de n8n, documentada para que nadie lo "corrija" sin querer.
