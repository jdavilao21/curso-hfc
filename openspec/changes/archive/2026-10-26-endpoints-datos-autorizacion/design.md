## Decisions
- La decisión de qué recibe cada perfil se toma con el `perfil` del token firmado.
- El agregado se hace en Python sobre la fila cacheada (una sola consulta y una sola caché para todos).
- Las excepciones de base se registran con traza en el log y al cliente solo le llega `503` genérico.

## Risks / Trade-offs
- Si se agrega una columna de texto a la vista, `_agregar_por_supervisor` la deja fuera del agregado (solo suma números y copia las claves): es seguro por defecto.
