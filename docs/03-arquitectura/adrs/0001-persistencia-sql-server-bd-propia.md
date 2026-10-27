# ADR 0001: Persistencia en el SQL Server existente, con base y logins propios

## Estado

Aceptado (los logins de mínimo privilegio se agregaron tras la revisión adversarial, ver TECH-DESIGN v2)

## Contexto

El PRD pide no contratar infraestructura nueva («El servidor y la base de datos son los que GEA
ya opera») y, a la vez, que **ningún dato real salga de producción**. GEA ya opera SQL Server en
su VPS Ubuntu, con las bases de producción (`BD_HFC`, `CLARO_123`, …). El equipo conoce SQL
Server; las vistas de los KPI de producción están escritas en T-SQL.

## Decisión

Crear una base nueva, **`BD_CURSO_HFC`**, en el mismo SQL Server, con dos logins propios que
solo existen para la demo (`sql/01_crear_bd.sql`):

- `curso_hfc_app` — el de la API: solo `SELECT` sobre el esquema `dbo` de esa base, con
  `DENY` explícito de escritura y DDL.
- `curso_hfc_carga` — el de la semilla: lee y escribe solo en esa base.

Ninguno tiene acceso a las bases de producción. La API **nunca** usa `sa`.

## Alternativas consideradas

- **PostgreSQL/SQLite nuevos**: más simples de publicar, pero obligan a reescribir las vistas en
  otro dialecto y alejan la demo del sistema real que se quiere enseñar.
- **SQL Server aparte en Docker**: aislamiento total, pero ocupa ~2 GB de RAM permanente en un
  VPS que ya corre producción.
- **Leer `BD_HFC` directamente**: descartado: expondría datos reales en una demo pública.

## Consecuencias

- Mismo motor y mismo T-SQL que producción; las vistas se parecen a las reales.
- Comparte CPU y memoria con producción: una consulta pesada de la demo podría afectar a los
  tableros reales. Mitigación: datos pequeños (~2.300 filas), caché de 60 s ([[0006]]) y
  consultas fijas sin parámetros del usuario.
- En CI se usa el mismo motor en un contenedor efímero (`mcr.microsoft.com/mssql/server:2022`).
