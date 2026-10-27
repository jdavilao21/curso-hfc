# Deploy Plan — Panel de Gestión HFC (demo del curso)

Fecha: 2026-10-26 · Última actualización: **27-oct-2026**
Estado: EJECUTADO. A1–A6 hechos y pipeline completo en verde desde el 27-oct-2026
(ver «Registro de ejecución y verificación»).

Consume: código, tests ([`07-testing`](../07-testing/README.md)) y
[`SECURITY-REPORT`](../08-seguridad/SECURITY-REPORT.md).

## Resumen del proyecto

- Front estático (`web/`) + API FastAPI (`api/`) + SQL Server (`BD_CURSO_HFC`), un solo repo
  público (`jdavilao21/curso-hfc`), rama `main`.
- Tests: 9 unitarios (pytest) + 25 E2E (Playwright) que necesitan SQL Server.
- Producción: el VPS Ubuntu de GEA, el mismo que corre los tableros reales (ATC, HFC, Cross…).
  Hoy esos tableros se despliegan a mano por MobaXterm, sin puertas: un test roto llega a producción.

## Sistema de deployment propuesto

### Build
No hay build del front (ADR-0004). La "construcción" es instalar dependencias de forma
determinista: `pip install -r api/requirements.txt` (versiones fijas) y `npm ci` (lockfile) solo
para Playwright.

### Artifact
El **commit SHA** de `main` que pasó `quality` y `e2e`. El servidor hace `git checkout --detach
<SHA>`: lo desplegado es exactamente lo probado, y el SHA queda visible en el log del deploy.

### Config & Secrets

| Dato | Tipo | Dónde vive |
|---|---|---|
| `DB_*` de `curso_hfc_app`, `JWT_SECRET`, ajustes | secret | VPS: `/etc/curso-hfc/api.env` (root:curso-hfc, 640) |
| `DB_*` de `curso_hfc_carga`, `CLAVE_ADMIN/SUPERVISOR/CLIENTE` | secret | VPS: `/etc/curso-hfc/carga.env` (root:deploy-curso, 640) |
| `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_HOST` | secret | GitHub → Environment `production` |
| Claves de CI (`Ci#…`) | config de prueba | En el workflow: solo valen dentro del contenedor efímero |
| Clave de `sa` | secret | **Nunca** en el VPS en archivos ni en GitHub: se usa una vez, a mano |

Regla: ningún secreto de producción entra a GitHub. CI nunca ve la base del VPS.

### Infraestructura
Sin infraestructura nueva (PRD): Nginx + Certbot + systemd + SQL Server existentes. Se agregan:
el usuario de sistema `curso-hfc` (corre la API), el usuario `deploy-curso` (recibe el deploy),
el servicio `curso-hfc-api` (puerto 8010), el sitio Nginx `curso-hfc.metadatape.com` y la base `BD_CURSO_HFC`.

### Acciones de GitHub (✅ 27-oct-2026)

El workflow [`ci-cd.yml`](../../.github/workflows/ci-cd.yml) usa solo acciones oficiales de la
organización `actions/`, fijadas por versión mayor. Todas corren en **Node 24**:

| Acción | Jobs | Antes | Ahora | Runtime (`runs.using` del `action.yml`) |
|---|---|---|---|---|
| `actions/checkout` | `quality`, `e2e` | `v4` | `v7` | `node24` |
| `actions/setup-python` | `quality`, `e2e` | `v5` | `v7` | `node24` |
| `actions/setup-node` | `quality`, `e2e` | `v4` | `v7` | `node24` |
| `actions/upload-artifact` | `e2e` (solo si falla) | `v4` | `v7` | `node24` |

Commit `952a814`. Los jobs `deploy` y `smoke` no usan acciones: hacen `ssh` y `curl`.

**Por qué:** GitHub marcó Node 20 como obsoleto y ya forzaba esas acciones a Node 24, con un aviso en
cada run (aviso visto en el run 40453178208). `upload-artifact@v4` no salía en el aviso porque solo
corre cuando falla un E2E, pero también usaba Node 20.

**Cambios incompatibles revisados** (notas de versión de v5 a v7, ninguno nos afecta):
- `setup-node` v5+ activa la caché de npm solo si `package.json` declara `packageManager`.
  El nuestro no lo declara: el comportamiento no cambia.
- `checkout` v6 guarda las credenciales en un archivo aparte; ningún paso las lee.
- `upload-artifact` v7 agrega `archive: false` (opcional) y pasa a ESM; con `path:` de carpeta funciona igual.
- Todas piden runner ≥ 2.327.1: los runners de GitHub (`ubuntu-24.04`) ya lo cumplen.

**Para revisar en el futuro:** el aviso «Node.js NN is deprecated» en las *Annotations* del run, o
`gh api repos/actions/<acción>/releases/latest -q .tag_name`. Revertir: `git revert 952a814`.

### Entornos
- **CI**: runner de GitHub + SQL Server 2022 en contenedor, API en el mismo runner (`SERVIR_WEB=1`).
- **Producción**: VPS. Sin staging: es una demo de datos ficticios con un solo responsable.

### Estrategia de release
**Release directo** desde `main` cuando pasan las puertas, con **rollback automático** si el
`health` falla. Sin canary: tráfico mínimo.

### Data & Migrations
`02_esquema.sql` es idempotente (`IF OBJECT_ID … IS NULL`, `CREATE OR ALTER VIEW`) y
`semilla.py` reemplaza los datos en una transacción en **cada** deploy. No hay datos que
preservar: la base vuelve a un estado conocido. Un cambio de esquema que no sea aditivo (borrar
o renombrar columnas) exige un `DROP` explícito en el script y un ADR.

### Deploy gates

| Puerta | Job | Falla si… |
|---|---|---|
| Unitarias | `quality` | algún test de `api/tests/` falla |
| Sintaxis | `quality` | `py_compile` o `node --check` de `web/js/*.js` fallan |
| Secretos | `quality` | `git grep` encuentra `PASSWORD=`, `SECRET=` o `CLAVE_…=` con valor |
| Dependencias | `quality` | (informativa) `pip-audit` |
| E2E | `e2e` | cualquiera de los 25 tests falla |
| Rama | `deploy` | no es `push` a `main`, o la variable `DEPLOY_ENABLED` no es `true` |
| SHA | `desplegar.sh` | no tiene 40 hex o no está en `origin/main` |
| Salud | `desplegar.sh` | `/api/health` no responde en 30 s → rollback |

### Verify & Observe
- Job `smoke` desde GitHub: `/api/health` → `{"ok":true}`, `<title>` de la página, cabecera CSP
  y `hfc-diario` sin token = `401`.
- Logs: `journalctl -u curso-hfc-api` (logins aceptados y rechazados con usuario e IP, nunca la
  contraseña; tokens rechazados con el motivo; errores de base con traza).

### Recovery
- **Automático**: `trap ERR` en `desplegar.sh` vuelve al commit anterior y reinicia.
- **Manual**: `git revert` del commit en `main` → el pipeline vuelve a desplegar. De emergencia,
  en el VPS: `sudo -u deploy-curso /opt/curso-hfc/deploy/desplegar.sh` con el SHA bueno vía
  `SSH_ORIGINAL_COMMAND`, o `systemctl stop curso-hfc-api` (la demo cae, producción no se toca).

## Preparación única en el VPS (una vez, a mano, con root)

Automatizada en [`deploy/crear-bd.sh`](../../deploy/crear-bd.sh) (A3) y [`deploy/preparar-vps.sh`](../../deploy/preparar-vps.sh) (A4–A6). `preparar-vps.sh` se cortó después de Certbot; lo que faltaba de A5–A6 lo completó [`deploy/terminar-vps.sh`](../../deploy/terminar-vps.sh). Los corre Jose: crear usuarios y permisos `sudo` en el servidor de producción es una decisión suya, no del agente. Detalle de lo que hacen:

```bash
# 1. DNS: registro A curso-hfc.metadatape.com → IP del VPS (lo crea Jose en su proveedor)

# 2. Usuarios de sistema
useradd --system --no-create-home --shell /usr/sbin/nologin curso-hfc
useradd --create-home --shell /bin/bash deploy-curso
echo 'deploy-curso ALL=(root) NOPASSWD: /usr/bin/systemctl restart curso-hfc-api' > /etc/sudoers.d/deploy-curso
chmod 440 /etc/sudoers.d/deploy-curso && visudo -c

# 3. Código y entorno virtual (propiedad de deploy-curso, lectura para curso-hfc)
git clone https://github.com/jdavilao21/curso-hfc.git /opt/curso-hfc
chown -R deploy-curso:curso-hfc /opt/curso-hfc && chmod -R g+rX,o-rwx /opt/curso-hfc
chmod o+x /opt/curso-hfc && chmod -R o+rX /opt/curso-hfc/web     # Nginx (www-data) solo lee web/
sudo -u deploy-curso python3 -m venv /opt/curso-hfc/venv
sudo -u deploy-curso /opt/curso-hfc/venv/bin/pip install -r /opt/curso-hfc/api/requirements.txt

# 4. Base de datos: Jose corre esto y escribe la clave de sa sin que se muestre ni se guarde
#    (lee las claves de los logins de /etc/curso-hfc/*.env, que deben existir antes: paso 5)
sudo /opt/curso-hfc/deploy/crear-bd.sh

# 5. Secretos
install -d -m 750 -o root -g root /etc/curso-hfc
#   api.env (curso_hfc_app + JWT_SECRET) → root:curso-hfc 640
#   carga.env (curso_hfc_carga + CLAVE_*) → root:deploy-curso 640

# 6. Semilla, servicio, Nginx, certificado
sudo -u deploy-curso bash -c 'set -a; . /etc/curso-hfc/carga.env; /opt/curso-hfc/venv/bin/python /opt/curso-hfc/sql/semilla.py'
cp /opt/curso-hfc/deploy/curso-hfc-api.service /etc/systemd/system/ && systemctl daemon-reload && systemctl enable --now curso-hfc-api
cp /opt/curso-hfc/deploy/nginx-curso-hfc.conf /etc/nginx/sites-available/curso-hfc.metadatape.com
ln -s /etc/nginx/sites-available/curso-hfc.metadatape.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx          # si nginx -t falla, NO recargar: los demás sitios siguen igual
certbot --nginx -d curso-hfc.metadatape.com

# 7. Llave de deploy (la privada va a GitHub Secrets y se borra del VPS)
ssh-keygen -t ed25519 -N '' -C 'github-actions curso-hfc' -f /tmp/deploy_curso
echo "command=\"/opt/curso-hfc/deploy/desplegar.sh\",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding $(cat /tmp/deploy_curso.pub)" \
  | install -D -m 600 -o deploy-curso /dev/stdin /home/deploy-curso/.ssh/authorized_keys
ssh-keyscan -t ed25519 <host>    # → DEPLOY_KNOWN_HOSTS
```

## Decisiones tomadas

- **VPS propio y no un PaaS** (ADR-0008): la base está en el VPS y no se expone el 1433.
- **SQL Server en contenedor para CI**: mismo motor que producción, sin tocar la base real.
- **La semilla corre en cada deploy**: más simple que migraciones versionadas, porque no hay
  datos que preservar.
- **Comando forzado** en lugar de una llave con consola (SP-10).

## Fuera de alcance de esta pasada

- Monitoreo con alertas (Grafana ya existe en el VPS; queda como mejora).
- Backups de `BD_CURSO_HFC`: se regenera entera con `semilla.py`.
- Protección de rama `main` (requiere decidir si Jose trabaja con PRs).

## Autorizaciones

Pasos que **cambian el VPS de producción** y que se ejecutan solo con el OK explícito de Jose:

| # | Acción | Estado |
|---|---|---|
| A1 | Crear el repo público `jdavilao21/curso-hfc` y hacer push | ✅ Hecho (2026-10-26) |
| A2 | Registro DNS `curso-hfc` | ✅ Hecho por Jose (resuelve a la IP del VPS) |
| A3 | Crear `BD_CURSO_HFC` y sus logins (clave de `sa`) | ✅ Hecho por Jose con `crear-bd.sh` (2026-10-27) |
| A4 | Usuarios `curso-hfc` / `deploy-curso`, sudoers, servicio systemd | ✅ Hecho por Jose con `preparar-vps.sh` (2026-10-27) |
| A5 | Sitio Nginx + Certbot | ✅ Hecho por Jose con `preparar-vps.sh`; cabeceras del `.html` con `terminar-vps.sh` (2026-10-27) |
| A6 | Llave de deploy y secrets del environment `production` | ✅ Hecho por Jose con `terminar-vps.sh` (2026-10-27) |

## Registro de ejecución y verificación

| Fecha | Paso | Resultado |
|---|---|---|
| 2026-10-26 | CI simulado en local: SQL Server 2022 en Docker, `01_crear_bd.sql`, `semilla.py` ×3 | OK: 24 asesores, 1.098 filas día × franja, 4 usuarios |
| 2026-10-26 | `pytest` | 9/9 |
| 2026-10-26 | `npx playwright test` | 25/25 |
| 2026-10-26 | Permisos: `INSERT` con `curso_hfc_app` | Rechazado (`Msg 229`) |
| 2026-10-26 | `CHECK CK_KPI_ATENDIDAS` con una fila incoherente | Rechazado (`Msg 547`) |
| 2026-10-26 | `pip-audit` / `npm audit` | 0 / 0 vulnerabilidades |
| 2026-10-26 | Primer run de GitHub Actions | ❌ YAML inválido: `name:` con «: » sin comillas en el paso de deploy |
| 2026-10-26 | Segundo run (corregido) | ✅ quality y e2e (25/25 contra SQL Server en contenedor); deploy y smoke omitidos (`DEPLOY_ENABLED` sin activar) |
| 2026-10-26 | `deploy/crear-bd.sh` probado contra SQL Server en Docker con las claves reales de `/etc/curso-hfc` | ✅ crea la base y ambos logins entran |
| 2026-10-27 | A3 en el VPS: `crear-bd.sh` | ✅ base creada; `curso_hfc_app` solo con `SELECT` y sin acceso a las bases de producción |
| 2026-10-27 | A4–A5: `preparar-vps.sh` | ✅ usuarios, sudoers, servicio `curso-hfc-api` activo, semilla, sitio y certificado; ⚠️ el script se cortó después de Certbot |
| 2026-10-27 | Revisión del sitio con `curl --resolve` a 127.0.0.1 | ✅ health, CSP, 301 http→https, 401 sin token, 404 en `.git`/`sql`/`api`; el cliente recibe 182 filas sin nombres de asesor. ❌ las páginas `.html` no traían HSTS, Referrer-Policy ni Permissions-Policy (un `add_header` dentro del `location` anula los del `server`) |
| 2026-10-27 | A5–A6: `terminar-vps.sh` | ✅ cabeceras repetidas en el `location .html` (`nginx -t` ok), llave con comando forzado, 3 secrets en `production`, comando arbitrario rechazado, primer deploy manual y `DEPLOY_ENABLED=true` |
| 2026-10-27 | Primer pipeline completo (run 40453178208, commit `22f85a0`) | ✅ quality 25 s · e2e 1 min 40 s · deploy por SSH 11 s · smoke 5 s; el VPS quedó en `22f85a0` |
| 2026-10-27 | Login en producción con los 3 usuarios demo | ✅ Administrador, Supervisor y Cliente Claro |
| 2026-10-27 | Acciones a `v7` / Node 24 (run 40454151335, commit `952a814`) | ✅ quality 23 s · e2e 1 min 37 s · deploy 12 s · smoke 7 s; sin el aviso de Node 20. `upload-artifact@v7` no se ejecutó (solo corre si falla un E2E) |
