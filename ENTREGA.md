# Entrega — Proyecto integrador del curso Desarrollo AI-First con Claude

> Mensaje de entrega al profesor Mario Yahuarcani. 27-oct-2026.

Profesor Mario Yahuarcani, buenas tardes:

Le comparto mi proyecto integrador del curso **Desarrollo AI-First con Claude**: el **Panel de Gestión HFC**, un tablero de indicadores de una campaña de atención inbound (nivel de servicio, TMG, TNPS y ocupación por día, franja de 30 minutos, supervisor y asesor). Todos los datos son ficticios.

- **Demo:** https://curso-hfc.metadatape.com
- **Repositorio:** https://github.com/jdavilao21/curso-hfc
- **Índice de documentos:** [`docs/README.md`](docs/README.md)

Usuarios de prueba (uno por perfil):

| Perfil | Usuario | Contraseña | Qué ve |
|---|---|---|---|
| Administrador | `ADMIN.DEMO` | `Admin#Hfc2026` | todo |
| Supervisor | `SUP.DEMO` | `Super#Hfc2026` | todo, con detalle por asesor |
| Cliente Claro | `CLIENTE.DEMO` | `Cliente#Hfc2026` | totales por supervisor, sin el detalle por asesor |

Seguí el pipeline del repositorio de referencia, en la carpeta `docs/`:
PRD → Design → Tech Design + ADRs → Backlog → Specs → Diagramas → Testing → Seguridad → Deploy.

Lo más importante:

- **Tech Design en dos versiones:** la v1 pasó por una revisión adversarial con un subagente (15 hallazgos) y la v2 los resuelve, con 10 ADRs. El hallazgo más grave era que el perfil Cliente podía ver el detalle por asesor; ahora el servidor lo bloquea, aunque se llame a la API directamente.
- **Specs con OpenSpec:** los 6 ítems del backlog se trabajaron como changes (los 6 archivados) y hay 6 specs vigentes.
- **Pruebas:** 9 unitarias (pytest) y 25 E2E (Playwright) contra SQL Server en contenedor.
- **Seguridad:** reporte con 11 puntos (SP-01 a SP-11): contraseñas con PBKDF2, token JWT, permisos por perfil en el servidor, límite de intentos de login y cabeceras CSP y HSTS.
- **Deploy:** GitHub Actions con 4 pasos (calidad → E2E → deploy por SSH → prueba en producción). Cada push a `main` que pasa las pruebas se publica solo, y vuelve atrás automáticamente si la API no responde.
- **Además:** `CLAUDE.md`, 3 agentes del proyecto (developer, spec-owner, code-reviewer) y una skill propia (`agregar-kpi-hfc`).

## Entregables

| # | Paso | Documento |
|---|---|---|
| 01 | PRD | [`docs/01-producto/PRD.md`](docs/01-producto/PRD.md) |
| 02 | Design | [`docs/02-diseno/DESIGN.md`](docs/02-diseno/DESIGN.md) |
| 03 | Tech Design + ADRs | [`TECH-DESIGN-v1`](docs/03-arquitectura/TECH-DESIGN-v1.md) → revisión → [`TECH-DESIGN`](docs/03-arquitectura/TECH-DESIGN.md) · [10 ADRs](docs/03-arquitectura/adrs/) |
| 04 | Backlog | [`docs/04-backlog/BACKLOG.md`](docs/04-backlog/BACKLOG.md) |
| 05 | Specs | [`openspec/`](openspec/) · [puente con el backlog](docs/05-specs/README.md) |
| 06 | Diagramas | [`docs/06-diagramas/`](docs/06-diagramas/) |
| 07 | Testing | [`docs/07-testing/README.md`](docs/07-testing/README.md) |
| 08 | Seguridad | [`docs/08-seguridad/SECURITY-REPORT.md`](docs/08-seguridad/SECURITY-REPORT.md) |
| 09 | Deploy | [`docs/09-deploy/DEPLOY-PLAN.md`](docs/09-deploy/DEPLOY-PLAN.md) + [`ci-cd.yml`](.github/workflows/ci-cd.yml) |

Quedo atento a sus comentarios.

Saludos,
Jose Davila

---
Jefatura de Planificación y Métricas · GEA Internacional
