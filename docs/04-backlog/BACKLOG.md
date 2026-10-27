# Backlog: Panel de Gestión HFC

Consume: [`PRD.md`](../01-producto/PRD.md), [`TECH-DESIGN.md`](../03-arquitectura/TECH-DESIGN.md) v2 y sus ADRs.
Ordenado por dependencias. Cada ítem es **un** change de OpenSpec ([`05-specs`](../05-specs/README.md)).

| # | Ítem | Alcance | Depende de | Contexto extra requerido |
|---|---|---|---|---|
| 1 | Front recortado al alcance del PRD | Copiar `web/` desde HFC producción sin historial; quitar Detalle TNPS, Horas, Oportunidades, Salientes, panel del asesor, `sesion.js` y descargas registro por registro (HTML, JS y CSS); `CFG.API = '/api'`; SRI en los scripts del CDN; grep de datos reales ([ADR-0004](../03-arquitectura/adrs/0004-front-estatico-mismo-origen.md), revisión R-12). | — | Lista de pestañas del PRD (Alcance / No alcance). |
| 2 | Base de datos, logins y semilla | `sql/01_crear_bd.sql` (base + `curso_hfc_app` solo SELECT + `curso_hfc_carga`), `sql/02_esquema.sql` idempotente (4 tablas, 2 vistas, `CHECK` de atendidas), `sql/semilla.py` determinista ([ADR-0001](../03-arquitectura/adrs/0001-persistencia-sql-server-bd-propia.md), [0002](../03-arquitectura/adrs/0002-modelo-datos-grano-agregado.md), [0007](../03-arquitectura/adrs/0007-datos-ficticios-semilla-fija.md)). | — | Columnas exactas que lee el front (`03-data-mock.js`, `08-supervisores-mock.js`, vista real `KPIS_PENALIDADES_HFC`). Clave de `sa` una sola vez para crear la base en el VPS. |
| 3 | Login y token | `api/auth.py` (PBKDF2, JWT HS256, verificación estricta) + `POST /api/hfc-login` con normalización, hash señuelo y límite por (IP, usuario); tests unitarios ([ADR-0005](../03-arquitectura/adrs/0005-autenticacion-propia-pbkdf2-jwt.md), [0010](../03-arquitectura/adrs/0010-limite-intentos-login.md)). | #2 | — |
| 4 | Endpoints de datos con autorización | `POST /api/hfc-diario`, `POST /api/hfc-supervisores`, `GET /api/health`; `PERMISOS` por perfil; agregado por supervisor para CLIENTE CLARO; caché 60 s; tiempos límite → `503` ([ADR-0003](../03-arquitectura/adrs/0003-contrato-api-post-estilo-webhook.md), [0006](../03-arquitectura/adrs/0006-api-fastapi-cache-memoria.md), [0009](../03-arquitectura/adrs/0009-autorizacion-por-perfil-en-servidor.md)). | #2, #3 | — |
| 5 | Front conectado a la API | Login real contra `/api/hfc-login`, carga de datos, manejo de `401/403` (vuelta al login) y de `5xx` (aviso + Actualizar); `SERVIR_WEB=1` para desarrollo; E2E del tablero. | #1, #4 | — |
| 6 | CI/CD y despliegue | `.github/workflows/ci-cd.yml` (quality → e2e con SQL Server en contenedor → deploy → smoke), `deploy/desplegar.sh` con comando forzado y rollback, unidad systemd aislada, Nginx con cabeceras de seguridad y `limit_req` ([ADR-0008](../03-arquitectura/adrs/0008-despliegue-vps-nginx-systemd.md), [DEPLOY-PLAN](../09-deploy/DEPLOY-PLAN.md)). | #5 | Registro DNS `curso-hfc` → IP del VPS; secrets `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_HOST` en el environment `production`. |

**Nota de orden:** #1 y #2 no dependen entre sí y pueden hacerse en paralelo. #3 y #4 se pueden
probar con `curl` antes de que exista el #5.

**Riesgos aceptados fuera de este backlog:** R-08 (F5 obliga a reingresar), R-14 (token no
revocable antes de 10 h) y el límite de intentos por worker. Están en la sección «Riesgos
aceptados (POC)» del TECH-DESIGN v2: son decisiones de no-alcance, no omisiones.

## Cómo usar este backlog

Cada ítem es una spec independiente. Al implementarlo, arranca un ciclo de OpenSpec
(`/opsx:propose` → `/opsx:apply` → `/opsx:archive`) usando **este ítem** como el change, no el
proyecto completo. Si la columna «Contexto extra requerido» tiene algo, pásalo como contexto al
generar la spec. El agente `.claude/agents/spec-owner.md` lleva un ítem por el ciclo completo.
