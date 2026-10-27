---
titulo: Diagrama de secuencia — Ingreso y carga del tablero
version: 1.0.0
fecha: 2026-10-26
fuentes:
  - web/js/01-core.js (doLogin, iniciarSesion, envoltorio de fetch)
  - web/js/11-remote.js (fetchJSON, cargarDatosReales)
  - api/main.py (login, _autorizar, _datos, _agregar_por_supervisor)
  - api/auth.py
  - api/db.py
  - deploy/nginx-curso-hfc.conf
adrs: [ADR-0003, ADR-0005, ADR-0006, ADR-0009, ADR-0010]
---

# Ingreso y carga del tablero — secuencia (v1.0.0)

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 2026-10-26 | Versión inicial: login con límite de intentos, token HS256, carga en paralelo y agregado para CLIENTE CLARO |

## Ingreso

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant W as Front (01-core.js)
    participant N as Nginx
    participant A as API (main.py)
    participant H as auth.py
    participant D as SQL Server<br/>BD_CURSO_HFC

    U->>W: clic en la mascota, usuario + clave, «Ingresar»
    alt campos vacíos
        W-->>U: «Ingresa usuario y contraseña.» (no llama a la API)
    end
    W->>N: POST /api/hfc-login {usuario_e, password}
    N->>N: limit_req 10/min por IP (ráfaga 5)
    alt excede Nginx
        N-->>W: 429
    end
    N->>A: proxy + X-Real-IP
    A->>A: usuario = strip().upper()[:30]
    alt (IP, usuario) con 5 fallos en 15 min
        A-->>W: 429 «Demasiados intentos…»
    end
    A->>D: SELECT … FROM TBL_USUARIOS WHERE USUARIO_E = ?
    D-->>A: fila o nada
    A->>H: verificar_clave(clave, hash real o HASH_SEÑUELO)
    alt no existe / inactivo / clave mala
        A->>A: registra fallo (IP, usuario)
        A-->>W: 401 «Usuario o contraseña incorrectos» (mismo cuerpo siempre)
        W-->>U: muestra el mensaje
    else válido
        A->>H: emitir_token(sub, nombre, perfil) — HS256, exp 10 h, campana HFC
        A-->>W: 200 {ok, usuario_e, nombre, perfil, token}
        W->>W: SESION = {...} en memoria · aplicarPermisos() oculta pestañas
    end
```

## Carga de datos

```mermaid
sequenceDiagram
    autonumber
    participant W as Front (11-remote.js)
    participant A as API (main.py)
    participant C as Caché 60 s (db.py)
    participant D as SQL Server

    par en paralelo
        W->>A: POST /api/hfc-diario (Bearer)
    and
        W->>A: POST /api/hfc-supervisores (Bearer)
    end
    A->>A: _autorizar: firma, alg, exp, campana → 401 · perfil ∈ PERMISOS → 403
    A->>C: consultar_cacheado(SQL fijo)
    alt caché fresca
        C-->>A: filas
    else vencida
        C->>D: SELECT * FROM VW_DIARIO / VW_SUPERVISORES (timeout 30 s)
        alt base caída o timeout
            A-->>W: 503 «Base de datos no disponible»
            W-->>W: aviso «No se pudo cargar los datos…» · Actualizar reintenta
        end
        D-->>C: filas
    end
    opt perfil CLIENTE CLARO y hfc-supervisores
        A->>A: _agregar_por_supervisor (sin USUARIO ni NOMBRE_ASESOR)
    end
    A-->>W: 200 [filas] · Cache-Control: no-store
    W->>W: limpiarTextos() · foldIntervals() · cargarDatos() → pestaña activa
    Note over W: un 401/403 posterior con el token vigente →<br/>cerrarSesion() + «Tu sesión venció»
```
