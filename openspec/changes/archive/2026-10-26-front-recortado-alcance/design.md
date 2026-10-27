## Context
El HTML original tiene ~1.000 líneas con bloques anidados; borrar a mano es frágil.

## Decisions
- Script de borrado por balance de `<div>` a partir del `id` (incluye el comentario inmediato anterior), y luego regex para botones sueltos.
- Verificación: listar todos los `onclick` del HTML y comprobar que cada función exista en `web/js/` (encontró `cerrarModalHoras`, `abrirModalSal`, `abrirModalOport` huérfanos → corregidos).
- Se conserva `CFG.OFFLINE` (datos generados en el navegador) para trabajar sin backend.

## Risks / Trade-offs
- Quedan nombres de archivo con huecos en la numeración (15, 19, 21, 24, 25): se dejan para que el diff contra producción sea legible.
