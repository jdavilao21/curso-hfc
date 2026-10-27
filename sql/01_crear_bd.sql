/* 01_crear_bd.sql — Crea BD_CURSO_HFC y sus dos logins (ADR-0001, SP-02).
   Se corre UNA vez con un usuario administrador (sa), por ejemplo:
     sqlcmd -S 127.0.0.1 -U sa -C -i sql/01_crear_bd.sql -v CLAVE_APP="..." CLAVE_CARGA="..."
   - curso_hfc_app   : lo usa la API. Solo puede leer (SELECT) el esquema dbo.
   - curso_hfc_carga : lo usa sql/semilla.py para cargar los datos ficticios. Lee y escribe solo esta base.
   Ninguno de los dos puede ver las bases de producción (BD_HFC, CLARO_123, …). */
IF DB_ID('BD_CURSO_HFC') IS NULL CREATE DATABASE BD_CURSO_HFC;
GO
IF SUSER_ID('curso_hfc_app') IS NULL
    CREATE LOGIN curso_hfc_app WITH PASSWORD = '$(CLAVE_APP)', DEFAULT_DATABASE = BD_CURSO_HFC, CHECK_POLICY = ON;
IF SUSER_ID('curso_hfc_carga') IS NULL
    CREATE LOGIN curso_hfc_carga WITH PASSWORD = '$(CLAVE_CARGA)', DEFAULT_DATABASE = BD_CURSO_HFC, CHECK_POLICY = ON;
GO
USE BD_CURSO_HFC;
GO
IF USER_ID('curso_hfc_app') IS NULL CREATE USER curso_hfc_app FOR LOGIN curso_hfc_app;
IF USER_ID('curso_hfc_carga') IS NULL CREATE USER curso_hfc_carga FOR LOGIN curso_hfc_carga;
GO
ALTER ROLE db_datareader ADD MEMBER curso_hfc_carga;
ALTER ROLE db_datawriter ADD MEMBER curso_hfc_carga;
ALTER ROLE db_ddladmin  ADD MEMBER curso_hfc_carga;
/* La API: solo SELECT en el esquema dbo (vistas y TBL_USUARIOS); sin INSERT/UPDATE/DELETE ni DDL. */
GRANT SELECT ON SCHEMA::dbo TO curso_hfc_app;
DENY INSERT, UPDATE, DELETE, ALTER ON SCHEMA::dbo TO curso_hfc_app;
GO
