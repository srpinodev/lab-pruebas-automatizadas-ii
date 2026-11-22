# Paso 7 — Automatización con Playwright

## Cómo correrlo

```bash
# Terminal 1
cd app && npm install && npm start
# Terminal 2
cd automation && npm install && npx playwright install chromium
npm run test:headed
npm run report
```

## Qué hay en `automation/tests/`

| Archivo | Contenido | Origen |
|---|---|---|
| `e2e-stock-in-out-alerta.spec.ts` | Flujo del prompt 04: login, crear producto con SKU dinámico, IN 12, OUT 9, verificar stock 3 en Productos y que aparezca en Alertas (mín 5). Es TC-E2E-01 de la suite | IA (prompt 04 + prompt de depuración) con una corrección del equipo |
| `stockpascual-criterios.spec.ts` | 7 pruebas de regresión de criterios de aceptación (el Top 8 del Paso 3). Las que reproducen un bug confirmado llevan `test.fail()`: Playwright las cuenta como "fallo esperado" | Equipo, a partir del Top 8 que sugirió la IA en el refino |
| `stockpascual-smoke.spec.ts` | Smoke del repositorio (sin cambios) | Docente |

## Cómo se llegó al test que pasa (3 iteraciones)

| # | Versión | Resultado | Archivo |
|---|---|---|---|
| 1 | Código de la IA sin cambios | **Falla** en "Crear producto": la IA inventó la etiqueta "Precio"; la real es "Precio (COP)". Timeout de 60 s | `01_corrida_codigo_ia_sin_cambios.txt` |
| 2 | Código corregido por la IA con el prompt de depuración (le pasamos el error y los textos y roles reales del inspector) | Avanza hasta "Registrar IN" y **falla**: no encuentra el selector de producto | `02_corrida_tras_depuracion.txt` |
| 3 | Corrección del equipo | **Pasa** | `03_corrida_tras_correccion_equipo.txt` |

**La corrección del equipo (iteración 3):** en los `<select>`, `getByLabel('Producto', { exact: true })` compara contra *todo* el texto del `<label>`, que en esta app incluye las opciones ("Producto CAB-USB-01 — Cable…"). Por eso daba 0 elementos. Lo comprobamos con `ariaSnapshot()`: el rol `combobox` sí se llama "Producto". Se cambió a `getByRole('combobox', { name: 'Producto', exact: true })` (y lo mismo para "Tipo"), que además es el selector que pedía el prompt.

## Corrida final (`npm run test:headed`)

`04_corrida_final_test_headed.txt` y el reporte HTML en `reporte-html/` (abrir `reporte-html/index.html`).

- **10 pasadas:** 4 en verde (E2E, TC-SEG-02 y los 2 del smoke) y 6 fallos esperados por bugs confirmados:

| Prueba | Bug | Lo que observó Playwright |
|---|---|---|
| TC-DAS-01 valor del inventario | BUG-03 | Esperado `$ 15.518.000`, recibido `$ 15.518` |
| TC-NEG-01 OUT mayor al stock | BUG-01 | Esperado 400, recibido 201 |
| TC-MOV-04 ADJUST | BUG-02 | Esperado stock "20", recibido "42" |
| TC-NEG-02 SKU duplicado | BUG-06 | Esperado ≥ 400, recibido 201 |
| TC-SEG-03 XSS | BUG-04 | Se ejecutó código del nombre del producto |
| TC-CSV-01 CSV completo | BUG-05 | 14 productos en pantalla, 12 filas en el CSV |

Se revisó el mensaje de cada fallo esperado para confirmar que falla **por el bug** y no por un error del test. Si el equipo de desarrollo corrige un bug, esa prueba pasará "inesperadamente" y la corrida se pondrá roja: es la señal para quitar el `test.fail()`.

Capturas del reporte: `05_reporte_html_resumen.png`, `06_reporte_html_e2e_pasos.png`, `07_reporte_html_fallo_esperado_bug02.png`.

## Riesgos de flakiness (de la IA, verificados)

1. **Estado compartido en memoria:** se resolvió con `workers: 1` en `playwright.config.ts` y un SKU propio por prueba; el valor esperado de TC-DAS-01 se calcula desde el catálogo (otra fuente), no con la fórmula del dashboard.
2. **Carga asíncrona del selector de productos:** `toHaveCount(1)` sobre la opción espera a que el catálogo cargue.
3. **Formato de moneda es-CO:** el espacio entre `$` y el número es no separable (U+00A0); la aserción usa `\s`.
