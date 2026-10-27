# ADR 0007: Datos ficticios deterministas con semilla fija

## Estado

Aceptado

## Contexto

El PRD exige que ningún dato real salga de producción, pero que los datos tengan «la forma y
el volumen de la operación real». Los tests E2E necesitan números estables para poder afirmar
cosas como «61 días × 18 franjas».

## Decisión

`sql/semilla.py` genera agosto y septiembre de 2026 con `random.Random(20260801)`: 24 asesores
con nombres inventados, 3 supervisores, franjas de 08:00 a 16:30 con la curva de llegada de un
inbound, menos volumen en fin de semana. Corre `02_esquema.sql` (idempotente) y reemplaza todos
los datos en **una transacción**. Los usuarios del panel se crean con las claves de
`CLAVE_ADMIN`, `CLAVE_SUPERVISOR` y `CLAVE_CLIENTE` (variables de entorno, nunca en el código),
más un usuario dado de baja (`BAJA.DEMO`) para probar `ACTIVO = 0`.

## Alternativas consideradas

- **Anonimizar datos reales**: el riesgo de reidentificación (pocos asesores, horarios
  conocidos) no compensa.
- **Datos aleatorios en cada corrida**: los tests no podrían afirmar valores.

## Consecuencias

- Cada deploy deja la base en un estado conocido.
- El período es fijo: la demo no "envejece" mal, pero siempre muestra ago–sep 2026.
