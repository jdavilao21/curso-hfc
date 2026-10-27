## Decisions
- La lógica de KPI no se toca: es la de producción, validada por Jose.
- Los E2E levantan la API con `SERVIR_WEB=1` (mismo origen, sin Nginx) y usan `reducedMotion: 'reduce'` (la mascota del login flota y Playwright no la considera estable).
- Selectores por `id` y `data-tab`, nunca por posición.

## Risks / Trade-offs
- Los E2E dependen de la semilla fija (valores como `202609`).
