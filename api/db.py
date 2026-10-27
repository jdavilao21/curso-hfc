"""Acceso a SQL Server (BD_CURSO_HFC) con pyodbc y caché corta en memoria (ADR-0001, ADR-0006).

Las consultas viven aquí, en texto fijo y con parámetros `?`: ningún valor del usuario se concatena al SQL (SP-01).
"""
import os
import threading
import time
from datetime import date, datetime
from decimal import Decimal

import pyodbc

DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")
DB_SERVER = os.getenv("DB_SERVER", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "1433")
DB_NAME = os.getenv("DB_NAME", "BD_CURSO_HFC")
DB_USER = os.getenv("DB_USER", "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
CACHE_TTL_S = int(os.getenv("CACHE_TTL_S", "60"))
QUERY_TIMEOUT_S = int(os.getenv("DB_QUERY_TIMEOUT", "30"))

SQL_DIARIO = "SELECT * FROM dbo.VW_DIARIO ORDER BY FECHA, FRANJA_GTR"
SQL_SUPERVISORES = "SELECT * FROM dbo.VW_SUPERVISORES ORDER BY FECHA, USUARIO"
SQL_USUARIO = ("SELECT USUARIO_E, NOMBRE, PERFIL, HASH_CLAVE, ACTIVO "
               "FROM dbo.TBL_USUARIOS WHERE USUARIO_E = ?")


def _cadena() -> str:
    return (f"DRIVER={{{DB_DRIVER}}};SERVER={DB_SERVER},{DB_PORT};DATABASE={DB_NAME};"
            f"UID={DB_USER};PWD={DB_PASSWORD};Encrypt=no;TrustServerCertificate=yes")


def _valor(v):
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, datetime):
        return v.isoformat(timespec="seconds")
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, str):
        return v.strip()
    return v


def consultar(sql: str, *params) -> list[dict]:
    with pyodbc.connect(_cadena(), timeout=10) as cn:
        cn.timeout = QUERY_TIMEOUT_S   # una consulta colgada termina en 503, no deja la API esperando (R-09)
        cur = cn.cursor()
        cur.execute(sql, *params)
        cols = [c[0] for c in cur.description]
        return [{c: _valor(v) for c, v in zip(cols, fila)} for fila in cur.fetchall()]


_cache: dict[str, tuple[float, list]] = {}
_lock = threading.Lock()


def consultar_cacheado(sql: str) -> list[dict]:
    """Solo para las vistas de lectura sin parámetros: mismo resultado para todos los usuarios."""
    with _lock:
        hit = _cache.get(sql)
        if hit and time.time() - hit[0] < CACHE_TTL_S:
            return hit[1]
    filas = consultar(sql)
    with _lock:
        _cache[sql] = (time.time(), filas)
    return filas


def buscar_usuario(usuario: str) -> dict | None:
    filas = consultar(SQL_USUARIO, usuario)
    return filas[0] if filas else None


def ping() -> bool:
    try:
        consultar("SELECT 1 AS OK")
        return True
    except pyodbc.Error:
        return False
