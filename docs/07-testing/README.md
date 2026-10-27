# 07 — Testing

Los tests viven en el código, no en esta carpeta: E2E en [`tests/`](../../tests/) (Playwright) y
unitarios junto al módulo que prueban ([`api/tests/`](../../api/tests/), pytest).

## Qué se cubre y por qué

Cada test prueba un **criterio de éxito o un caso borde del [PRD](../01-producto/PRD.md)**, o
un hallazgo de la revisión adversarial o del [SECURITY-REPORT](../08-seguridad/SECURITY-REPORT.md).
No prueba detalles de implementación.

| Test | Archivo | Origen |
|---|---|---|
| Un supervisor entra y ve las cuatro pestañas con datos | `tests/login.spec.js` | Criterio 1 |
| Clave incorrecta muestra el aviso y no entra | `tests/login.spec.js` | Criterio 2 |
| Un usuario dado de baja no entra aunque la clave sea correcta | `tests/login.spec.js` | Criterio 2 |
| Campos vacíos se avisan sin llamar a la API | `tests/login.spec.js` | Spec `acceso` |
| El usuario se normaliza a mayúsculas | `tests/login.spec.js` | CB-05 · R-06 |
| El perfil CLIENTE CLARO no ve la pestaña Asesores (y sí Supervisores) | `tests/login.spec.js` | Criterio 3 |
| Salir vuelve al login y limpia los campos | `tests/login.spec.js` | Spec `acceso` |
| Sesión vencida: al actualizar vuelve al login con el aviso | `tests/login.spec.js` | CB-01 |
| Diario abre en el último período con datos | `tests/tablero.spec.js` | Spec `tablero` |
| Cambiar de período recalcula las tarjetas | `tests/tablero.spec.js` | Criterio 4 |
| Intervalos muestra una fila por franja (08:00–16:30) | `tests/tablero.spec.js` | Alcance: Intervalos |
| Supervisores lista a los tres supervisores | `tests/tablero.spec.js` | Alcance: Supervisores |
| Asesores filtra por supervisor | `tests/tablero.spec.js` | Alcance: Asesores · CB-04 |
| Exportar Diario descarga un Excel | `tests/tablero.spec.js` | Criterio 5 |
| Un nombre con HTML en la nómina se muestra como texto | `tests/tablero.spec.js` | CB-06 · SP-08 |
| La API caída muestra un aviso en vez de una pantalla vacía | `tests/tablero.spec.js` | CB-03 · R-09 |
| Sin token responde 401 | `tests/api-seguridad.spec.js` | Criterio 6 |
| Token con la firma alterada / con `alg=none` responde 401 | `tests/api-seguridad.spec.js` | R-04 · SP-01 |
| Con token válido devuelve el contrato y atendidas + abandonadas = recibidas en **cada fila** | `tests/api-seguridad.spec.js` | Criterio 7 · ADR-0003 |
| CLIENTE CLARO recibe Supervisores agregado, con los mismos totales | `tests/api-seguridad.spec.js` | Criterio 3 · R-01 · ADR-0009 |
| El login no revela si el usuario existe | `tests/api-seguridad.spec.js` | R-07 · SP-03 |
| Inyección SQL en el usuario no entra | `tests/api-seguridad.spec.js` | SP-02 |
| Cinco intentos fallidos bloquean al sexto con 429 | `tests/api-seguridad.spec.js` | CB-02 · ADR-0010 |
| La documentación automática de FastAPI no está expuesta | `tests/api-seguridad.spec.js` | ADR-0003 |
| Contraseñas, token (ida y vuelta, vencido, alterado, `alg=none`, secreto corto) | `api/tests/test_auth.py` (9, unitarios) | ADR-0005 |

**Total:** 25 E2E + 9 unitarios.

**Un test que se probó a sí mismo.** El de CB-06 se escribió primero apuntando a un `onclick` que
resultó no ser explotable, y **pasaba también con el filtro desactivado**. Por eso se corrigió:
hoy inyecta `<img onerror>` en `NOMBRE_ASESOR` y se verificó que **falla** sin `limpiarTextos()`
(76 imágenes inyectadas) y pasa con el filtro. Regla del proyecto: un test de seguridad se
acepta solo después de verlo fallar contra el código vulnerable.

## Cómo correrlos

```bash
# Unitarios (sin base de datos)
cd api && python -m pytest -q

# E2E: necesitan una BD_CURSO_HFC con la semilla (ver sql/) y las variables de .env.example
export DB_SERVER=127.0.0.1 DB_PORT=1433 DB_USER=curso_hfc_app DB_PASSWORD=… JWT_SECRET=…
export CLAVE_ADMIN=… CLAVE_SUPERVISOR=… CLAVE_CLIENTE=…
npm ci && npx playwright install chromium
npm run test:e2e        # levanta la API con SERVIR_WEB=1 en :8077
```

Para una base local desechable, igual que el CI:

```bash
docker run -d --name hfc-sql -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='…' -p 127.0.0.1:14333:1433 \
  mcr.microsoft.com/mssql/server:2022-latest
sqlcmd -S 127.0.0.1,14333 -U sa -C -i sql/01_crear_bd.sql -v CLAVE_APP='…' CLAVE_CARGA='…'
DB_PORT=14333 DB_USER=curso_hfc_carga DB_PASSWORD='…' python sql/semilla.py
```

Los E2E **solo leen**: no modifican la base, así que se pueden repetir. En CI corren contra un
SQL Server en contenedor efímero, nunca contra la base del VPS (ver
[`09-deploy`](../09-deploy/DEPLOY-PLAN.md)). Si un test falla, `playwright-report/` tiene el
trace y la captura (`npx playwright show-report`); en CI se sube como artefacto.
