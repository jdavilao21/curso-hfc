# Security Report — Panel de Gestión HFC (demo del curso)

Fecha: 2026-10-26 · Tipo: Security Pass (análisis con evidencia; las correcciones se aplicaron
en el mismo ciclo y cada una tiene su test)

## Executive Summary

**Qué es el sistema.** Front estático (HTML + JS, sin build) y API FastAPI detrás de Nginx en el
mismo origen, con SQL Server (`BD_CURSO_HFC`) en un VPS que **también corre producción**. Login
propio con PBKDF2 y JWT HS256; tres perfiles. Los datos son **ficticios**; el repositorio y la
demo son **públicos**.

**Actores considerados.** Usuario legítimo de cada perfil; Cliente Claro curioso con DevTools;
anónimo de internet (prueba de contraseñas, inyección, escaneo); dato malicioso en la nómina
(un Excel de carga manipulado); quien obtenga la llave de despliegue de GitHub; y el propio
servidor compartido (la demo no debe poder afectar a producción).

**Postura general.** Los controles centrales están en el servidor: la autorización usa el perfil
del token firmado, las consultas son fijas y parametrizadas, la API usa un login de solo
lectura y el despliegue no abre una consola. Los riesgos que quedan son **aceptados de forma
explícita** y razonables solo porque los datos son ficticios (ver Governance).

| Severidad | Total | Corregidos | Aceptados |
|---|---|---|---|
| CRITICAL | 0 | — | — |
| HIGH | 3 | 3 | 0 |
| MEDIUM | 5 | 3 | 2 |
| LOW | 3 | 1 | 2 |

**Capas revisadas:** producto (PRD), arquitectura (TECH-DESIGN v1/v2, ADR 0001–0010 y la
revisión adversarial R-01…R-15), specs (`openspec/`), código (`api/`, `web/js/`, `sql/`),
configuración (`deploy/`, `.github/workflows/`), dependencias (`pip-audit`: 0 vulnerabilidades;
`npm audit`: 0) y tests.

## Security Strengths

- **Autorización en el servidor** con el perfil del token (ADR-0009); el front solo oculta pestañas.
- **Token verificado de forma estricta**: firma HMAC en tiempo constante antes de leer claims,
  `alg` fijo (rechaza `none`), `exp`, `campana`; secreto ≥ 32 o la API no arranca.
- **Sin superficie de inyección SQL**: tres consultas fijas en `db.py`; la única con dato del
  usuario usa `?`.
- **Mínimo privilegio en la base**: `curso_hfc_app` solo `SELECT` + `DENY` de escritura y DDL;
  verificado (`Msg 229 … INSERT permission was denied`).
- **Superficie mínima**: `/docs` y `/openapi.json` apagados; Nginx publica solo `web/` (nada de
  `.git`, `sql/`, `.env`); API en `127.0.0.1`; `Cache-Control: no-store`.
- **Secretos fuera del repo**: `/etc/curso-hfc/*.env` (600) y GitHub Secrets; el job `quality`
  falla si encuentra un `PASSWORD=`/`SECRET=`/`CLAVE_…=` con valor.
- **Servicio aislado**: usuario sin privilegios, `NoNewPrivileges`, `ProtectSystem=strict`,
  `ProtectHome`, `PrivateTmp`.

## Findings

### SP-01 — JWT firmado a mano sin validaciones especificadas

- **Severity:** HIGH · **Estado:** Corregido
- **Affected artifact:** Diseño (TECH-DESIGN v1, R-04), código `api/auth.py`
- **Description:** Un JWT "sin dependencias" es fácil de implementar mal: aceptar `alg=none`,
  comparar la firma con `==` o leer las claims antes de validar la firma.
- **Remediation applied:** `verificar_token` compara con `hmac.compare_digest` **antes** de
  decodificar las claims, exige `alg == "HS256"`, `exp` futuro y `campana == "HFC"`.
- **Evidence:** `api/tests/test_auth.py` (alterado, `alg none`, vencido, secreto corto);
  E2E `token con la firma alterada…` y `token con alg=none…`.

### SP-02 — Inyección SQL en el login

- **Severity:** HIGH · **Estado:** Corregido (por diseño)
- **Location:** `api/db.py:SQL_USUARIO`
- **Description:** El login es el único punto donde un dato del usuario llega a SQL.
- **Remediation applied:** consulta parametrizada (`WHERE USUARIO_E = ?`); el usuario se trunca
  a 30 caracteres; la API se conecta con un login sin permisos de escritura (aunque hubiera
  inyección, no podría modificar nada).
- **Evidence:** E2E `inyección SQL en el usuario no entra` (`' OR 1=1 --` → `401`).

### SP-03 — Enumeración de usuarios por el login

- **Severity:** MEDIUM · **Estado:** Corregido
- **Location:** `api/main.py:login`, `api/auth.py:HASH_SEÑUELO`
- **Description:** Si el usuario no existe y se salta el PBKDF2, responde ~100 ms más rápido.
- **Remediation applied:** siempre se verifica contra un hash (el real o el señuelo); mismo
  `401` y mismo cuerpo para inexistente, inactivo y clave mala.
- **Evidence:** E2E `el login no revela si el usuario existe`.

### SP-04 — El Cliente Claro obtenía el detalle por asesor desde la API

- **Severity:** HIGH · **Estado:** Corregido
- **Location:** `api/main.py:_datos`, `_agregar_por_supervisor`
- **Description:** (R-01) La pestaña Asesores estaba oculta para el cliente, pero
  `hfc-supervisores` le devolvía nombre y código de cada asesor.
- **Remediation applied:** ADR-0009; para `CLIENTE CLARO` se agrega por supervisor y día.
- **Evidence:** E2E `CLIENTE CLARO recibe Supervisores agregado…` (sin nombres, mismos totales).

### SP-05 — Prueba de contraseñas sin límite

- **Severity:** MEDIUM · **Estado:** Corregido, con riesgo residual aceptado
- **Location:** `deploy/nginx-curso-hfc.conf` (`limit_req`), `api/main.py:_bloqueado`
- **Remediation applied:** ADR-0010, Nginx 10/min por IP + API 5 fallos/15 min por (IP, usuario).
- **Residual:** el contador vive en memoria de cada worker (2) y se reinicia con cada deploy.
- **Evidence:** E2E `cinco intentos fallidos bloquean al sexto con 429`.

### SP-06 — Claves de la demo publicadas

- **Severity:** MEDIUM · **Estado:** Aceptado
- **Description:** El README publica usuarios y claves de prueba para que el profesor entre.
- **Why accepted:** los datos son ficticios y el login de la base es de solo lectura.
  **Condición:** si la demo se conecta a datos reales, hay que retirarlas y rotarlas.

### SP-07 — Cabeceras de seguridad y librerías de terceros

- **Severity:** MEDIUM · **Estado:** Corregido
- **Location:** `deploy/nginx-curso-hfc.conf`, `web/index.html`
- **Remediation applied:** CSP (`default-src 'self'`, solo `cdn.jsdelivr.net` y Google Fonts,
  `connect-src 'self'`, `frame-ancestors 'none'`), `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS, `server_tokens off`; **SRI** (sha384) en los 3 scripts del CDN.
- **Evidence:** el job `smoke` comprueba la cabecera CSP en producción.

### SP-08 — Datos de la nómina insertados con `innerHTML`

- **Severity:** MEDIUM · **Estado:** Mitigado, con riesgo residual aceptado
- **Location:** `web/js/01-core.js:limpiarTextos` (39 usos de `innerHTML` en `web/js/`)
- **Description:** Nombres, supervisores y condiciones vienen de la nómina (en producción, un
  Excel) y se pintan con `innerHTML`. Un `<img onerror>` en un nombre ejecutaría código.
- **Remediation applied:** cada respuesta pasa por `limpiarTextos()`, que quita `< > " \` ' \`.
  Durante este pase se sospechó de un `onclick="fn('…')"` en `20-agentes-comun.js:100`; se
  verificó que solo recibe claves fijas (no es explotable), pero se agregaron `'` y `\` como
  defensa en profundidad.
- **Residual:** reescribir los 39 `innerHTML` con `textContent` es fuera de alcance; la CSP
  necesita `'unsafe-inline'` por los `onclick` del HTML heredado.
- **Evidence:** E2E `un nombre con HTML en la nómina se muestra como texto` (**falla** sin
  `limpiarTextos`: 76 imágenes inyectadas).

### SP-09 — Token no revocable y sesión solo en memoria

- **Severity:** LOW · **Estado:** Aceptado (R-08, R-14)
- **Description:** Un usuario dado de baja conserva su sesión hasta 10 h; F5 obliga a reingresar.
- **Why accepted:** sin datos reales; mantener el token fuera de `localStorage`/`sessionStorage`
  reduce el impacto de un XSS.

### SP-10 — Llave de despliegue con acceso al servidor de producción

- **Severity:** LOW · **Estado:** Corregido
- **Location:** `deploy/desplegar.sh`, `.github/workflows/ci-cd.yml`
- **Description:** Una llave SSH en GitHub Secrets que abre una consola en el VPS compartido
  sería el riesgo más grave del proyecto si se filtrara.
- **Remediation applied:** usuario `deploy-curso` con comando forzado, sin pty ni reenvíos; el
  script acepta solo un SHA que esté en `origin/main`; el `sudo` permitido es solo
  `systemctl restart curso-hfc-api`; los secrets viven en el environment `production` y los PRs
  de forks no los reciben (`pull_request`, nunca `pull_request_target`).

### SP-11 — Límite de intentos y caché por worker

- **Severity:** LOW · **Estado:** Aceptado
- **Description:** Ver SP-05 «Residual». Un Redis compartido sería desproporcionado para la demo.

## Priority

1. Ninguno abierto bloquea la publicación de la demo.
2. Si se conectan datos reales: retirar las claves públicas (SP-06), revisar `ACTIVO` en cada
   pedido o acortar el token (SP-09) y migrar los `innerHTML` de nombres a `textContent` (SP-08).

## Governance / Decision Required

- **Datos ficticios como premisa.** Tres riesgos se aceptan **solo** porque no hay datos reales
  (SP-06, SP-08 residual, SP-09). Cualquier cambio de esa premisa reabre este reporte.
- **Servidor compartido con producción.** La demo está aislada con base, logins, usuario de
  sistema, servicio y subdominio propios, pero comparte CPU, memoria y Nginx con los tableros
  reales. Jose decide si la demo sigue en este VPS después del curso.
