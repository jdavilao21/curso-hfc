# CLAUDE.md — Panel de Gestión HFC (demo del curso)

## 1. Contexto del proyecto

**Qué es.** Panel web de indicadores de la campaña **HFC** (atención inbound de Claro Perú,
operada por GEA Internacional): Diario, Intervalos de 30 min, Supervisores y Asesores, con
login por perfiles y exportación a Excel. Es la versión pública del tablero que la Jefatura de
Planificación y Métricas usa en producción, rehecha con el pipeline documental del curso
**Desarrollo AI-First con Claude** y con **datos ficticios**.

**Qué problema resuelve.** Los indicadores se armaban a mano en Excel, llegaban tarde y cada
analista calculaba distinto. El panel da una sola verdad, por día, franja y persona.

**Usuarios.** ADMINISTRADOR, SUPERVISOR y CLIENTE CLARO (este último sin detalle por asesor).

## 2. Mapa de documentación — leer antes de planificar

| Paso | Documento | Úsalo para |
|---|---|---|
| 01 | `docs/01-producto/PRD.md` | Alcance, **no alcance**, criterios de éxito, casos borde CB-01…CB-06 |
| 02 | `docs/02-diseno/DESIGN.md` | Tokens reales de `web/css/`, semáforo, tablas compactas, transición FLIP |
| 03 | `docs/03-arquitectura/TECH-DESIGN.md` + `adrs/` | Arquitectura, contrato de API, ADR-0001…0010, revisión adversarial R-01…R-15 |
| 04 | `docs/04-backlog/BACKLOG.md` | Ítems #1…#6 ordenados; cada ítem = un change de OpenSpec |
| 05 | `openspec/specs/` y `openspec/changes/` | Comportamiento vigente por capacidad y su historial |
| 06 | `docs/06-diagramas/` | Secuencia de ingreso/carga y flujo de CI/CD (Mermaid) |
| 07 | `tests/`, `api/tests/`, `docs/07-testing/README.md` | Qué cubre cada test y cómo correrlo |
| 08 | `docs/08-seguridad/SECURITY-REPORT.md` | SP-01…SP-11, aceptados y condiciones |
| 09 | `docs/09-deploy/DEPLOY-PLAN.md` | Pipeline, secretos, preparación del VPS, recovery |

Las skills del curso escriben por defecto en la raíz: **en este repo, guarda cada documento en
su carpeta de `docs/`**.

## 3. Arquitectura (resumen; detalle en el TECH-DESIGN)

- **Front estático sin build** (`web/`): `index.html` + JS numerado por orden de carga; Chart.js y
  xlsx-js-style por CDN **con SRI** (ADR-0004). Todos los KPI se calculan en el navegador (`02-engine.js`).
- **API FastAPI** (`api/`), mismo origen detrás de Nginx: `POST /api/hfc-login`,
  `/api/hfc-diario`, `/api/hfc-supervisores`, `GET /api/health` (ADR-0003, 0006).
- **SQL Server**, base `BD_CURSO_HFC`; la API usa `curso_hfc_app` (**solo SELECT**) (ADR-0001, 0002).
- **Login propio**: PBKDF2 + JWT HS256 con librería estándar (ADR-0005); límite de intentos y
  hash señuelo (ADR-0010); permisos por perfil **en el servidor** (ADR-0009).

```
web/            index.html · css/ · js/01-core.js (config, login, permisos, fetch 401) · 11-remote.js (carga)
api/main.py     rutas, _autorizar, PERMISOS, _agregar_por_supervisor, límite de intentos
api/auth.py     contraseñas y token        api/db.py   consultas fijas, caché 60 s, timeouts
sql/            01_crear_bd.sql (sa, una vez) · 02_esquema.sql (idempotente) · semilla.py (determinista)
deploy/         desplegar.sh (comando forzado) · curso-hfc-api.service · nginx-curso-hfc.conf
tests/          Playwright E2E          .github/workflows/ci-cd.yml   quality → e2e → deploy → smoke
```

## 4. Reglas duras

- **Lee `docs/01-producto/PRD.md` completo antes de planificar.** Si algo cae en «No alcance»
  (panel del asesor, Detalle TNPS, Horas, Oportunidades, Salientes, descargas registro por
  registro, ETL, sesión única, gestión de usuarios, tiempo real), **detente y consulta**.
- **Datos ficticios siempre.** Nunca copies datos, nombres, códigos de usuario, IPs, dominios
  internos ni URLs de n8n de producción a este repo. Antes de commitear cambios en `web/`, corre
  `grep -rnE "metadatape|gean8n|161\.132|E[0-9]{7}" web/` (debe salir vacío).
- **Toda decisión de arquitectura nueva o cambiada lleva un ADR** en `docs/03-arquitectura/adrs/`
  (numeración correlativa). No edites un ADR aceptado: crea uno que lo reemplace.
- **Los cambios de comportamiento pasan por OpenSpec**, un change por ítem de backlog.
- **La autorización se decide en la API** con el `perfil` del token (`PERMISOS` en `api/main.py`).
  Ocultar algo en el front no es seguridad.
- **SQL solo con consultas fijas en `api/db.py`**; si entra un dato del usuario, va como `?`.
- **Todo texto que venga de la API pasa por `limpiarTextos()`** antes de pintarse.
- **Ningún secreto en el repo.** Van en `/etc/curso-hfc/*.env` o en GitHub Secrets.
- **Un test de seguridad se acepta solo después de verlo fallar** contra el código vulnerable.
- **Commits sin atribución de IA** (sin `Co-Authored-By`), en español, en imperativo.

## 5. Comandos

```bash
cd api && python -m pytest -q                         # unitarios
npm run test:e2e                                      # E2E (ver docs/07-testing para la base)
DB_USER=… DB_PASSWORD=… JWT_SECRET=… SERVIR_WEB=1 uvicorn main:app --port 8077   # desde api/: web + API en local
```

## 6. Idioma y estilo

Español en código, comentarios, commits y docs. Código con la densidad de comentarios del
vecino. Preferencias de Jose para tableros: transición FLIP al filtrar, tablas compactas
(12.5/11 px), pie de página del área y firma en cada Excel.
