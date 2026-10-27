## 1. auth.py

- [x] 1.1 PBKDF2 con sal y formato versionado
- [x] 1.2 JWT HS256 emitir/verificar
- [x] 1.3 Pruebas unitarias (firma alterada, alg none, vencido, secreto corto)

## 2. Ruta de login

- [x] 2.1 Normalizar usuario
- [x] 2.2 Hash señuelo para usuario inexistente
- [x] 2.3 Contador por (IP, usuario) → 429
- [x] 2.4 Respuesta `no-store`

## 3. Verificación

- [x] 3.1 `pytest` 9/9
- [x] 3.2 `curl` login ok, clave mala, usuario de baja
