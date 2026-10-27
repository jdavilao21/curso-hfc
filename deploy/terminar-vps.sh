#!/usr/bin/env bash
# terminar-vps.sh — completa A6 cuando preparar-vps.sh se cortó después de Certbot (2026-10-27).
# Una vez, como root:  sudo /opt/curso-hfc/deploy/terminar-vps.sh
# 1) Repite las cabeceras de seguridad en el location .html del sitio YA certificado (sin pisar lo que agregó Certbot).
# 2) Llave de deploy con comando forzado + secrets de GitHub.  3) Prueba el comando forzado, primer deploy y activa el CI/CD.
set -euo pipefail
trap 'echo; echo "!! ERROR en la línea $LINENO: $BASH_COMMAND" >&2' ERR

REPO=/opt/curso-hfc
DOMINIO=curso-hfc.metadatape.com
GH_REPO=jdavilao21/curso-hfc
SITIO=/etc/nginx/sites-available/$DOMINIO
paso() { echo; echo "== $*"; }
[[ $EUID -eq 0 ]] || { echo "Correr con sudo" >&2; exit 1; }

paso "1/4 Cabeceras de seguridad en las páginas .html"
if [[ $(grep -c "Strict-Transport-Security" "$SITIO") -ge 2 ]]; then   # 1 del server + 1 del location .html
  echo "ya estaban"
else
  cp "$SITIO" "$SITIO.antes-terminar"
  python3 - "$SITIO" <<'EOF'
import sys
p = sys.argv[1]; s = open(p).read()
old = '        add_header X-Content-Type-Options "nosniff" always;\n        try_files $uri =404;'
new = ('        add_header X-Content-Type-Options "nosniff" always;\n'
       '        add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n'
       '        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;\n'
       '        add_header Strict-Transport-Security "max-age=31536000" always;\n'
       '        try_files $uri =404;')
assert s.count(old) == 1, "no encontré el bloque .html esperado"
open(p, 'w').write(s.replace(old, new))
EOF
  if nginx -t; then systemctl reload nginx; else cp "$SITIO.antes-terminar" "$SITIO"; echo "nginx -t falló: dejé el sitio como estaba" >&2; exit 1; fi
fi

paso "2/4 Llave de despliegue (comando forzado)"
TMP=$(mktemp -d)
trap 'shred -u "$TMP"/k 2>/dev/null || true; rm -rf "$TMP"' EXIT
ssh-keygen -q -t ed25519 -N '' -C "github-actions $GH_REPO" -f "$TMP/k"
install -d -m 700 -o deploy-curso -g deploy-curso /home/deploy-curso/.ssh
echo "command=\"$REPO/deploy/desplegar.sh\",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding $(cat "$TMP/k.pub")" \
  > /home/deploy-curso/.ssh/authorized_keys
chown deploy-curso:deploy-curso /home/deploy-curso/.ssh/authorized_keys
chmod 600 /home/deploy-curso/.ssh/authorized_keys
echo "authorized_keys listo"

paso "3/4 Secrets del environment production en GitHub"
gh api -X PUT "repos/$GH_REPO/environments/production" >/dev/null
gh secret set DEPLOY_SSH_KEY --repo "$GH_REPO" --env production < "$TMP/k"
# Desde dentro del VPS el nombre público no llega a este equipo: la huella se toma de 127.0.0.1 y se rotula con el dominio.
HUELLA=$(ssh-keyscan -t ed25519 127.0.0.1 2>/dev/null | awk -v d="$DOMINIO" '{ $1 = d; print }')
[[ -n "$HUELLA" ]] || { echo "ssh-keyscan no devolvió la huella" >&2; exit 1; }
gh secret set DEPLOY_KNOWN_HOSTS --repo "$GH_REPO" --env production --body "$HUELLA"
gh secret set DEPLOY_HOST --repo "$GH_REPO" --env production --body "$DOMINIO"
gh secret list --repo "$GH_REPO" --env production

paso "4/4 Prueba del comando forzado, primer deploy y activación"
chown -R deploy-curso:curso-hfc "$REPO"
if sudo -u deploy-curso env SSH_ORIGINAL_COMMAND="cat /etc/shadow" "$REPO/deploy/desplegar.sh"; then
  echo "!! el comando arbitrario NO se rechazó" >&2; exit 1
fi
echo "ok: comando arbitrario rechazado"
sudo -u deploy-curso git -C "$REPO" fetch -q origin main
SHA=$(sudo -u deploy-curso git -C "$REPO" rev-parse origin/main)
sudo -u deploy-curso env SSH_ORIGINAL_COMMAND="$SHA" "$REPO/deploy/desplegar.sh"
gh variable set DEPLOY_ENABLED --repo "$GH_REPO" --body true

echo; echo "== LISTO (todos los pasos). Avísale a Claude para la prueba del pipeline completo."
