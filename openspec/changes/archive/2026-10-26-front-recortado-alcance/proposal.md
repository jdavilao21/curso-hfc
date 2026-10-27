# Proposal

Ítem #1 de `docs/04-backlog/BACKLOG.md`.

## Why

El PRD deja fuera Detalle TNPS, Horas, Oportunidades, Salientes y el panel del asesor, y exige que ningún dato real salga de producción. El front de HFC producción trae todo eso, más `sesion.js` (latido con ubicación) y URLs de n8n.

## What Changes

- Copia de `index.html`, `css/`, `js/`, `assets/` de HFC producción a `web/`, sin historial git.
- Se quitan las secciones, ventanas, botones, scripts y estilos fuera de alcance; también el motor de «Descargar detalle» y el mock de Horas.
- `CFG.N8N` → `CFG.API = '/api'`; se elimina `PANEL_ASESOR`.
- SRI (`sha384`) en xlsx-js-style, Chart.js y chartjs-plugin-datalabels.
- Placeholder del login: `Ej. SUP.DEMO`.

## Capabilities

### New Capabilities
- `app-shell`

### Modified Capabilities

## Impact

- `web/index.html`, `web/js/01-core.js`, `07-init.js`, `09-supervisores.js`, `14-asesores.js`, `06-export.js`, `03-data-mock.js`, `11-remote.js`.
- Eliminados: 7 JS y 3 CSS. ADR-0004, revisión R-05 y R-12.
