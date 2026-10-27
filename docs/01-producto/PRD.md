---
title: "Panel de Gestión HFC — Jefatura de Planificación y Métricas"
---

# PRD: Panel de Gestión HFC

## Problema

La campaña **HFC** (atención inbound de Claro Perú, operada por GEA Internacional) se mide hoy
con reportes descargados a mano de la plataforma del cliente (trazabilidad, producción de
agentes y estados de agente). Cada analista arma su propio Excel por campaña y por día, lo que
genera tres problemas reales:

- **Llega tarde.** Supervisores y coordinadores ven el nivel de servicio, el TMG o el TNPS del
  día anterior recién a media mañana, cuando ya no se puede corregir la operación.
- **No hay una sola verdad.** Dos analistas calculan el %NS o el TNPS con fórmulas o cortes
  distintos, y en la reunión con el cliente se discute el número en lugar de la acción.
- **Se pierde el detalle.** Para saber qué supervisor o qué asesor explica una caída hay que
  cruzar tres archivos; casi nunca se hace.

## Usuario objetivo

Tres perfiles, todos internos o del cliente, con usuario y contraseña propios:

- **Administrador** (Jefatura de Planificación y Métricas): ve todo y es quien responde por los
  números ante el cliente.
- **Supervisor**: necesita ver su operación por día, por franja de 30 minutos y por asesor para
  dar feedback en el turno.
- **Cliente Claro**: el analista del cliente que audita los indicadores de la campaña; ve los
  tableros agregados pero **no** el detalle por asesor.

<!-- REVISAR: el perfil AGENTE (asesor que ve solo su propio panel) existe en la versión de
producción, pero queda fuera de esta versión (ver No alcance). -->

## Objetivo / resultado esperado

Outcome de **tiempo a la decisión** y de **una sola verdad**:

- Cualquier perfil autorizado ve los indicadores del día, por franja y por persona en una sola
  pantalla, sin pedirle un Excel a nadie.
- Todas las personas ven el mismo número, calculado con la misma fórmula, sobre la misma fuente.

## Alcance (qué sí incluye esta versión)

- **Ingreso con usuario y contraseña**, con tres perfiles (Administrador, Supervisor, Cliente
  Claro). La sesión dura una jornada de trabajo y, al vencer, el sistema lo avisa y pide volver
  a ingresar (no deja tablas vacías ni errores técnicos).
- **Diario**: tarjetas KPI (TNPS, %Nivel de servicio, %Atención, llamadas recibidas, %CAT,
  TMG real vs. dimensionado, %Ocupación, agentes real vs. requeridos, %Transferencia a
  encuesta) y tabla por día, con filtros de período, semana y rango (7/14/31 días).
- **Intervalos**: los mismos indicadores por franja de 30 minutos para un día, con gráficos.
- **Supervisores**: producción agregada por supervisor (atendidas, TMG, TNPS, CAT, horas
  productivas, transferencias).
- **Asesores**: producción por asesor con filtros de supervisor, coordinador, condición
  laboral, modalidad y contrato; Top/Bottom por TNPS y distribución por cuartil.
- **Exportar a Excel** cada tabla, con el título del tablero y la firma del área.
- **Permisos por perfil**: el perfil Cliente Claro no ve la pestaña Asesores.
- Temas visuales (noche, día, iOS, neón) y **Modo TV** para pantallas del piso.
- **Datos ficticios** pero con la forma y el volumen de la operación real (dos meses, 24
  asesores, 3 supervisores, franjas de 08:00 a 16:30). Esta versión es pública y se usa como
  proyecto del curso: **ningún dato real de Claro ni de GEA sale de producción**.

## No alcance (qué explícitamente no incluye esta versión)

- No incluye el **panel del asesor** (perfil AGENTE) ni «ver como asesor».
- No incluye las pestañas **Detalle TNPS**, **Horas** (control de tiempos),
  **Oportunidades de migración** ni **Llamadas salientes**.
- No incluye las descargas **registro por registro** (TNPS y CAT detallado).
- No incluye la **carga de datos** (ETL desde los Excel de Claro): la demo trae su propia semilla.
- No incluye **sesión única** por usuario ni **ubicación obligatoria** (existen en producción).
- No incluye **alta, baja o cambio de contraseña** desde el producto: los usuarios se crean por script.
- No incluye **tiempo real**: los datos se actualizan al cargar la página o con «Actualizar».

## Criterios de éxito

1. Un supervisor ingresa y ve las cuatro pestañas con datos en menos de 5 segundos.
2. Con una contraseña incorrecta, o con un usuario dado de baja, el sistema no deja entrar y
   muestra el mismo mensaje en ambos casos.
3. El perfil Cliente Claro no puede ver el detalle por asesor desde la interfaz.
4. Al cambiar el período, las tarjetas y la tabla se recalculan sin recargar la página.
5. Cada tabla se exporta a un Excel con los mismos números que se ven en pantalla.
6. Sin un token válido, la API no entrega **ningún** dato, aunque se la llame directo.
7. Para todas las filas: llamadas atendidas + abandonadas = llamadas recibidas.

## Casos borde a contemplar

- **CB-01** Sesión vencida en medio del turno → al pedir datos, vuelve al login con el aviso
  «Tu sesión venció», sin perder la pantalla en un error.
- **CB-02** Alguien prueba contraseñas en serie → después de varios intentos fallidos se bloquea
  temporalmente ese usuario desde esa IP.
- **CB-03** La base de datos no responde → se muestra un aviso claro y el botón «Actualizar»
  permite reintentar; nunca una pantalla en blanco.
- **CB-04** Un filtro deja la tabla sin filas (por ejemplo, un supervisor sin asesores ese
  día) → la tabla muestra «sin datos» y las tarjetas no muestran NaN ni divisiones por cero.
- **CB-05** El usuario escribe su código en minúsculas o con espacios → se normaliza a
  mayúsculas sin espacios antes de validar.
- **CB-06** Un nombre de la nómina trae caracteres como `<` o `"` → se muestra como texto,
  nunca como HTML.

## Supuestos y riesgos abiertos

**Supuestos:**

- Las fórmulas de los KPI son las mismas que ya usa producción (vista `KPIS_PENALIDADES_HFC`) y
  no se rediscuten en esta versión.
- La granularidad de los datos (día × franja de 30 min y día × asesor) alcanza para todas las
  pestañas del alcance.
- El servidor y la base de datos son los que GEA ya opera (VPS Ubuntu con SQL Server); no se
  contrata infraestructura nueva.

**Riesgos:**

- Al ser una demo pública con usuarios de prueba publicados, cualquiera puede entrar. Es
  aceptable **solo** porque los datos son ficticios; si algún día se conecta a datos reales,
  hay que retirar las claves públicas.
- Los permisos por perfil hoy se deciden por pestaña. Si el cliente pide ocultar más detalle
  (por ejemplo, el TNPS por supervisor), habrá que mover esa regla al servidor.
- La demo comparte el servidor SQL con producción. Una consulta pesada de la demo podría
  afectar a los tableros reales; hay que aislarla con usuarios y base propios.
