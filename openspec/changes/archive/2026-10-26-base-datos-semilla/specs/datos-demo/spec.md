## ADDED Requirements

### Requirement: Base y logins aislados
La creación de la base SHALL producir dos logins: `curso_hfc_app` con solo `SELECT` sobre `dbo` (y `DENY` de INSERT, UPDATE, DELETE y ALTER) y `curso_hfc_carga` con lectura, escritura y DDL solo en `BD_CURSO_HFC`.

#### Scenario: La API intenta escribir
- **WHEN** `curso_hfc_app` ejecuta un `INSERT` en cualquier tabla
- **THEN** SQL Server lo rechaza por permisos

### Requirement: Esquema idempotente
`sql/02_esquema.sql` SHALL poder ejecutarse en cada despliegue sin error y sin perder la estructura: tablas con `IF OBJECT_ID(...) IS NULL`, vistas con `CREATE OR ALTER`.

#### Scenario: Segunda ejecución
- **WHEN** el esquema ya existe y se vuelve a ejecutar
- **THEN** termina sin error

### Requirement: Coherencia de llamadas
Toda fila de `TBL_KPI_FRANJA` SHALL cumplir `CANT_ATENDIDA + CANT_ABANDONADA = LLAM_RECIBIDAS`, garantizado por una restricción `CHECK`.

#### Scenario: Fila incoherente
- **WHEN** se inserta una fila con 10 recibidas, 8 atendidas y 1 abandonada
- **THEN** la base la rechaza

### Requirement: Semilla determinista
`sql/semilla.py` SHALL generar del 2026-08-01 al 2026-09-30, con 18 franjas diarias (08:00–16:30), 24 asesores ficticios y 3 supervisores, siempre con los mismos valores, y reemplazar los datos en una sola transacción.

#### Scenario: Volumen esperado
- **WHEN** termina la semilla
- **THEN** `VW_DIARIO` tiene 1.098 filas (61 × 18) y `TBL_NOMINA` 24

#### Scenario: Claves faltantes
- **WHEN** falta `CLAVE_ADMIN`, `CLAVE_SUPERVISOR` o `CLAVE_CLIENTE`, o tiene menos de 8 caracteres
- **THEN** la semilla termina con error sin tocar los datos

### Requirement: Usuarios de prueba
La semilla SHALL crear `ADMIN.DEMO`, `SUP.DEMO`, `CLIENTE.DEMO` (activos) y `BAJA.DEMO` (inactivo), con las contraseñas en PBKDF2.
