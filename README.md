# Panel de Gestión HFC — una sola verdad para la operación

[![CI/CD](https://github.com/jdavilao21/curso-hfc/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/jdavilao21/curso-hfc/actions/workflows/ci-cd.yml)
![FastAPI](https://img.shields.io/badge/API-FastAPI-009688)
![SQL Server](https://img.shields.io/badge/DB-SQL%20Server-cc2927)
![Playwright](https://img.shields.io/badge/E2E-Playwright-2ead33)

**Demo:** https://curso-hfc.metadatape.com · datos **ficticios**

**Entrega del curso:** [`ENTREGA.md`](ENTREGA.md) — mensaje al profesor con los enlaces, los usuarios demo y los 9 entregables.

| Perfil | Usuario | Contraseña | Qué ve |
|---|---|---|---|
| Administrador | `ADMIN.DEMO` | `Admin#Hfc2026` | todo |
| Supervisor | `SUP.DEMO` | `Super#Hfc2026` | todo, con detalle por asesor |
| Cliente Claro | `CLIENTE.DEMO` | `Cliente#Hfc2026` | totales por supervisor, **sin** detalle por asesor |

Las contraseñas son públicas a propósito: la demo solo lee datos inventados y la base se regenera
en cada deploy. Tras 5 intentos fallidos en 15 minutos, el login se bloquea un rato (`429`).

En la campaña HFC (atención inbound de Claro Perú, operada por GEA Internacional), los
indicadores se armaban a mano en Excel: llegaban a media mañana y dos analistas podían dar dos
cifras distintas del mismo TNPS. Este panel muestra el nivel de servicio, el TMG, el TNPS y la
ocupación por **día, franja de 30 minutos, supervisor y asesor**, con el mismo cálculo para todos.

> Proyecto integrador del curso **Desarrollo AI-First con Claude**. Versión pública del tablero
> que la Jefatura de Planificación y Métricas usa en producción, rehecha con el pipeline
> documental (PRD → Design → Tech Design + ADRs → Backlog → Specs → Diagramas → Testing →
> Seguridad → Deploy) y con datos inventados.

## Para qué sirve

En un call center, la operación se mide cada media hora: si entran más llamadas de las previstas,
el nivel de servicio cae y los clientes abandonan; si un asesor tiene muchos detractores, el TNPS
del mes se resiente. Este panel junta esas cifras en un solo lugar para que cada perfil tome
decisiones con el mismo número:

| Quién lo usa | Para qué |
|---|---|
| **Jefatura y analistas** (Administrador) | Ver si la operación cumple las metas del contrato y preparar los reportes del cliente sin armar Excel a mano. |
| **Supervisores** | Detectar en qué franja se cayó el servicio y qué asesores necesitan coaching (cuartil crítico de TNPS, cortes, transferencias). |
| **Cliente Claro** | Seguir el cumplimiento de la campaña con totales por supervisor, sin ver datos personales de los asesores. |

Indicadores principales:

| KPI | Qué mide |
|---|---|
| **% Nivel de servicio** | Llamadas atendidas dentro del umbral de tiempo (meta ≥ 85 %). |
| **% Atención** | Llamadas atendidas sobre recibidas; el resto son abandonos (meta ≥ 95 %). |
| **TNPS** | % de promotores menos % de detractores en la encuesta posterior a la llamada. |
| **TMG** | Tiempo medio de gestión por llamada, comparado con el dimensionado. |
| **% Ocupación** | Tiempo hablando sobre tiempo productivo de los asesores. |
| **% CAT** | Llamadas cortadas por el asesor (corte agente). |

## Recorrido por el sistema

Capturas de la demo, con datos ficticios.

**1. Ingreso.** Se hace clic en la mascota y se entra con usuario y contraseña. El servidor
decide qué puede ver cada perfil.

![Pantalla de ingreso](docs/capturas/01-ingreso.png)

**2. Diario.** 9 tarjetas con el resultado del período: color según la meta, mini-gráfico de
tendencia y variación del último día contra el anterior. Se filtra por período, semana o rango (7, 14 o 31 días)
y debajo está la tabla día por día.

![Pestaña Diario](docs/capturas/02-diario.png)

**3. Intervalos.** Los mismos indicadores en franjas de 30 minutos para una fecha, con gráficos de
nivel de servicio, llamadas por franja y TMG real contra el dimensionado. Sirve para ver a qué hora
faltó gente.

![Pestaña Intervalos](docs/capturas/03-intervalos.png)

**4. Asesores.** Producción, TNPS, CAT, TMG y transferencias por asesor, con filtros de
supervisor, coordinador, condición laboral, modalidad y contrato. La tarjeta **Q4 · Crítico**
muestra cuántos asesores concentran los detractores. La pestaña **Supervisores** muestra lo mismo
agregado por equipo.

![Pestaña Asesores](docs/capturas/05-asesores.png)

**5. Vista del cliente.** El perfil Cliente Claro no tiene la pestaña Asesores y solo recibe
totales por supervisor. La restricción la aplica la API, así que tampoco se puede saltar desde el
navegador.

![Vista del perfil Cliente Claro](docs/capturas/06-cliente.png)

Además, cada tabla se descarga en **Excel** firmado por el área, y hay temas noche, día, iOS y
neón y un **Modo TV** con letra grande para pantallas.

## Arquitectura

```mermaid
flowchart LR
    U([Usuario]) --> NG{{"Nginx<br/>CSP · HSTS · limit_req"}}
    NG -- "/" --> WEB["web/ estático<br/>JS sin build · SRI"]
    NG -- "/api/*" --> API["FastAPI<br/>login · JWT · permisos por perfil"]
    API -- "curso_hfc_app<br/>(solo SELECT)" --> DB[(SQL Server<br/>BD_CURSO_HFC)]
    GH["GitHub Actions<br/>quality → e2e → deploy → smoke"] -- "SSH comando forzado" --> API
```

| Capa | Tecnología | Decisión |
|---|---|---|
| Front | HTML + JS (Chart.js, xlsx-js-style por CDN con SRI) | [ADR-0004](docs/03-arquitectura/adrs/0004-front-estatico-mismo-origen.md) |
| API | FastAPI + pyodbc, caché 60 s | [ADR-0003](docs/03-arquitectura/adrs/0003-contrato-api-post-estilo-webhook.md), [ADR-0006](docs/03-arquitectura/adrs/0006-api-fastapi-cache-memoria.md) |
| Datos | SQL Server, base y logins propios, semilla determinista | [ADR-0001](docs/03-arquitectura/adrs/0001-persistencia-sql-server-bd-propia.md), [0002](docs/03-arquitectura/adrs/0002-modelo-datos-grano-agregado.md), [0007](docs/03-arquitectura/adrs/0007-datos-ficticios-semilla-fija.md) |
| Seguridad | PBKDF2 + JWT HS256, permisos en el servidor, límite de intentos | [ADR-0005](docs/03-arquitectura/adrs/0005-autenticacion-propia-pbkdf2-jwt.md), [0009](docs/03-arquitectura/adrs/0009-autorizacion-por-perfil-en-servidor.md), [0010](docs/03-arquitectura/adrs/0010-limite-intentos-login.md) |
| Deploy | VPS Ubuntu, Nginx + systemd, GitHub Actions | [ADR-0008](docs/03-arquitectura/adrs/0008-despliegue-vps-nginx-systemd.md), [DEPLOY-PLAN](docs/09-deploy/DEPLOY-PLAN.md) |

## Cómo se construyó: el pipeline documental

| # | Paso | Documento |
|---|---|---|
| 01 | PRD | [`docs/01-producto/PRD.md`](docs/01-producto/PRD.md) |
| 02 | Design | [`docs/02-diseno/DESIGN.md`](docs/02-diseno/DESIGN.md) |
| 03 | Tech Design + ADRs | [`TECH-DESIGN-v1`](docs/03-arquitectura/TECH-DESIGN-v1.md) → revisión adversarial (15 hallazgos) → [`TECH-DESIGN` v2](docs/03-arquitectura/TECH-DESIGN.md) · [10 ADRs](docs/03-arquitectura/adrs/) |
| 04 | Backlog | [`docs/04-backlog/BACKLOG.md`](docs/04-backlog/BACKLOG.md) |
| 05 | Specs | [`openspec/`](openspec/) · [puente](docs/05-specs/README.md) |
| 06 | Diagramas | [`docs/06-diagramas/`](docs/06-diagramas/) |
| 07 | Testing | 25 E2E + 9 unitarios · [`docs/07-testing/`](docs/07-testing/README.md) |
| 08 | Seguridad | [`SECURITY-REPORT.md`](docs/08-seguridad/SECURITY-REPORT.md) (SP-01…SP-11) |
| 09 | Deploy | [`DEPLOY-PLAN.md`](docs/09-deploy/DEPLOY-PLAN.md) + [`ci-cd.yml`](.github/workflows/ci-cd.yml) |

El índice completo, con la trazabilidad de un requisito de punta a punta, está en
[`docs/README.md`](docs/README.md).

## Correr en local

```bash
# 1. SQL Server desechable
docker run -d --name hfc-sql -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='Una#Clave2026' \
  -p 127.0.0.1:14333:1433 mcr.microsoft.com/mssql/server:2022-latest
sqlcmd -S 127.0.0.1,14333 -U sa -C -i sql/01_crear_bd.sql -v CLAVE_APP='App#Local2026' CLAVE_CARGA='Carga#Local2026'

# 2. Dependencias y datos
python3 -m venv venv && venv/bin/pip install -r api/requirements.txt pytest
export DB_PORT=14333 CLAVE_ADMIN='Admin#Local2026' CLAVE_SUPERVISOR='Super#Local2026' CLAVE_CLIENTE='Cliente#Local2026'
DB_USER=curso_hfc_carga DB_PASSWORD='Carga#Local2026' venv/bin/python sql/semilla.py

# 3. API + web en http://127.0.0.1:8077 (entra con SUP.DEMO / Super#Local2026)
export DB_USER=curso_hfc_app DB_PASSWORD='App#Local2026' JWT_SECRET=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))")
(cd api && SERVIR_WEB=1 ../venv/bin/uvicorn main:app --port 8077)

# 4. Tests
(cd api && ../venv/bin/python -m pytest -q)
npm ci && npx playwright install chromium && PYTHON=venv/bin/python npm run test:e2e
```

## Estructura

```
web/        front estático (index.html, css/, js/, assets/)
api/        FastAPI: main.py · auth.py · db.py · tests/
sql/        01_crear_bd.sql · 02_esquema.sql · semilla.py
tests/      Playwright E2E
deploy/     desplegar.sh · curso-hfc-api.service · nginx-curso-hfc.conf · crear-bd.sh · preparar-vps.sh · terminar-vps.sh
docs/       pipeline 01…09          openspec/   specs vigentes y changes
.claude/    agentes del proyecto     skills/     skill agregar-kpi-hfc
```

---
Jefatura de Planificación y Métricas · GEA Internacional
