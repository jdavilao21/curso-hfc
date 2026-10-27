# acceso Specification

## Purpose
Ingreso al panel con usuario y contraseña, emisión y verificación del token de sesión, y protección contra prueba de contraseñas y enumeración de usuarios.

## Requirements

### Requirement: Ingreso con credenciales válidas
`POST /api/hfc-login` con un usuario activo y su contraseña SHALL responder `200` con `ok`, `usuario_e`, `nombre`, `perfil` y un `token` JWT HS256 válido por 10 horas, con `campana = "HFC"`.

#### Scenario: Supervisor ingresa
- **WHEN** `SUP.DEMO` envía su contraseña correcta
- **THEN** recibe `perfil = "SUPERVISOR"` y un token que la API acepta

### Requirement: Rechazo indistinguible
Para un usuario inexistente, inactivo o con contraseña incorrecta, la API SHALL responder `401` con el mismo cuerpo `{"ok":false,"msg":"Usuario o contraseña incorrectos"}` y realizar el mismo trabajo de hash.

#### Scenario: Usuario inexistente vs. clave incorrecta
- **WHEN** se intenta `NO.EXISTE` y luego `ADMIN.DEMO` con una clave errónea
- **THEN** ambas respuestas son idénticas

#### Scenario: Usuario dado de baja
- **WHEN** `BAJA.DEMO` envía su contraseña correcta
- **THEN** recibe `401`

### Requirement: Normalización del usuario
El servidor SHALL aplicar `strip()` y mayúsculas al usuario, y truncarlo a 30 caracteres, antes de buscarlo y de contar intentos.

#### Scenario: Minúsculas
- **WHEN** se envía `sup.demo`
- **THEN** ingresa como `SUP.DEMO`

### Requirement: Límite de intentos
Tras 5 intentos fallidos del mismo usuario desde la misma IP en 15 minutos, la API SHALL responder `429` hasta que pase la ventana.

#### Scenario: Sexto intento
- **WHEN** se envían 6 contraseñas incorrectas seguidas para el mismo usuario
- **THEN** las 5 primeras reciben `401` y la sexta `429`

### Requirement: Verificación estricta del token
La API SHALL rechazar con `401` un token sin `Bearer`, con firma alterada, con `alg` distinto de `HS256`, vencido o con otra `campana`.

#### Scenario: alg none
- **WHEN** se envía un token con cabecera `{"alg":"none"}`
- **THEN** la API responde `401`

### Requirement: Sesión vencida en el front
Ante un `401` en un pedido de datos hecho con el token vigente, el front SHALL volver al login con el mensaje «Tu sesión venció. Ingresa de nuevo.».
