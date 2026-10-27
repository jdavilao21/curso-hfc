# ADR 0006: API en FastAPI + pyodbc con caché en memoria

## Estado

Aceptado

## Contexto

Las APIs de GEA (`atc-api`, `hfc-api`) ya son FastAPI + pyodbc con caché en memoria, operadas
con systemd. Los datos de la demo cambian solo en cada deploy.

## Decisión

- FastAPI + uvicorn, 2 workers, en `127.0.0.1:8010`.
- `pyodbc` con el driver «ODBC Driver 18 for SQL Server». Consultas **fijas** en `db.py`; la única
  con valor del usuario (el login) usa parámetro `?`.
- Las dos vistas se cachean 60 s por proceso (`consultar_cacheado`): todos los usuarios ven lo mismo.
- Las llamadas a la base corren en un hilo (`run_in_threadpool`) para no bloquear el event loop.

## Alternativas consideradas

- **Reutilizar `atc-api` con `API_PROJECT=curso`**: menos código, pero acopla la demo pública al
  servicio que atiende producción.

## Consecuencias

- La API completa son ~250 líneas en 3 archivos, legibles en una sentada.
- La caché y el límite de intentos son por proceso: con 2 workers cada uno tiene los suyos.
