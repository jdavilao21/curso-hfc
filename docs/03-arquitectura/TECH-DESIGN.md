# Technical Design Document v2: Panel de Gestión HFC

Fecha: 2026-10-26 · Consume: [`PRD.md`](../01-producto/PRD.md), [`DESIGN.md`](../02-diseno/DESIGN.md)
· Versión anterior: [`TECH-DESIGN-v1.md`](TECH-DESIGN-v1.md)

## Qué cambió respecto de v1

El v1 pasó por una **revisión adversarial con contexto fresco**: un agente que solo leyó el PRD
y el v1, sin ver el código. Encontró 15 hallazgos (4 de severidad ALTA). Esta versión responde a
cada uno de ellos:

| # | Sev. | Hallazgo (resumen) | Respuesta en v2 |
|---|---|---|---|
| R-01 | ALTA | El Cliente Claro recibe el detalle por asesor; solo lo protege el front | **Corregido**: [ADR-0009](adrs/0009-autorizacion-por-perfil-en-servidor.md), la API agrega por supervisor según el perfil del token |
| R-02 | ALTA | No hay bloqueo por intentos fallidos (CB-02) | **Corregido**: [ADR-0010](adrs/0010-limite-intentos-login.md), Nginx + contador por (IP, usuario) |
| R-03 | ALTA | «Un usuario con permisos sobre la base» no excluye `sa` | **Corregido**: [ADR-0001](adrs/0001-persistencia-sql-server-bd-propia.md), logins `curso_hfc_app` (solo SELECT + DENY) y `curso_hfc_carga` |
| R-04 | ALTA | JWT hecho a mano sin validaciones especificadas | **Especificado**: [ADR-0005](adrs/0005-autenticacion-propia-pbkdf2-jwt.md), alg fijo, tiempo constante, `exp`, secreto ≥ 32 en `/etc/curso-hfc/api.env`, 9 tests unitarios |
| R-05 | MEDIA | XSS por nombres de la nómina; CDN sin integridad | **Corregido**: `limpiarTextos()` en cada respuesta, SRI en los 3 scripts del CDN, CSP en Nginx (SP-07, SP-08) |
| R-06 | MEDIA | El servidor no normaliza el usuario (CB-05) | **Corregido**: `strip().upper()` antes de buscar y de contar intentos |
| R-07 | MEDIA | El tiempo de respuesta revela usuarios existentes | **Corregido**: `HASH_SEÑUELO` ([ADR-0010](adrs/0010-limite-intentos-login.md)) |
| R-08 | MEDIA | Con la sesión en memoria, F5 obliga a reingresar | **Aceptado**: preferimos no dejar el token en `sessionStorage` (XSS). El Modo TV no recarga la página |
| R-09 | MEDIA | Sin tiempos límite: la API podría colgarse | **Corregido**: 10 s para conectar y 30 s por consulta → `503` JSON; el front muestra el aviso y «Actualizar» reintenta |
| R-10 | MEDIA | Nada garantiza atendidas + abandonadas = recibidas | **Corregido**: `CHECK CK_KPI_ATENDIDAS` en la tabla + test E2E fila por fila |
| R-11 | MEDIA | ¿El modelo cubre «modalidad» y TNPS por asesor? | **Verificado**: `ESTADO_OP` es la modalidad (PRESENCIAL/REMOTO); `TBL_GESTION_ASESOR` trae promotores, pasivos y detractores |
| R-12 | MEDIA | El front reutilizado puede arrastrar datos reales | **Verificado**: grep de dominios internos, IPs, códigos de usuario y webhooks; se quitaron `sesion.js`, el panel del asesor y los mocks con nombres reales |
| R-13 | MEDIA | El deploy puede tumbar producción en el servidor compartido | **Corregido**: [ADR-0008](adrs/0008-despliegue-vps-nginx-systemd.md), usuario `deploy-curso` con comando forzado que solo reinicia `curso-hfc-api` (nunca toca Nginx ni otros servicios), systemd aislado, rollback automático |
| R-14 | BAJA | Un usuario dado de baja sigue entrando hasta 10 h | **Aceptado** (Riesgos aceptados) |
| R-15 | BAJA | ¿El Excel coincide con la pantalla y lleva la firma? | **Verificado**: se exporta desde el mismo arreglo calculado y `libroConTitulo` agrega la firma del área |

## Resumen

El panel ya existe en producción (`hfc.metadatape.com`). Esta versión del curso **reutiliza el
front** recortado al alcance del PRD y lo conecta a un **backend propio, pequeño y aislado**
(base, logins, servicio y subdominio propios), para poder publicarlo sin exponer nada de
producción.

## Arquitectura de componentes

```
Navegador ──HTTPS──> Nginx (curso-hfc.metadatape.com)   CSP · nosniff · HSTS · limit_req en login
                       ├── /        → /opt/curso-hfc/web  (estático; SRI en los scripts del CDN)
                       └── /api/*   → curso-hfc-api (systemd, usuario curso-hfc, 127.0.0.1:8010)
                                        FastAPI: main.py · auth.py · db.py
                                        └── pyodbc (curso_hfc_app: solo SELECT) → SQL Server / BD_CURSO_HFC
GitHub Actions ──SSH (comando forzado)──> deploy/desplegar.sh → semilla.py (curso_hfc_carga) → restart → health
```

## Decisiones de arquitectura

| ADR | Decisión |
|---|---|
| [0001](adrs/0001-persistencia-sql-server-bd-propia.md) | SQL Server existente, base nueva y logins de mínimo privilegio |
| [0002](adrs/0002-modelo-datos-grano-agregado.md) | Datos ya agregados (día × franja, día × asesor) y vistas con los nombres del sistema real |
| [0003](adrs/0003-contrato-api-post-estilo-webhook.md) | Contrato `POST` JSON con los nombres de webhook del front |
| [0004](adrs/0004-front-estatico-mismo-origen.md) | Front estático, mismo origen, SRI |
| [0005](adrs/0005-autenticacion-propia-pbkdf2-jwt.md) | PBKDF2 + JWT HS256 con la librería estándar |
| [0006](adrs/0006-api-fastapi-cache-memoria.md) | FastAPI + pyodbc, caché de 60 s, tiempos límite |
| [0007](adrs/0007-datos-ficticios-semilla-fija.md) | Datos ficticios deterministas |
| [0008](adrs/0008-despliegue-vps-nginx-systemd.md) | VPS propio, systemd aislado, CI/CD con SSH de comando forzado |
| [0009](adrs/0009-autorizacion-por-perfil-en-servidor.md) | **Nuevo en v2** · Autorización por perfil en el servidor |
| [0010](adrs/0010-limite-intentos-login.md) | **Nuevo en v2** · Límite de intentos y respuestas indistinguibles |

## Modelo de datos

```sql
TBL_NOMINA         (USUARIO PK, NOMBRE_ASESOR, SUPERVISOR, COORDINADOR, CONDICION_LAB,
                    ESTADO_OP /*modalidad*/, ESTADO, CONTRATO)
TBL_KPI_FRANJA     (FECHA, FRANJA_GTR) PK, CHECK (CANT_ATENDIDA + CANT_ABANDONADA = LLAM_RECIBIDAS)
                   LLAM_RECIBIDAS, CANT_ATENDIDA, CANT_ABANDONADA, ATENDIDA_UMBR, MENOR_90SEG, CORTE_AGENTE,
                   TMG_TOTAL_SEG, TMG_PROMSEG, TMP_HABLADO, TMP_PROD, TRANS_ENCU, ENCU_CAL,
                   CANT_PROMOTOR, CANT_DETRACTOR, CANT_PASIVO, TRAF_DIM, TMG_DIM, AGENT_DIM, HORAS_DIM,
                   AGENTE_BR, AGENTE_NETO_IDLE, AGENTE_NETO, TRANS_VICIO, TRANS_IVR_123, TRANS_OTROS_BPO, TRANS_OTROS_GEA
TBL_GESTION_ASESOR (FECHA, USUARIO → TBL_NOMINA) PK
                   CANT_ATENDIDA, CORTE_AGENTE, CANT_HOLD, CORTE_CLIENTE, TMG_TOTAL_SEG, TPM_TOTAL,
                   TMP_HABLADO, TMP_DISPO, TMP_PROD, TMP_TIPIF, CANT_PROMOTOR, CANT_DETRACTOR, CANT_PASIVO,
                   TRANS_ENCU, ENCU_CAL, TRANS_VICIO, TRANS_IVR_123, TRANS_OTROS_BPO, TRANS_OTROS_GEA
TBL_USUARIOS       (USUARIO_E PK, NOMBRE, PERFIL CHECK IN (ADMINISTRADOR, SUPERVISOR, CLIENTE CLARO),
                    HASH_CLAVE, ACTIVO)
VW_DIARIO          = TBL_KPI_FRANJA     + PERIODO, FECHA_VISUAL, SEMANA
VW_SUPERVISORES    = TBL_GESTION_ASESOR ⋈ TBL_NOMINA + PERIODO, FECHA_VISUAL, SEMANA
```

### Configuración

| Variable | Dónde | Uso |
|---|---|---|
| `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `/etc/curso-hfc/api.env` (600) | Conexión de la API (`curso_hfc_app`) |
| `JWT_SECRET` (≥ 32) | `/etc/curso-hfc/api.env` | Firma del token; distinto del de producción |
| `TOKEN_HORAS` (10), `CACHE_TTL_S` (60), `DB_QUERY_TIMEOUT` (30) | idem | Ajustes |
| `LOGIN_INTENTOS_MAX` (5), `LOGIN_VENTANA_S` (900) | idem | ADR-0010 |
| `CLAVE_ADMIN`, `CLAVE_SUPERVISOR`, `CLAVE_CLIENTE` + `DB_*` de `curso_hfc_carga` | `/etc/curso-hfc/carga.env` (600) | Semilla |

## Contrato de la API

| Método y ruta | Entrada | Respuestas |
|---|---|---|
| `POST /api/hfc-login` | `{usuario_e, password}` | `200 {ok, usuario_e, nombre, perfil, token}` · `400` vacío · `401` credenciales · `429` demasiados intentos |
| `POST /api/hfc-diario` | `Authorization: Bearer` | `200 [VW_DIARIO]` · `401` · `403` · `503` |
| `POST /api/hfc-supervisores` | `Authorization: Bearer` | `200 [VW_SUPERVISORES]` (agregado por supervisor si el perfil es CLIENTE CLARO) · `401` · `403` · `503` |
| `GET /api/health` | — | `200 {ok:true, db:"ok"}` · `503` |

Todas: `Cache-Control: no-store`. Errores: `{ok:false, msg}`. Sin `/docs` ni `/openapi.json`.

## Criterios de aceptación por flujo

### Ingreso
- Usuario y clave correctos → token de 10 h; la sesión vive en memoria del navegador.
- Clave mala, usuario inexistente o inactivo → `401` con el **mismo** cuerpo y un tiempo similar.
- 5 fallos del mismo usuario desde la misma IP en 15 min → `429`.
- Usuario en minúsculas o con espacios → se normaliza antes de validar.

### Tablero
- Tras el ingreso, `hfc-diario` y `hfc-supervisores` en paralelo; KPI calculados en el navegador.
- `401`/`403` en un pedido de datos → login con «Tu sesión venció» (o «sin acceso»).
- `5xx` o red caída → aviso «No se pudo cargar los datos…»; «Actualizar» reintenta.
- Cliente Claro: sin pestaña Asesores y, en la API, sin filas por asesor.
- Exportar: el Excel sale del mismo arreglo que la tabla y lleva la firma del área.

## Riesgos técnicos abiertos

- **SQL Server compartido con producción.** Mitigado con base y logins propios, datos pequeños,
  caché y tiempo límite; no hay Resource Governor (edición Express/Standard).
- **Claves de la demo publicadas** en el README: aceptable solo con datos ficticios.

## Riesgos aceptados (POC)

- **R-08**: F5 obliga a reingresar (token solo en memoria).
- **R-14**: el token no se revoca antes de 10 h; un usuario dado de baja conserva su sesión abierta.
- El límite de intentos es por worker y se reinicia en cada deploy (ADR-0010).
- `script-src 'unsafe-inline'` en la CSP por los `onclick` heredados (SP-08).
