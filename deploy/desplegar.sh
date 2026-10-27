#!/usr/bin/env bash
# desplegar.sh — único camino a producción (DEPLOY-PLAN §4). Lo ejecuta el job `deploy` de GitHub Actions por SSH
# como el usuario `deploy-curso`, cuya llave en authorized_keys tiene forzado este comando:
#   command="/opt/curso-hfc/deploy/desplegar.sh",no-pty,no-port-forwarding,no-agent-forwarding ssh-ed25519 AAAA…
# Así la llave de GitHub no abre una consola: solo puede correr este script.
# Recibe el commit a desplegar en SSH_ORIGINAL_COMMAND (lo valida: 40 caracteres hexadecimales).
set -euo pipefail

REPO=/opt/curso-hfc
SHA="${SSH_ORIGINAL_COMMAND:-}"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "commit inválido: '$SHA'" >&2; exit 2; }

cd "$REPO"
ANTERIOR=$(git rev-parse HEAD)
echo "== desplegando $SHA (antes: $ANTERIOR)"

git fetch --quiet origin main
git merge-base --is-ancestor "$SHA" origin/main || { echo "el commit no está en origin/main" >&2; exit 3; }
git checkout --quiet --detach "$SHA"

revertir() {
  echo "!! falló el deploy: vuelvo a $ANTERIOR" >&2
  git checkout --quiet --detach "$ANTERIOR"
  sudo /usr/bin/systemctl restart curso-hfc-api
}
trap revertir ERR

venv/bin/pip install --quiet -r api/requirements.txt
# Esquema idempotente + datos ficticios (fijos): el deploy siempre deja la base en un estado conocido.
set -a; . /etc/curso-hfc/carga.env; set +a
venv/bin/python sql/semilla.py
sudo /usr/bin/systemctl restart curso-hfc-api

for i in $(seq 1 15); do
  curl -fsS http://127.0.0.1:8010/api/health >/dev/null && { echo "== OK $SHA"; trap - ERR; exit 0; }
  sleep 2
done
echo "la API no respondió /api/health" >&2
false
