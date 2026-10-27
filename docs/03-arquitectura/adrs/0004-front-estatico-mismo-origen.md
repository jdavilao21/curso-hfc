# ADR 0004: Front estático sin empaquetador, en el mismo origen que la API

## Estado

Aceptado

## Contexto

El front de HFC es HTML + ~20 archivos JS numerados por orden de carga, sin build, con
Chart.js y xlsx-js-style por CDN. Funciona y el equipo lo mantiene así en todos los tableros.

## Decisión

- Servir `web/` como archivos estáticos desde Nginx, sin paso de build.
- La API vive en el **mismo origen** (`/api/*` → `127.0.0.1:8010`). Sin CORS: el navegador
  no permite que otro sitio lea las respuestas.
- Las librerías del CDN se cargan con **Subresource Integrity** (`integrity="sha384-…"`).
- En desarrollo y en los E2E, la propia API sirve `web/` con `SERVIR_WEB=1`, para reproducir el
  mismo origen sin Nginx.

## Alternativas consideradas

- **Migrar a React/Next.js**: sería reescribir ~10.000 líneas que ya funcionan, fuera del alcance.
- **API en otro subdominio con CORS**: más superficie de configuración y de error.

## Consecuencias

- Nginx publica solo `web/`: el `.git`, `sql/` y la configuración quedan fuera de su alcance.
- Los `onclick` en línea del HTML obligan a `script-src 'unsafe-inline'` en la CSP (ver
  SECURITY-REPORT SP-08).
