"""Pruebas unitarias de auth.py (sin base de datos). Correr: cd api && python -m pytest -q"""
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("JWT_SECRET", "x" * 40)

import auth  # noqa: E402


def test_clave_correcta_e_incorrecta():
    h = auth.hashear_clave("Demo#2026", iteraciones=1000)
    assert auth.verificar_clave("Demo#2026", h)
    assert not auth.verificar_clave("demo#2026", h)


def test_hash_con_sal_distinta_cada_vez():
    assert auth.hashear_clave("igual", 1000) != auth.hashear_clave("igual", 1000)


def test_hash_mal_formado_no_revienta():
    assert not auth.verificar_clave("x", "basura")
    assert not auth.verificar_clave("x", "md5$1$a$b")


def test_token_ida_y_vuelta():
    t = auth.emitir_token("ADMIN.DEMO", "Admin Demo", "ADMINISTRADOR")
    c = auth.verificar_token(t)
    assert c["sub"] == "ADMIN.DEMO" and c["perfil"] == "ADMINISTRADOR" and c["campana"] == "HFC"


def test_token_vencido():
    t = auth.emitir_token("A", "A", "SUPERVISOR", ahora=1000)
    with pytest.raises(auth.TokenInvalido, match="vencido"):
        auth.verificar_token(t, ahora=1000 + auth.DURACION_TOKEN_S)


def test_token_alterado():
    t = auth.emitir_token("A", "A", "SUPERVISOR")
    cab, datos, firma = t.split(".")
    otro = auth.emitir_token("A", "A", "ADMINISTRADOR").split(".")[1]
    with pytest.raises(auth.TokenInvalido, match="firma"):
        auth.verificar_token(f"{cab}.{otro}.{firma}")


def test_token_alg_none_rechazado():
    t = auth.emitir_token("A", "A", "SUPERVISOR")
    _, datos, _ = t.split(".")
    cab_none = auth._b64(b'{"alg":"none","typ":"JWT"}')
    with pytest.raises(auth.TokenInvalido):
        auth.verificar_token(f"{cab_none}.{datos}.")


def test_cabecera_sin_bearer():
    with pytest.raises(auth.TokenInvalido):
        auth.token_de_cabecera("Basic abc")
    with pytest.raises(auth.TokenInvalido):
        auth.token_de_cabecera(None)


def test_secreto_corto_falla(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "corto")
    with pytest.raises(RuntimeError):
        auth.emitir_token("A", "A", "SUPERVISOR")
