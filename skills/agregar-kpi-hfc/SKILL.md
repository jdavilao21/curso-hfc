---
name: agregar-kpi-hfc
description: Usar cuando el usuario pida agregar una nueva métrica o tarjeta KPI al Panel HFC (por ejemplo «%Hold», «%Corte cliente», «Transferencias IVR»), para que aparezca en la base, en la API, en las tarjetas, en la tabla, en el tooltip y en el Excel, con su test.
---

## Objetivo

Agregar un KPI de punta a punta sin romper la regla de «una sola verdad»: se calcula una sola vez, en `web/js/02-engine.js`, a partir de **sumas** que vienen de la base.

## Antes de empezar

1. OBLIGATORIO: preguntar al usuario la **fórmula** (numerador ÷ denominador), la **meta** y si es «mayor es mejor» o «menor es mejor». No la inventes.
2. Confirmar en qué pestañas va (Diario/Intervalos usan `VW_DIARIO`; Supervisores/Asesores usan `VW_SUPERVISORES`).
3. Comprobar que no cae en el «No alcance» del PRD.

## Pasos

1. **Datos** — si el numerador o el denominador no existen como columna:
   - Agregar la columna `INT NOT NULL` a la tabla en `sql/02_esquema.sql` (usar `IF COL_LENGTH(...) IS NULL ALTER TABLE ... ADD`, para que siga siendo idempotente) y a la vista correspondiente.
   - Generarla en `sql/semilla.py` con un rango realista y la misma semilla (no cambiar el orden de las llamadas a `rnd` ya existentes: agregarlas al final, o los demás números cambian y los tests fallan).
2. **API** — no hay que tocarla: las vistas se sirven completas. Si el KPI es sensible para el perfil CLIENTE CLARO, revisar `_agregar_por_supervisor` (las columnas numéricas se suman solas).
3. **Motor** — agregar la columna a `SUMK` y calcular el KPI en `M()` / `MSup()` de `web/js/02-engine.js`, protegiendo el denominador cero (devolver `null` y mostrar «—», nunca NaN).
4. **Tarjeta** — agregarla en `web/js/17-tarjetas.js` con `sem(valor, meta, umbral)` para el semáforo.
5. **Tabla y Excel** — columna en la tabla (con `data-col` y encabezado corto), en `10-columnas.js` (para «⊞ Columnas · KPIs») y en el export de `06-export.js` (el Excel sale del mismo arreglo).
6. **Tooltip** — fórmula en `web/js/16-tooltips.js`.
7. **Test** — un caso en `tests/tablero.spec.js` que compruebe que la tarjeta aparece y que su valor no es `NaN`.

## Verificación

- `python sql/semilla.py` dos veces sin error; `cd api && python -m pytest -q`; `npx playwright test`.
- A 1366 px de ancho, la tabla no debe tener desplazamiento horizontal.
