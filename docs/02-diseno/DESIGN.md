---
name: Panel HFC — GEA
colors:
  # Tema noche (por defecto) — web/css/estilos.css :root
  bg: '#0e1220'
  surface: '#151a2b'
  surface2: '#1b2236'
  surface3: '#222a41'
  border: '#2d3651'
  text: '#e7ebf5'
  muted: '#8d97b3'
  dim: '#5b6582'
  accent: '#3b82f6'
  accent-ink: '#60a5fa'
  accent2: '#7c8aa5'
  good: '#6fae7d'
  good-bg: '#1b2b20'
  warn: '#d1a054'
  warn-bg: '#332a17'
  bad: '#c96a5e'
  bad-bg: '#331d1a'
  # Tema día — body.day
  day-bg: '#f1f4fa'
  day-surface: '#ffffff'
  day-text: '#151a2b'
  day-accent: '#d32f36'
  # Login — web/css/login-gea.css
  login-bg: '#0b0b0d'
  login-accent: '#ff4d5e'
typography:
  sans: "'Inter', 'Segoe UI', system-ui, sans-serif"
  mono: "'Consolas', 'SFMono-Regular', ui-monospace, monospace"
  login: "'DM Sans', 'Manrope'"
  kpi-value: 26px / 700
  kpi-title: 12.5px / 650
  table-row: 12.5px
  table-head: 11px
radius:
  sm: 6px
  md: 10px
  lg: 16px
  pill: 999px
---

# Sistema visual — Panel HFC

Fuente: el CSS real del proyecto (`web/css/`). Este documento no inventa tokens: describe los que
ya usa la interfaz, para que cualquier cambio nuevo se vea parte del mismo sistema.

## Marca y estilo

Tablero operativo de un call center: **denso pero legible**, pensado para mirarse de reojo
durante el turno y para proyectarse en una TV del piso. Fondo oscuro por defecto (reduce la
fatiga en jornadas de 8 h), color solo donde hay una señal (semáforo) y números grandes.
El login es la única pantalla "de marca": rojo y negro, con la mascota GEA.

## Colores

| Token | Noche | Día | Uso |
|---|---|---|---|
| `--bg` | `#0e1220` | `#f1f4fa` | Fondo de página |
| `--surface` / `2` / `3` | `#151a2b` / `#1b2236` / `#222a41` | `#ffffff` / `#e9eef7` / `#dfe6f2` | Tarjetas, paneles, filas alternas |
| `--text` / `--muted` / `--dim` | `#e7ebf5` / `#8d97b3` / `#5b6582` | `#151a2b` / `#55607a` / `#8d97b3` | Texto principal, secundario, terciario |
| `--accent` | `#3b82f6` | `#d32f36` | Pestaña activa, botón primario, período |
| `--good` / `--warn` / `--bad` | `#6fae7d` / `#d1a054` / `#c96a5e` | `#2f8055` / `#a8763a` / `#b8564a` | **Semáforo** de KPI vs. meta |

Regla del semáforo: verde si cumple la meta, ámbar si está a menos de 10 puntos, rojo si está
por debajo. El color nunca es la única señal: la tarjeta muestra además la meta y la variación
(▲/▼).

Temas adicionales: **iOS** (`tema-ios.css`, azul sistema y radios grandes) y **Neón**
(`tema-neon.css`, para el Modo TV).

## Tipografía

- **Inter** para todo el texto; **monoespaciada** para rótulos de sección y píldoras de período
  (`RESUMEN DIARIO · 202609`).
- Valor de KPI: 26 px / 700, con interletrado negativo. Título de KPI: 12.5 px / 650.
- **Tablas compactas** (`tablas-compactas.css`): filas a 12.5 px, encabezados a 11 px, relleno
  de celda 3×8 px, filas de ~24 px. En Modo TV (`body.tv-on`) se vuelve a la letra grande.

## Espaciado y layout

- Barra lateral fija de 190 px con las pestañas; encabezado con usuario, perfil y acciones.
- Contenido en grilla de tarjetas KPI (`kpi-strip`) de 2 a 4 columnas, luego gráficos y tabla.
- A 1366 px de ancho ninguna tabla tiene desplazamiento horizontal: los encabezados largos se
  abrevian y el nombre completo va en un tooltip.

## Elevación y profundidad

Una sola sombra (`--shadow`) para modales y tarjetas flotantes. Las tarjetas del tablero no
tienen sombra: se separan por superficie y borde de 1 px (`--border`). La tarjeta "destacada"
(la del KPI con peor desvío) lleva un borde del color del semáforo.

## Formas

Radios `6 / 10 / 16 / 999 px`. Botones y filtros con radio 10 px; píldoras (perfil, período,
semáforo) totalmente redondeadas.

## Componentes

### Tarjeta KPI (`kpi-v2`)
Ícono + título, valor grande con color de semáforo, línea de contexto (meta, numerador y
denominador) y *sparkline* de la serie del período con la variación contra el día anterior.

### Filtros
Fila de controles con rótulo en mayúsculas pequeñas. Al cambiar un filtro, las barras y los
números hacen una **transición FLIP** de ~380 ms (`22-transicion-filtros.js`): cada barra pasa
de su valor anterior al nuevo. Se respeta `prefers-reduced-motion`.

### Tablas
Ordenables por clic en el encabezado; el símbolo ▲/▼ aparece solo en la columna ordenada.
Columnas configurables («⊞ Columnas · KPIs»). Fila de total al pie.

### Login
Escena con la mascota GEA; el formulario aparece con una animación al hacer clic en ella (o
al enfocar con el teclado). Mensajes de error en una franja roja bajo el botón.

### Pie de página del área
En todas las pestañas: «Jefatura de Planificación y Métricas», logo GEA y la campaña.
