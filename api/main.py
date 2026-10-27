"""API del Panel HFC (demo del curso).

Contrato (ADR-0003): mismo estilo que los webhooks de n8n que ya usa el front: POST con JSON, respuesta JSON.
  POST /api/hfc-login         {usuario_e, password} -> {ok, usuario_e, nombre, perfil, token}
  POST /api/hfc-diario        Bearer -> filas día × franja (VW_DIARIO)
  POST /api/hfc-supervisores  Bearer -> filas día × asesor (VW_SUPERVISORES)
  GET  /api/health            -> {ok, db}

Con SERVIR_WEB=1 también sirve la carpeta web/ en "/" (desarrollo y E2E). En producción la web la sirve Nginx.
"""
import logging
import os
import time
from collections import defaultdict, deque
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

import auth
import db

log = logging.getLogger("curso-hfc")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

PERFILES = {"ADMINISTRADOR", "SUPERVISOR", "CLIENTE CLARO"}
# Endpoints de datos por perfil (SP-04): la misma regla que TABS_POR_PERFIL en web/js/01-core.js, ahora en el servidor.
PERMISOS = {
    "hfc-diario": PERFILES,
    "hfc-supervisores": PERFILES,
}
INTENTOS_MAX = int(os.getenv("LOGIN_INTENTOS_MAX", "5"))
VENTANA_S = int(os.getenv("LOGIN_VENTANA_S", "900"))

app = FastAPI(title="Panel HFC — API demo", docs_url=None, redoc_url=None, openapi_url=None)
_fallos: dict[str, deque] = defaultdict(deque)


def _ip(request: Request) -> str:
    # Solo se confía en X-Real-IP si la conexión viene del Nginx local.
    cliente = request.client.host if request.client else ""
    if cliente in ("127.0.0.1", "::1"):
        return request.headers.get("x-real-ip", cliente)
    return cliente


def _bloqueado(clave: str) -> bool:
    q, ahora = _fallos[clave], time.time()
    while q and ahora - q[0] > VENTANA_S:
        q.popleft()
    return len(q) >= INTENTOS_MAX


def _json(contenido, status=200):
    return JSONResponse(contenido, status_code=status, headers={"Cache-Control": "no-store"})


@app.get("/api/health")
async def health():
    ok = await run_in_threadpool(db.ping)
    return _json({"ok": ok, "db": "ok" if ok else "sin conexión"}, 200 if ok else 503)


@app.post("/api/hfc-login")
async def login(request: Request):
    try:
        body = await request.json()
    except ValueError:
        body = {}
    usuario = str(body.get("usuario_e", "")).strip().upper()[:30]
    clave = str(body.get("password", ""))[:128]
    if not usuario or not clave:
        return _json({"ok": False, "msg": "Ingresa usuario y contraseña."}, 400)

    clave_limite = f"{_ip(request)}|{usuario}"
    if _bloqueado(clave_limite):
        return _json({"ok": False, "msg": "Demasiados intentos. Espera 15 minutos e intenta de nuevo."}, 429)

    u = await run_in_threadpool(db.buscar_usuario, usuario)
    valido = auth.verificar_clave(clave, u["HASH_CLAVE"] if u else auth.HASH_SEÑUELO)
    if not (u and valido and u["ACTIVO"] and u["PERFIL"] in PERFILES):
        _fallos[clave_limite].append(time.time())
        log.info("login rechazado usuario=%s ip=%s", usuario, _ip(request))
        return _json({"ok": False, "msg": "Usuario o contraseña incorrectos"}, 401)

    _fallos.pop(clave_limite, None)
    token = auth.emitir_token(u["USUARIO_E"], u["NOMBRE"], u["PERFIL"])
    log.info("login ok usuario=%s perfil=%s", u["USUARIO_E"], u["PERFIL"])
    return _json({"ok": True, "usuario_e": u["USUARIO_E"], "nombre": u["NOMBRE"],
                  "perfil": u["PERFIL"], "token": token})


def _autorizar(request: Request, endpoint: str):
    """Devuelve (claims, None) o (None, respuesta de error)."""
    try:
        claims = auth.verificar_token(auth.token_de_cabecera(request.headers.get("authorization")))
    except auth.TokenInvalido as e:
        log.info("token rechazado endpoint=%s motivo=%s", endpoint, e)
        return None, _json({"ok": False, "msg": "Sesión no válida o vencida"}, 401)
    if claims.get("perfil") not in PERMISOS[endpoint]:
        return None, _json({"ok": False, "msg": "Sin acceso"}, 403)
    return claims, None


CLAVES_SUPERVISOR = ("PERIODO", "FECHA", "FECHA_VISUAL", "SEMANA", "SUPERVISOR", "COORDINADOR")


def _agregar_por_supervisor(filas: list[dict]) -> list[dict]:
    """CLIENTE CLARO no recibe el detalle por asesor (SP-04, revisión adversarial R-01): una fila por
    supervisor y día con las métricas sumadas. La pestaña Supervisores se ve igual; Asesores no está permitida."""
    grupos: dict[tuple, dict] = {}
    for f in filas:
        clave = tuple(f[c] for c in CLAVES_SUPERVISOR)
        g = grupos.get(clave)
        if g is None:
            g = grupos[clave] = {c: f[c] for c in CLAVES_SUPERVISOR}
            g.update(USUARIO="", NOMBRE_ASESOR="", CONDICION_LAB="", ESTADO_OP="", ESTADO="", CONTRATO="")
        for c, v in f.items():
            if c not in g and isinstance(v, (int, float)):
                g[c] = 0
            if isinstance(v, (int, float)) and c not in CLAVES_SUPERVISOR:
                g[c] += v
    return list(grupos.values())


async def _datos(request: Request, endpoint: str, sql: str):
    claims, error = _autorizar(request, endpoint)
    if error:
        return error
    try:
        filas = await run_in_threadpool(db.consultar_cacheado, sql)
    except Exception:
        log.exception("fallo de base en %s", endpoint)
        return _json({"ok": False, "msg": "Base de datos no disponible"}, 503)
    if endpoint == "hfc-supervisores" and claims["perfil"] == "CLIENTE CLARO":
        filas = _agregar_por_supervisor(filas)
    return _json(filas)


@app.post("/api/hfc-diario")
async def diario(request: Request):
    return await _datos(request, "hfc-diario", db.SQL_DIARIO)


@app.post("/api/hfc-supervisores")
async def supervisores(request: Request):
    return await _datos(request, "hfc-supervisores", db.SQL_SUPERVISORES)


if os.getenv("SERVIR_WEB") == "1":
    app.mount("/", StaticFiles(directory=Path(__file__).resolve().parent.parent / "web", html=True), name="web")
