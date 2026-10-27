"""Crea el esquema y carga los datos ficticios de BD_CURSO_HFC (ADR-0002, ADR-0007).

Uso:  DB_SERVER=127.0.0.1 DB_USER=curso_hfc_carga DB_PASSWORD=... \
      CLAVE_ADMIN=... CLAVE_SUPERVISOR=... CLAVE_CLIENTE=... python sql/semilla.py

- Idempotente: corre 02_esquema.sql y reemplaza todos los datos en una sola transacción.
- Determinista: semilla fija → mismos números en cada corrida (los tests E2E dependen de eso).
- Período fijo: agosto y septiembre de 2026. Nombres y usuarios inventados; nada sale de producción.
"""
import os
import random
import re
import sys
from datetime import date, timedelta
from pathlib import Path

import pyodbc

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "api"))
import auth  # noqa: E402

DESDE, HASTA = date(2026, 8, 1), date(2026, 9, 30)
# Peso de cada franja de 30 min entre 08:00 y 16:30 (curva de llegada típica de un inbound).
CURVA = [0.30, 0.55, 0.80, 1.00, 1.10, 1.05, 0.95, 0.85, 0.90, 1.00, 0.95, 0.80, 0.65, 0.50, 0.40, 0.30, 0.28, 0.20]
FRANJAS = [f"{8 + i // 2:02d}:{'30' if i % 2 else '00'}" for i in range(len(CURVA))]
SUPERVISORES = ["Karina Ríos", "Marco Salas", "Lucía Vega"]
COORDINADOR = "Rosa Medina"
NOMBRES = ["Ana Torres", "Luis Pérez", "María Gómez", "Jorge Díaz", "Sofía Ramos", "Diego Castro",
           "Valeria Núñez", "Pedro Salinas", "Carla Mendoza", "Raúl Vargas", "Lucía Flores", "Iván Rojas",
           "Paola Ríos", "Hugo León", "Nadia Cruz", "Óscar Pinto", "Elena Soto", "Bruno Vera",
           "Karen Loza", "Tito Aguirre", "Mía Campos", "Saúl Bravo", "Gina Pardo", "Beto Ríos"]
CONDICIONES = ["FULL TIME", "MINI FULL TIME", "PART TIME"]


def dias():
    d = DESDE
    while d <= HASTA:
        yield d
        d += timedelta(days=1)


def nomina():
    filas = []
    for i, n in enumerate(NOMBRES):
        ojt = i % 9 == 0
        filas.append((f"U{i + 1:03d}", n, SUPERVISORES[i % 3], COORDINADOR,
                      CONDICIONES[i % 3], "REMOTO" if i % 4 == 0 else "PRESENCIAL",
                      "ACTIVO", "OJT" if ojt else "OPERACIONES"))
    return filas


def kpi_franja(rnd):
    filas = []
    for d in dias():
        finde = d.weekday() >= 5
        vol = 95 if finde else 165
        for franja, peso in zip(FRANJAS, CURVA):
            w = peso * (0.85 + rnd.random() * 0.30)
            recibidas = max(1, round(vol * w))
            atendida = round(recibidas * (0.90 + rnd.random() * 0.08))
            abandonada = recibidas - atendida
            umbral = round(recibidas * (0.78 + rnd.random() * 0.14))
            corte = round(atendida * (0.008 + rnd.random() * 0.040))
            tmg_prom = 170 + round(rnd.random() * 110)
            tmg_total = tmg_prom * atendida
            m90 = round(atendida * (0.82 + rnd.random() * 0.12))
            prom = round(atendida * 0.01 * (7 + rnd.random() * 4))
            detr = round(atendida * 0.01 * (1 + rnd.random() * 2))
            pas = round(atendida * 0.01 * (2 + rnd.random() * 2))
            encu = prom + detr + pas
            encu_cal = round(encu * (0.40 + rnd.random() * 0.35))
            traf_dim = round(recibidas * (0.90 + rnd.random() * 0.18))
            tmg_dim = round(225 * (0.92 + rnd.random() * 0.16), 2)
            ag_dim = round((5 if finde else 8) + 6 * w + rnd.random() * 2, 2)
            ag_idle = round(ag_dim * (0.88 + rnd.random() * 0.22), 2)
            ag_neto = round(ag_idle * (0.60 + rnd.random() * 0.22), 2)
            ag_br = round(ag_idle * (1.04 + rnd.random() * 0.14), 2)
            # Identidad de la vista real: AGENTE_NETO_IDLE = TMP_PROD / 1800.
            tmp_prod = round(ag_idle * 1800)
            filas.append((d, franja, recibidas, atendida, abandonada, umbral, m90, corte,
                          tmg_total, tmg_prom, tmg_total, tmp_prod, encu, encu_cal, prom, detr, pas,
                          traf_dim, tmg_dim, ag_dim, round(ag_dim * 0.5, 2), ag_br, ag_idle, ag_neto,
                          round(atendida * 0.01 * (0.5 + rnd.random() * 1.5)),
                          round(atendida * 0.01 * (1 + rnd.random() * 2)),
                          round(atendida * 0.01 * (0.5 + rnd.random() * 1.5)),
                          round(atendida * 0.01 * (0.5 + rnd.random() * 1.5))))
    return filas


def gestion_asesor(rnd, usuarios):
    filas = []
    for d in dias():
        finde = d.weekday() >= 5
        for u in usuarios:
            if finde and rnd.random() < 0.5:   # la mitad descansa el fin de semana
                continue
            franjas = 10 + int(rnd.random() * 7)   # 5 a 8 h conectado
            at = cor = hold = cc = tmg = hab = prod = tpm = p = de = pa = enc = cal = 0
            tv = ti = tb = tg = 0
            for _ in range(franjas):
                n = 1 + int(rnd.random() * 6)
                dur = (200 + round(rnd.random() * 160)) * n
                pr = round(dur / (0.55 + rnd.random() * 0.30))
                at += n; tmg += dur; hab += dur; prod += pr; tpm += round(pr / (0.80 + rnd.random() * 0.15))
                cor += rnd.random() < 0.14
                hold += rnd.random() < 0.10
                cc += rnd.random() < 0.06
                if rnd.random() < 0.5:
                    enc += 1
                    x = rnd.random()
                    p += x < 0.72; pa += 0.72 <= x < 0.88; de += x >= 0.88
                elif rnd.random() < 0.3:
                    cal += 1
                if rnd.random() < 0.10:
                    tv += rnd.random() < 0.4; ti += rnd.random() < 0.4
                    tb += rnd.random() < 0.3; tg += rnd.random() < 0.3
            filas.append((d, u, at, int(cor), int(hold), int(cc), tmg, tpm, hab, round(prod * 0.3), prod,
                          round(prod * 0.15), int(p), int(de), int(pa), enc, cal, int(tv), int(ti), int(tb), int(tg)))
    return filas


def usuarios_panel():
    claves = {k: os.environ.get(k, "") for k in ("CLAVE_ADMIN", "CLAVE_SUPERVISOR", "CLAVE_CLIENTE")}
    faltan = [k for k, v in claves.items() if len(v) < 8]
    if faltan:
        sys.exit(f"Faltan claves (mínimo 8 caracteres): {', '.join(faltan)}")
    return [("ADMIN.DEMO", "Administrador Demo", "ADMINISTRADOR", auth.hashear_clave(claves["CLAVE_ADMIN"]), 1),
            ("SUP.DEMO", "Karina Ríos", "SUPERVISOR", auth.hashear_clave(claves["CLAVE_SUPERVISOR"]), 1),
            ("CLIENTE.DEMO", "Cliente Demo", "CLIENTE CLARO", auth.hashear_clave(claves["CLAVE_CLIENTE"]), 1),
            # Usuario dado de baja: sirve para probar que ACTIVO = 0 no entra aunque la clave sea correcta.
            ("BAJA.DEMO", "Usuario de Baja", "SUPERVISOR", auth.hashear_clave(claves["CLAVE_SUPERVISOR"]), 0)]


def lotes_sql(ruta):
    return [b for b in re.split(r"^\s*GO\s*$", Path(ruta).read_text(encoding="utf-8"), flags=re.M) if b.strip()]


def main():
    cn = pyodbc.connect(
        f"DRIVER={{{os.getenv('DB_DRIVER', 'ODBC Driver 18 for SQL Server')}}};"
        f"SERVER={os.getenv('DB_SERVER', '127.0.0.1')},{os.getenv('DB_PORT', '1433')};"
        f"DATABASE={os.getenv('DB_NAME', 'BD_CURSO_HFC')};UID={os.environ['DB_USER']};"
        f"PWD={os.environ['DB_PASSWORD']};Encrypt=no;TrustServerCertificate=yes", autocommit=True)
    cur = cn.cursor()
    for lote in lotes_sql(Path(__file__).with_name("02_esquema.sql")):
        cur.execute(lote)

    rnd = random.Random(20260801)
    nom = nomina()
    kpi = kpi_franja(rnd)
    ges = gestion_asesor(rnd, [n[0] for n in nom])
    usu = usuarios_panel()

    cn.autocommit = False
    cur.fast_executemany = True
    for t in ("TBL_GESTION_ASESOR", "TBL_KPI_FRANJA", "TBL_NOMINA", "TBL_USUARIOS"):
        cur.execute(f"DELETE FROM dbo.{t}")
    cur.executemany("INSERT INTO dbo.TBL_NOMINA VALUES (?,?,?,?,?,?,?,?)", nom)
    cur.executemany(f"INSERT INTO dbo.TBL_KPI_FRANJA VALUES ({','.join('?' * 28)})", kpi)
    cur.executemany(f"INSERT INTO dbo.TBL_GESTION_ASESOR VALUES ({','.join('?' * 21)})", ges)
    cur.executemany("INSERT INTO dbo.TBL_USUARIOS VALUES (?,?,?,?,?)", usu)
    cn.commit()
    print(f"OK: {len(nom)} asesores, {len(kpi)} filas día×franja, {len(ges)} filas día×asesor, {len(usu)} usuarios")


if __name__ == "__main__":
    main()
