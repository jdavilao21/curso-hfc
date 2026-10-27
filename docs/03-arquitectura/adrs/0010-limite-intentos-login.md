# ADR 0010: Límite de intentos de login y respuestas indistinguibles

## Estado

Aceptado — nace de la revisión adversarial del TECH-DESIGN v1 (hallazgos R-02, R-06 y R-07)

## Contexto

El PRD pide (CB-02) bloquear temporalmente a quien prueba contraseñas en serie, y (criterio 2)
el mismo mensaje para clave incorrecta y usuario dado de baja. El v1 no lo resolvía, y si un
usuario no existe y se salta el PBKDF2, la respuesta llega más rápido: eso revela qué usuarios existen.

## Decisión

- **Dos capas de límite:** Nginx `limit_req` en `/api/hfc-login` (10 pedidos/min por IP, ráfaga 5,
  `429`), y en la API un contador por **(IP, usuario)**: 5 fallos en 15 min → `429` hasta que
  pase la ventana. La IP sale de `X-Real-IP` **solo** si la conexión viene del Nginx local.
- El usuario se normaliza (`strip().upper()`, máx. 30 caracteres) **antes** de buscarlo y de
  contar intentos (CB-05).
- Si el usuario no existe, se verifica la clave contra `HASH_SEÑUELO` (un PBKDF2 de una clave
  aleatoria): mismo trabajo, mismo tiempo, mismo `401 {"ok":false,"msg":"Usuario o contraseña incorrectos"}`
  para «no existe», «inactivo» y «clave mala».

## Alternativas consideradas

- **Bloqueo por usuario (sin IP)**: cualquiera podría bloquear la cuenta de otro a propósito.
- **CAPTCHA**: desproporcionado para una herramienta interna con 4 usuarios.

## Consecuencias

- El contador vive en memoria de cada worker (2): el límite efectivo por (IP, usuario) es de
  hasta 10 intentos y se reinicia con cada deploy. Aceptado; el límite de Nginx sí es global.
- Tests E2E: `cinco intentos fallidos bloquean al sexto con 429`, `el login no revela si el
  usuario existe`, `el usuario se normaliza a mayúsculas`.
