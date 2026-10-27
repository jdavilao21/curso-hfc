# app-shell Specification

## Purpose
Define qué partes del front de HFC existen en la versión del curso y cómo se cargan: pestañas del alcance del PRD, librerías externas verificadas y ninguna referencia a sistemas de producción.

## Requirements

### Requirement: Solo las pestañas del alcance
El menú lateral SHALL ofrecer exactamente las pestañas Diario, Intervalos, Supervisores y Asesores, y el HTML no SHALL contener las secciones, ventanas ni scripts de Detalle TNPS, Horas, Oportunidades de migración, Llamadas salientes, panel del asesor ni descargas registro por registro.

#### Scenario: Menú del administrador
- **WHEN** un ADMINISTRADOR ingresa
- **THEN** ve cuatro botones en el menú: Diario, Intervalos, Supervisores y Asesores

#### Scenario: Sin manejadores huérfanos
- **WHEN** se recorren todos los `onclick` de `web/index.html`
- **THEN** cada función invocada existe en `web/js/`

### Requirement: Librerías externas con integridad
Cada `<script>` cargado desde un CDN SHALL declarar `integrity` (SHA-384) y `crossorigin="anonymous"`.

#### Scenario: Script alterado en el CDN
- **WHEN** el archivo servido por el CDN no coincide con el hash declarado
- **THEN** el navegador no lo ejecuta

### Requirement: Sin referencias a producción
El front SHALL hablar solo con su propio origen (`CFG.API = '/api'`) y no SHALL contener dominios internos, IPs, códigos de usuario reales ni URLs de webhooks de n8n.

#### Scenario: Búsqueda de referencias
- **WHEN** se busca `metadatape`, `gean8n`, `161.132` o un código `E` + 7 dígitos en `web/`
- **THEN** no hay coincidencias
