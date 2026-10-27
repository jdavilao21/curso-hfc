# ADR 0009: Autorización por perfil en el servidor, no solo en la interfaz

## Estado

Aceptado — nace de la revisión adversarial del TECH-DESIGN v1 (hallazgo R-01, ALTA)

## Contexto

El PRD (criterio 3) pide que el Cliente Claro **no** vea el detalle por asesor. En el v1, la
única barrera era el front (`TABS_POR_PERFIL` oculta la pestaña Asesores), pero
`POST /api/hfc-supervisores` devolvía la vista completa, con nombre y código de cada asesor. Con
abrir las herramientas de desarrollo del navegador, el cliente veía todo.

## Decisión

- La API decide con el `perfil` **del token firmado**, nunca con un dato que mande el navegador.
- `PERMISOS` (en `api/main.py`) lista qué perfiles pueden llamar a cada endpoint (`403` si no).
- Para `CLIENTE CLARO`, `hfc-supervisores` devuelve las filas **agregadas por supervisor y
  día** (`_agregar_por_supervisor`): `USUARIO` y `NOMBRE_ASESOR` vacíos, métricas sumadas. La
  pestaña Supervisores se ve igual (agrega por supervisor) y los totales coinciden.
- El front sigue ocultando la pestaña, pero eso es comodidad, no seguridad.

## Alternativas consideradas

- **Una vista SQL separada por perfil** (`VW_SUPERVISORES_AGREGADO`): más limpio en la base,
  pero duplica la vista y la caché.
- **Prohibir `hfc-supervisores` al cliente**: le quitaría la pestaña Supervisores, que el PRD sí le da.

## Consecuencias

- Test E2E `CLIENTE CLARO recibe Supervisores agregado, sin detalle por asesor`: compara que los
  totales del agregado sean iguales a los del detalle.
- Si se agrega un perfil nuevo, hay que decidir explícitamente qué recibe en `PERMISOS`.
