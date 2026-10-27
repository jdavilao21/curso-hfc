## Context
El front calcula todo a partir de sumas por día × franja y día × asesor.

## Decisions
- Guardar ese grano directamente (ADR-0002); las vistas añaden `PERIODO`, `FECHA_VISUAL` (con `FORMAT(..., 'es-ES')`, igual que producción) y `SEMANA`.
- `CHECK CK_KPI_ATENDIDAS` en la tabla (R-10).
- Los permisos de la API se dan por esquema en `01_crear_bd.sql` (`curso_hfc_carga` es `db_ddladmin` pero no puede otorgar permisos).
- Generadores portados de los mocks del front (`mockRawData`, `mockRawAsesores`) con `random.Random(20260801)`; TMG dimensionado y TNPS ajustados para que la demo se vea realista.

## Assumptions
- La clave de `sa` se usa una sola vez, de forma manual, para `01_crear_bd.sql`.

## Risks / Trade-offs
- `FORMAT` es lento en grandes volúmenes; con ~2.300 filas es irrelevante.
