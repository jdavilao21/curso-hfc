#!/usr/bin/env bash
# preparar-vps.sh — pasos A4–A6 del DEPLOY-PLAN, una sola vez, como root:  sudo /opt/curso-hfc/deploy/preparar-vps.sh
# Requiere: A3 hecho (deploy/crear-bd.sh) y /etc/curso-hfc/{api,carga}.env.
# Toca solo cosas del curso (usuarios curso-hfc/deploy-curso, servicio curso-hfc-api, sitio curso-hfc.metadatape.com).
# Si `nginx -t` falla, retira el sitio nuevo y NO recarga Nginx: los demás sitios siguen igual.
set -euo pipefail

REPO=/opt/curso-hfc
DOMINIO=curso-hfc.metadatape.com
GH_REPO=jdavilao21/curso-hfc
paso() { echo; echo "== $*"; }

[[ $EUID -eq 0 ]] || { echo "Correr con sudo" >&2; exit 1; }
[[ -f /etc/curso-hfc/api.env && -f /etc/curso-hfc/carga.env ]] || { echo "Faltan /etc/curso-hfc/*.env" >&2; exit 1; }

paso "1/8 Usuarios de sistema"
id curso-hfc    >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin curso-hfc
id deploy-curso >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy-curso
# deploy-curso solo puede reiniciar SU servicio con sudo (SECURITY-REPORT SP-10)
echo 'deploy-curso ALL=(root) NOPASSWD: /usr/bin/systemctl restart curso-hfc-api' > /etc/sudoers.d/deploy-curso
chmod 440 /etc/sudoers.d/deploy-curso
visudo -cf /etc/sudoers.d/deploy-curso

paso "2/8 Secretos: cada usuario lee solo el suyo"
chmod 711 /etc/curso-hfc
chown root:curso-hfc    /etc/curso-hfc/api.env   && chmod 640 /etc/curso-hfc/api.env
chown root:deploy-curso /etc/curso-hfc/carga.env && chmod 640 /etc/curso-hfc/carga.env

paso "3/8 Código y entorno virtual"
rm -rf "$REPO"/node_modules "$REPO"/test-results "$REPO"/playwright-report "$REPO"/api/__pycache__ "$REPO"/api/.pytest_cache
chown -R deploy-curso:curso-hfc "$REPO"
chmod -R g+rX,o-rwx "$REPO"
chmod o+x "$REPO" && chmod -R o+rX "$REPO/web"          # Nginx (www-data) solo lee web/
git config --global --get-all safe.directory | grep -qx "$REPO" || git config --global --add safe.directory "$REPO"
[[ -x "$REPO/venv/bin/python" ]] || sudo -u deploy-curso python3 -m venv "$REPO/venv"
sudo -u deploy-curso "$REPO/venv/bin/pip" install -q -r "$REPO/api/requirements.txt"

paso "4/8 Esquema y datos ficticios"
sudo -u deploy-curso bash -c "set -a; . /etc/curso-hfc/carga.env; set +a; '$REPO/venv/bin/python' '$REPO/sql/semilla.py'"

paso "5/8 Servicio curso-hfc-api (127.0.0.1:8010)"
cp "$REPO/deploy/curso-hfc-api.service" /etc/systemd/system/curso-hfc-api.service
systemctl daemon-reload
systemctl enable --now curso-hfc-api
systemctl restart curso-hfc-api
for i in $(seq 1 15); do curl -fsS http://127.0.0.1:8010/api/health && break; sleep 2; done; echo
curl -fsS http://127.0.0.1:8010/api/health | grep -q '"ok":true' || { journalctl -u curso-hfc-api -n 30 --no-pager; exit 1; }

paso "6/8 Sitio Nginx"
cp "$REPO/deploy/nginx-curso-hfc.conf" "/etc/nginx/sites-available/$DOMINIO"
ln -sf "/etc/nginx/sites-available/$DOMINIO" "/etc/nginx/sites-enabled/$DOMINIO"
if ! nginx -t; then
  rm -f "/etc/nginx/sites-enabled/$DOMINIO"
  echo "nginx -t falló: retiré el sitio nuevo y NO recargué Nginx" >&2; exit 1
fi
systemctl reload nginx
certbot --nginx -d "$DOMINIO" --non-interactive --redirect || echo "!! certbot falló: el sitio queda en http; revisar y repetir certbot"

paso "7/8 Llave de despliegue (comando forzado) y secrets de GitHub"
TMP=$(mktemp -d); trap 'shred -u "$TMP"/k 2>/dev/null; rm -rf "$TMP"' EXIT
ssh-keygen -q -t ed25519 -N '' -C "github-actions $GH_REPO" -f "$TMP/k"
install -d -m 700 -o deploy-curso -g deploy-curso /home/deploy-curso/.ssh
echo "command=\"$REPO/deploy/desplegar.sh\",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding $(cat "$TMP/k.pub")" \
  > /home/deploy-curso/.ssh/authorized_keys
chown deploy-curso:deploy-curso /home/deploy-curso/.ssh/authorized_keys && chmod 600 /home/deploy-curso/.ssh/authorized_keys
gh api -X PUT "repos/$GH_REPO/environments/production" >/dev/null
gh secret set DEPLOY_SSH_KEY     --repo "$GH_REPO" --env production < "$TMP/k"
ssh-keyscan -t ed25519 "$DOMINIO" 2>/dev/null | gh secret set DEPLOY_KNOWN_HOSTS --repo "$GH_REPO" --env production
gh secret set DEPLOY_HOST        --repo "$GH_REPO" --env production --body "$DOMINIO"
# la llave privada solo queda en GitHub: el trap la borra con shred

paso "8/8 Prueba del comando forzado y activación del deploy"
SHA=$(git -C "$REPO" rev-parse HEAD)
sudo -u deploy-curso env SSH_ORIGINAL_COMMAND="cat /etc/shadow" "$REPO/deploy/desplegar.sh" && echo "!! debía rechazarse" || echo "ok: comando arbitrario rechazado"
sudo -u deploy-curso env SSH_ORIGINAL_COMMAND="$SHA" "$REPO/deploy/desplegar.sh"
gh variable set DEPLOY_ENABLED --repo "$GH_REPO" --body true

echo; echo "== Listo: https://$DOMINIO — avísale a Claude para la prueba final."
