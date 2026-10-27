## 1. Base

- [x] 1.1 `01_crear_bd.sql` con logins y permisos
- [x] 1.2 `02_esquema.sql` idempotente con CHECK y FK

## 2. Semilla

- [x] 2.1 Nómina, día × franja y día × asesor deterministas
- [x] 2.2 Usuarios con PBKDF2 desde variables de entorno
- [x] 2.3 Reemplazo en una transacción

## 3. Verificación

- [x] 3.1 Correr dos veces contra SQL Server 2022 en Docker
- [x] 3.2 Contar 1.098 / 24 / 4 filas
- [x] 3.3 `INSERT` con `curso_hfc_app` rechazado
