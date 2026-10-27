# ADR 0005: Autenticación propia — contraseñas PBKDF2 y token JWT HS256

## Estado

Aceptado

## Contexto

En producción, el login pasa por n8n → API de usuarios (`gea-tipificaciones`), que emite un JWT
HS256 con las claims `sub`, `perfil` y `campana`. La demo no puede depender de esos servicios
(tienen los usuarios reales) y el PRD pide tres perfiles con usuario y contraseña.

## Decisión

- Contraseñas en `TBL_USUARIOS.HASH_CLAVE` con **PBKDF2-HMAC-SHA256**, sal aleatoria de 16 bytes
  por usuario y 200.000 iteraciones (`pbkdf2_sha256$it$sal$hash`).
- Token **JWT HS256** firmado con `JWT_SECRET` (≥ 32 caracteres; si es más corto, la API no
  arranca). Claims: `sub`, `nombre`, `perfil`, `campana="HFC"`, `iat`, `exp` (10 h = una jornada).
- La verificación exige `alg = HS256` (rechaza `none`), compara la firma en tiempo constante y
  valida `exp` y `campana`.
- Todo con la librería estándar de Python (`hashlib`, `hmac`): sin dependencias de criptografía.
- El front guarda la sesión en memoria (`SESION`), no en `localStorage`: al cerrar la pestaña se pierde.

## Alternativas consideradas

- **bcrypt/argon2**: mejores frente a GPU, pero suman una dependencia nativa; para una demo con
  4 usuarios, PBKDF2 con 200k iteraciones es suficiente.
- **Sesión con cookie HttpOnly**: más resistente a XSS, pero el front entero está escrito para
  enviar `Authorization: Bearer` (mismo patrón que producción).

## Consecuencias

- El token no se puede revocar antes de `exp` (no hay lista negra). Aceptado: la demo no tiene
  datos reales y el cierre de sesión borra el token del navegador.
- `auth.py` tiene pruebas unitarias propias (`api/tests/test_auth.py`): firma alterada,
  `alg=none`, vencido, hash mal formado.
