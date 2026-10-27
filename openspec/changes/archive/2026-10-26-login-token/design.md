## Decisions
- Solo librería estándar (`hashlib`, `hmac`, `secrets`); `JWT_SECRET` < 32 caracteres → la API no arranca.
- `verificar_token` compara la firma antes de leer las claims, exige `alg = HS256`, `exp` futuro y `campana = HFC`.
- El contador de fallos se limpia al ingresar bien.
- La IP real se toma de `X-Real-IP` solo si la conexión viene de 127.0.0.1.

## Risks / Trade-offs
- Límite por worker, en memoria (ADR-0010).
