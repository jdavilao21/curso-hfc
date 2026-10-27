#!/usr/bin/env bash
# crear-bd.sh — paso A3 del DEPLOY-PLAN: crea BD_CURSO_HFC y sus dos logins con sql/01_crear_bd.sql.
# Lo corre Jose UNA vez en el VPS:  sudo /opt/curso-hfc/deploy/crear-bd.sh
# - La clave de sa se pide por teclado sin mostrarse, viaja a sqlcmd por SQLCMDPASSWORD y se borra al terminar.
# - Las claves de los logins de la demo se leen de /etc/curso-hfc/{api,carga}.env (no se muestran).
set -euo pipefail

SQLCMD=/opt/mssql-tools18/bin/sqlcmd
REPO=$(cd "$(dirname "$0")/.." && pwd)
SERVIDOR=${DB_SERVER:-127.0.0.1},${DB_PORT:-1433}

valor() { grep -E "^$2=" "$1" | head -1 | cut -d= -f2-; }
CLAVE_APP=$(valor /etc/curso-hfc/api.env DB_PASSWORD)
CLAVE_CARGA=$(valor /etc/curso-hfc/carga.env DB_PASSWORD)
[[ -n "$CLAVE_APP" && -n "$CLAVE_CARGA" ]] || { echo "Faltan las claves en /etc/curso-hfc/*.env" >&2; exit 1; }

read -r -s -p "Clave de sa (no se muestra): " SQLCMDPASSWORD; echo
export SQLCMDPASSWORD
trap 'unset SQLCMDPASSWORD' EXIT

echo "== Creando BD_CURSO_HFC y logins en $SERVIDOR"
"$SQLCMD" -S "$SERVIDOR" -U sa -C -b -i "$REPO/sql/01_crear_bd.sql" \
  -v CLAVE_APP="$CLAVE_APP" CLAVE_CARGA="$CLAVE_CARGA" >/dev/null
unset SQLCMDPASSWORD

echo "== Verificando los logins nuevos (ya sin sa)"
SQLCMDPASSWORD="$CLAVE_APP"   "$SQLCMD" -S "$SERVIDOR" -U curso_hfc_app   -C -b -d BD_CURSO_HFC -h -1 -Q "SET NOCOUNT ON; SELECT 'curso_hfc_app: OK'"
SQLCMDPASSWORD="$CLAVE_CARGA" "$SQLCMD" -S "$SERVIDOR" -U curso_hfc_carga -C -b -d BD_CURSO_HFC -h -1 -Q "SET NOCOUNT ON; SELECT 'curso_hfc_carga: OK'"
echo "== Listo. Avísale a Claude para seguir con el paso 4."
