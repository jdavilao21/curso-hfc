# api-datos Specification

## Purpose
Entrega de los datos de los tableros (día × franja y día × asesor) solo a sesiones válidas y según el perfil del token.

## Requirements

### Requirement: Datos solo con token válido
`POST /api/hfc-diario` y `POST /api/hfc-supervisores` SHALL responder `401` sin un token válido y `403` si el perfil no está en `PERMISOS`.

#### Scenario: Sin token
- **WHEN** se llama a cualquiera de los dos endpoints sin `Authorization`
- **THEN** la respuesta es `401` y no contiene filas

### Requirement: Contrato de filas
Con token válido, `hfc-diario` SHALL devolver las filas de `VW_DIARIO` y `hfc-supervisores` las de `VW_SUPERVISORES`, con los nombres de columna del sistema real y `Cache-Control: no-store`.

#### Scenario: Volumen de Diario
- **WHEN** un ADMINISTRADOR pide `hfc-diario`
- **THEN** recibe 1.098 filas con `PERIODO`, `FECHA`, `FECHA_VISUAL`, `SEMANA`, `FRANJA_GTR`, `LLAM_RECIBIDAS`…

### Requirement: Sin detalle por asesor para CLIENTE CLARO
Para el perfil `CLIENTE CLARO`, `hfc-supervisores` SHALL devolver una fila por supervisor y día, con `USUARIO` y `NOMBRE_ASESOR` vacíos y las métricas sumadas.

#### Scenario: Totales iguales
- **WHEN** se comparan las respuestas de ADMINISTRADOR y CLIENTE CLARO
- **THEN** la del cliente tiene menos filas, ningún nombre de asesor y la misma suma de `CANT_ATENDIDA`

### Requirement: Base caída
Si la base no responde o una consulta supera 30 s, la API SHALL responder `503 {"ok":false,"msg":"Base de datos no disponible"}`, y `GET /api/health` SHALL responder `503`.

### Requirement: Sin documentación expuesta
`/docs`, `/redoc` y `/openapi.json` SHALL responder `404`.
