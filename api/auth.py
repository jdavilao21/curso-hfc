"""Contraseñas y token de sesión (ADR-0005).

- Contraseñas: PBKDF2-HMAC-SHA256 con sal propia por usuario. Formato guardado en TBL_USUARIOS.HASH_CLAVE:
  pbkdf2_sha256$<iteraciones>$<sal_b64>$<hash_b64>
- Token: JWT HS256 firmado con JWT_SECRET, con las claims sub, nombre, perfil, campana, iat y exp.
Solo librería estándar: no hace falta instalar nada para firmar ni verificar.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time

ITERACIONES = 200_000
DURACION_TOKEN_S = int(os.getenv("TOKEN_HORAS", "10")) * 3600
CAMPANA = "HFC"


class TokenInvalido(Exception):
    """El token falta, está mal formado, tiene la firma alterada o ya venció."""


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _secreto() -> bytes:
    s = os.getenv("JWT_SECRET", "")
    if len(s) < 32:
        raise RuntimeError("JWT_SECRET debe tener al menos 32 caracteres")
    return s.encode()


# ---------- contraseñas ----------

def hashear_clave(clave: str, iteraciones: int = ITERACIONES) -> str:
    sal = secrets.token_bytes(16)
    h = hashlib.pbkdf2_hmac("sha256", clave.encode(), sal, iteraciones)
    return f"pbkdf2_sha256${iteraciones}${_b64(sal)}${_b64(h)}"


def verificar_clave(clave: str, guardado: str) -> bool:
    try:
        algo, it, sal, h = guardado.split("$")
        if algo != "pbkdf2_sha256":
            return False
        calc = hashlib.pbkdf2_hmac("sha256", clave.encode(), _unb64(sal), int(it))
        return hmac.compare_digest(calc, _unb64(h))
    except (ValueError, AttributeError):
        return False


# Hash de una clave que nadie conoce: se verifica contra él cuando el usuario no existe,
# para que «usuario inexistente» y «clave incorrecta» tarden lo mismo (SP-03).
HASH_SEÑUELO = hashear_clave(secrets.token_urlsafe(16))


# ---------- token ----------

def emitir_token(usuario: str, nombre: str, perfil: str, ahora: int | None = None) -> str:
    ahora = int(ahora if ahora is not None else time.time())
    cab = {"alg": "HS256", "typ": "JWT"}
    datos = {"sub": usuario, "nombre": nombre, "perfil": perfil, "campana": CAMPANA,
             "iat": ahora, "exp": ahora + DURACION_TOKEN_S}
    parte = _b64(json.dumps(cab, separators=(",", ":")).encode()) + "." + \
        _b64(json.dumps(datos, separators=(",", ":"), ensure_ascii=False).encode())
    firma = hmac.new(_secreto(), parte.encode(), hashlib.sha256).digest()
    return parte + "." + _b64(firma)


def verificar_token(token: str, ahora: int | None = None) -> dict:
    try:
        cab, datos, firma = token.split(".")
        esperada = hmac.new(_secreto(), f"{cab}.{datos}".encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(esperada, _unb64(firma)):
            raise TokenInvalido("firma")
        if json.loads(_unb64(cab)).get("alg") != "HS256":
            raise TokenInvalido("alg")
        claims = json.loads(_unb64(datos))
    except TokenInvalido:
        raise
    except Exception as e:  # base64, JSON o partes mal formadas
        raise TokenInvalido("formato") from e
    ahora = int(ahora if ahora is not None else time.time())
    if int(claims.get("exp", 0)) <= ahora:
        raise TokenInvalido("vencido")
    if claims.get("campana") != CAMPANA:
        raise TokenInvalido("campana")
    return claims


def token_de_cabecera(valor: str | None) -> str:
    if not valor or not valor.startswith("Bearer "):
        raise TokenInvalido("sin token")
    return valor[7:].strip()
