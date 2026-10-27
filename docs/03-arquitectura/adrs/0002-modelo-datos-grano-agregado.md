# ADR 0002: Modelo de datos con el grano ya agregado y vistas de lectura

## Estado

Aceptado

## Contexto

En producción, el ETL carga la trazabilidad llamada por llamada y las vistas
(`KPIS_PENALIDADES_HFC`, la de supervisores) agregan a **día × franja** y **día × asesor**. El
front solo consume ese grano agregado: todos los KPI se calculan en el navegador
(`web/js/02-engine.js`) a partir de sumas. El PRD deja fuera la carga de datos.

## Decisión

Guardar directamente el grano que consume el front:

- `TBL_KPI_FRANJA` — PK `(FECHA, FRANJA_GTR)`; fuente de Diario e Intervalos.
- `TBL_GESTION_ASESOR` — PK `(FECHA, USUARIO)`, FK a `TBL_NOMINA`; fuente de Supervisores y Asesores.
- `TBL_NOMINA` — un registro por asesor.
- `TBL_USUARIOS` — quién entra y con qué perfil (`CHECK` sobre los tres perfiles).

Dos vistas (`VW_DIARIO`, `VW_SUPERVISORES`) agregan las columnas derivadas (`PERIODO`,
`FECHA_VISUAL`, `SEMANA`) y devuelven **exactamente** los nombres de columna del sistema real,
para que el front no cambie. Una restricción `CHECK (CANT_ATENDIDA + CANT_ABANDONADA =
LLAM_RECIBIDAS)` garantiza el criterio de éxito 7 en la propia base.

## Alternativas consideradas

- **Replicar la trazabilidad llamada por llamada** y agregar en la vista: más fiel, pero
  multiplica el volumen por ~40 sin cambiar nada de lo que ve el usuario.
- **Servir JSON estáticos**: sin base de datos no hay nada que enseñar en seguridad, permisos
  ni despliegue.

## Consecuencias

- Las consultas de la API son `SELECT *` de una vista, sin `JOIN` costosos.
- Si en el futuro se agrega «Detalle TNPS» o «descarga registro por registro» (hoy en el No
  alcance), este modelo no alcanza: habrá que agregar la tabla de trazabilidad.
