# Deploy Plan — Panel de Gestión HFC (demo del curso)

Fecha: 2026-10-26
Estado: GENERADO y verificado en local (CI simulado con SQL Server en Docker); EXECUTE pendiente
de las autorizaciones de la sección «Autorizaciones».

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

# 4. Base de datos (clave de sa a mano, una sola vez)
sqlcmd -S 127.0.0.1 -U sa -C -i /opt/curso-hfc/sql/01_crear_bd.sql -v CLAVE_APP='…' CLAVE_CARGA='…'

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
| A3 | Crear `BD_CURSO_HFC` y sus logins (clave de `sa`) | Pendiente (Jose) |
| A4 | Usuarios `curso-hfc` / `deploy-curso`, sudoers, servicio systemd | Pendiente |
| A5 | Sitio Nginx + Certbot | Pendiente |
| A6 | Llave de deploy y secrets del environment `production` | Pendiente |

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
