## ADDED Requirements

### Requirement: Carga inicial
Tras el ingreso, el front SHALL pedir `hfc-diario` y `hfc-supervisores` en paralelo y abrir Diario en el último período con datos.

#### Scenario: Período por defecto
- **WHEN** un usuario ingresa
- **THEN** el selector de período de Diario muestra `202609`

### Requirement: Pestañas por perfil
El perfil `CLIENTE CLARO` SHALL ver Diario, Intervalos y Supervisores, pero no Asesores.

### Requirement: Filtros recalculan sin recargar
Cambiar un filtro SHALL recalcular tarjetas, gráficos y tablas en el navegador, sin nuevos pedidos a la API.

#### Scenario: Cambio de período
- **WHEN** se cambia de `202609` a `202608` en Diario
- **THEN** el valor de «Llam. Recibidas» cambia

### Requirement: Exportar a Excel
Cada tabla SHALL exportarse a `.xlsx` desde el mismo arreglo que se ve en pantalla, con el subtítulo «Elaborado por la Jefatura de Planificación y Métricas · GEA».

### Requirement: Errores visibles
Ante un `5xx` o un error de red, el front SHALL mostrar «No se pudo cargar los datos (…)» en el aviso de carga; «Actualizar» SHALL reintentar.

### Requirement: Textos de la API como texto
Antes de guardar una respuesta, el front SHALL quitar `< > " \`` de todos los textos (`limpiarTextos`), para que un nombre de la nómina no pueda inyectar HTML.
