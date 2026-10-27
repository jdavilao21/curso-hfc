# Technical Design Document v1: Panel de Gestión HFC

> **Versión archivada.** Es el diseño antes de la revisión adversarial. La versión vigente es
> [`TECH-DESIGN.md`](TECH-DESIGN.md) (v2). Se conserva para que se vea qué cambió y por qué.

Fecha: 2026-10-26 · Consume: [`PRD.md`](../01-producto/PRD.md), [`DESIGN.md`](../02-diseno/DESIGN.md)

## Resumen

El panel ya existe en producción (`hfc.metadatape.com`) con un front estático, una API
FastAPI compartida con otras campañas (`atc-api`), el login a través de n8n y la base
`BD_HFC` en SQL Server. Esta versión del curso **reutiliza el front** recortado al alcance del
PRD y **reemplaza el backend** por uno propio, pequeño y autocontenido, para poder publicarlo
sin exponer nada de producción.

## Arquitectura de componentes

```
Navegador ──HTTPS──> Nginx (curso-hfc.metadatape.com)
                       ├── /        → web/ (HTML + JS + CSS estáticos, librerías por CDN)
                       └── /api/*   → FastAPI (uvicorn, 127.0.0.1:8010)
                                        └── pyodbc → SQL Server (BD_CURSO_HFC)
```

- **web/**: el front de HFC sin las pestañas fuera de alcance. Sin empaquetador.
- **api/**: `main.py` (rutas), `auth.py` (contraseñas y token), `db.py` (consultas).
- **sql/**: creación de la base, esquema y semilla de datos ficticios.

## Decisiones de arquitectura

| ADR | Decisión |
|---|---|
| [0001](adrs/0001-persistencia-sql-server-bd-propia.md) | SQL Server existente, base nueva `BD_CURSO_HFC` |
| [0002](adrs/0002-modelo-datos-grano-agregado.md) | Modelo con datos ya agregados (día × franja, día × asesor) y vistas |
| [0003](adrs/0003-contrato-api-post-estilo-webhook.md) | Contrato API: `POST` JSON con los nombres de webhook que ya usa el front |
| [0004](adrs/0004-front-estatico-mismo-origen.md) | Front estático y API en el mismo origen detrás de Nginx |
| [0005](adrs/0005-autenticacion-propia-pbkdf2-jwt.md) | Login propio: PBKDF2 + JWT HS256 sin dependencias |
| [0006](adrs/0006-api-fastapi-cache-memoria.md) | FastAPI + pyodbc con caché en memoria de 60 s |
| [0007](adrs/0007-datos-ficticios-semilla-fija.md) | Datos ficticios deterministas (semilla fija) |
| [0008](adrs/0008-despliegue-vps-nginx-systemd.md) | VPS propio: Nginx + systemd, CI/CD con GitHub Actions |

## Modelo de datos

```
TBL_NOMINA (USUARIO PK, NOMBRE_ASESOR, SUPERVISOR, COORDINADOR, CONDICION_LAB, ESTADO_OP, ESTADO, CONTRATO)
TBL_KPI_FRANJA (FECHA, FRANJA_GTR) PK — llamadas, TMG, encuestas, dimensionado, transferencias
TBL_GESTION_ASESOR (FECHA, USUARIO→TBL_NOMINA) PK — producción y tiempos por asesor y día
TBL_USUARIOS (USUARIO_E PK, NOMBRE, PERFIL, HASH_CLAVE, ACTIVO)
VW_DIARIO = TBL_KPI_FRANJA + PERIODO, FECHA_VISUAL, SEMANA
VW_SUPERVISORES = TBL_GESTION_ASESOR ⋈ TBL_NOMINA + PERIODO, FECHA_VISUAL, SEMANA
```

La API se conecta con un usuario de SQL Server con permisos sobre la base.

## Contrato de la API

| Método y ruta | Entrada | Salida |
|---|---|---|
| `POST /api/hfc-login` | `{usuario_e, password}` | `200 {ok:true, usuario_e, nombre, perfil, token}` · `401 {ok:false, msg}` |
| `POST /api/hfc-diario` | `Authorization: Bearer <token>` | `200 [filas VW_DIARIO]` · `401` |
| `POST /api/hfc-supervisores` | `Authorization: Bearer <token>` | `200 [filas VW_SUPERVISORES]` · `401` |
| `GET /api/health` | — | `200 {ok:true}` · `503` |

## Criterios de aceptación por flujo

### Ingreso
- Usuario y contraseña correctos → token con `sub`, `perfil`, `exp` (10 h); el front guarda la
  sesión en memoria (no en `localStorage`).
- Contraseña incorrecta o usuario inactivo → `401` y mensaje genérico.
- El front oculta las pestañas no permitidas para el perfil (`TABS_POR_PERFIL`).

### Tablero
- Tras el ingreso, el front pide `hfc-diario` y `hfc-supervisores` en paralelo y dibuja la
  pestaña activa. Todos los cálculos de KPI se hacen en el navegador (`02-engine.js`).
- Un `401` en cualquier pedido de datos vuelve al login con «Tu sesión venció».
- Un error de red o `5xx` muestra el aviso de carga con el mensaje.

## Riesgos técnicos abiertos

- El servidor SQL es el mismo de producción.
- El token no se puede revocar antes de que venza.
- Las librerías del front se cargan desde un CDN público.
