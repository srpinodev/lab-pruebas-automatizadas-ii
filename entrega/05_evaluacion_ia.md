# Evaluación crítica del uso de IA — Laboratorio Pruebas Automatizadas II + IA

**Equipo:** Juan Pablo Florez, Linda Maria Perez, Duvan Andres Villadiego, Santiago Pino
**Herramienta de IA:** Claude (Anthropic), un solo chat para todo el laboratorio, sin acceso al código ni a la app: solo veía lo que le pegábamos.
**Respuestas crudas:** `evidencias/paso2_riesgos/respuesta_ia_cruda_prompt01.md`, `evidencias/paso3_casos/respuesta_ia_cruda_prompt02.md` y `respuesta_ia_cruda_refino.md`, `evidencias/paso4_ejecucion/respuesta_ia_cruda_prompt03.md`, `evidencias/paso7_automation/respuesta_ia_cruda_prompt04.md` y `respuesta_ia_cruda_depuracion.md`.

## 1. Prompts clave utilizados

Se usaron los 4 archivos de `/prompts` sin cambiar el texto, más el prompt de refino y el de depuración. Los tres que más pesaron:

1. **Prompt 01, análisis de riesgos** (`prompts/01_analisis_riesgos.md`):
   > Actúa como Senior QA / Risk-Based Testing coach en una institución universitaria de Colombia. […] 1) Identifica riesgos de calidad (funcionales, datos, seguridad/roles, usabilidad, integridad, reporting). 2) Para cada riesgo indica: impacto de negocio (Alto/Medio/Bajo), probabilidad, módulo afectado, y cómo lo probarías en 1-2 ideas de prueba. 3) Devuelve una tabla Markdown ordenada por impacto × probabilidad (Top 12). 4) Señala el Top 5 que probarías primero en un piloto de almacén institucional real y justifica en 3 líneas. […]
2. **Prompt de refino** (`prompts/02_casos_de_prueba.md`), pegando nuestra suite de 39 casos ya ajustada a la app real:
   > Aquí está nuestra suite (pega la tabla). Elimina redundancias, mejora datos de prueba y agrega 5 casos de frontera que no estén. Luego dime qué 8 casos automatizarías primero con Playwright y por qué.
3. **Prompt de depuración** (`prompts/04_automatizacion.md`), con el error real y los textos del inspector:
   > La prueba falla en este punto: `locator.fill: Test timeout of 60000ms exceeded … getByRole('dialog').getByLabel('Precio', { exact: true })`. La UI real tiene estos textos/roles: Modal de producto `<dialog id="product-dialog">` con labels "SKU", "Nombre", "Categoría", "Precio (COP)" […]. Corrige el test sin cambiar el objetivo de negocio.

## 2. Qué acertó la IA

- **Los riesgos principales eran reales.** De su Top 12, cinco riesgos se confirmaron como bugs en la app: R1 OUT negativo (BUG-01), R2 ADJUST mal interpretado (BUG-02), R6 valor del inventario (BUG-03), R8 SKU duplicado (BUG-06) y R9 eliminar con movimientos (BUG-09). En las ideas de prueba también anticipó el doble clic (R7, que resultó BUG-17), las cantidades decimales (R4, BUG-19) y reusar el token después de cerrar sesión (R5, BUG-13). En total, 16 de los 19 bugs del reporte salen de alguna idea suya (columna `Sugerido_por_IA`).
- **El refino mejoró la suite de verdad.** Propuso usar el valor inválido pegado a la frontera (OUT de 4 sobre stock 3, en vez de 10), completar los payloads de los casos negativos para que un 400 no tape un 403, hacer los casos independientes y un caso de ADJUST a 0 (TC-FRO-02), que destapó BUG-18.
- **Detalles técnicos finos y correctos.** Advirtió que `Intl.NumberFormat('es-CO')` pone un espacio no separable entre `$` y el número; lo vimos en la app (`$\xa06.841`) y sin ese aviso la aserción del dashboard habría fallado por formato y no por el bug. También acertó los 3 riesgos de flakiness (estado compartido en memoria, carga asíncrona del selector y modales) y su lista de "aserciones que la IA no debería inventar".
- **El prompt de depuración funcionó a la primera para lo que le mostramos:** con los textos del inspector corrigió 10 problemas, varios antes de que fallaran (encabezados en mayúsculas por CSS, dos `<dialog>`, dos headings con "Alertas").

## 3. Qué alucinó o inventó sin evidencia

- **Una semilla completa que no existe.** La primera suite (prompt 02) usó 4 productos inventados (LAB-GUA-001 "Guantes nitrilo", valor 1.641.200) y todos los resultados esperados se calcularon sobre ellos. Hubo que reescribir los 40 casos con la semilla real (CAB-USB-01…, valor 6.841.200).
- **Rutas y mensajes que la app no tiene:** `/login`, `/productos/nuevo`, `/productos/LAB-GUA-001/editar` (la app es de una sola página), y mensajes como "SKU ya existe" o "Stock insuficiente (disponible: 40)".
- **Una matriz de permisos inventada:** supuso que solo el admin hace ADJUST. RF-04 dice que cualquier usuario autenticado, y lo comprobamos con el operador.
- **Paginación inexistente** en TC-28 ("25 productos, 10 por página").
- **Selectores del test sin ver el DOM:** la etiqueta "Precio" (es "Precio (COP)"), `getByText(sku)` que habría encontrado copias en vistas ocultas, y un heading `/alertas/i` que coincide con dos títulos. Ella misma advirtió que no había visto el DOM, pero el código falló igual en la primera corrida.
- **Ruido en la redacción:** en el refino dejó "muestra MOU... no: TEC-MEC-03" dentro de un resultado esperado.

## 4. Riesgos o bugs que la IA no vio y el equipo sí encontró

- **El XSS como riesgo prioritario.** No aparece en su Top 12 de riesgos, aunque RNF-02 lo pide. Su caso TC-35 usaba `<script>alert('xss')</script>`, que **no se ejecuta** cuando se inserta con `innerHTML`: en la app dio 0 alertas. Con `<img src=x onerror=…>` el script corre en la sesión del admin y del operador y puede leer el token (BUG-04). Si hubiéramos confiado en su caso, habríamos marcado CA10 como Pass.
- **El CSV incompleto como riesgo de auditoría:** en riesgos solo habló de tildes, separador y fórmulas. El defecto grave era que el CSV **omite los dos últimos productos** (BUG-05); lo encontramos contando filas contra la pantalla.
- **Bugs de interfaz:** "Cancelar" no cierra el formulario vacío (BUG-14), el historial semilla fuera de orden (BUG-15) y el menú lateral estirado (BUG-16).
- **Dónde estaba la validación rota:** se enfocó en cantidades inválidas en *movimientos* (que la app sí rechaza), mientras que el defecto estaba en el formulario de *producto* (precio y stock negativos, BUG-07 y BUG-10).
- **El último fallo del test:** tras su depuración, `getByLabel('Producto', { exact: true })` seguía devolviendo 0 elementos, porque en un `<select>` el texto del `<label>` incluye las opciones. Lo resolvimos con `ariaSnapshot()` y `getByRole('combobox', { name: 'Producto' })`.

## 5. Falsos positivos: la IA dijo "bug" y no lo era

- **R3 "el stock se puede editar en el CRUD sin movimiento"**, que ella puso en su Top 5. El campo está deshabilitado al editar y, enviando `stock: 999` directo a la API, el stock siguió en 8. No existe.
- **R5 "el permiso del operador solo se oculta en la interfaz"**, también en su Top 5. El backend responde 403 a POST, PUT y DELETE del operador (TC-SEG-02 Pass). El riesgo era razonable para probar, pero no era un bug.

## 6. Momento de mayor valor frente a mayor pérdida de tiempo

| | Descripción |
|--|-------------|
| Mayor valor | El **refino de la suite**: con nuestra tabla ya ajustada a la app, propuso las fronteras exactas, el caso de ADJUST a 0 que destapó BUG-18, el aviso del espacio no separable y un Top 8 de automatización que usamos casi tal cual en `stockpascual-criterios.spec.ts`. Ahí la IA trabajó sobre datos reales y no inventó. |
| Mayor pérdida de tiempo | La **primera suite y el primer test de Playwright**: los dos estaban construidos sobre cosas que la IA no podía ver (semilla, rutas, etiquetas). Hubo que reescribir 40 casos y hacer 3 iteraciones del test (IA → depuración con IA → corrección del equipo) para un flujo de 6 pasos. |

## 7. Reflexión, 10 a 15 líneas

¿Contratar un proceso de QA 100 % reemplazado por IA en la Institución Universitaria Pascual Bravo? Nuestra respuesta es **no**, aunque sí la usaríamos todos los días como asistente.

La IA fue rápida y amplia: en minutos dio 12 riesgos, 40 casos y un test completo, y 16 de los 19 bugs que reportamos salen de alguna idea suya. Pero ninguno de esos bugs existió hasta que alguien lo reprodujo en StockPascual con datos reales y una captura. Sin acceso a la app, la IA inventó una semilla, rutas, mensajes y permisos, y su test falló en la primera corrida por una etiqueta mal escrita.

Lo más delicado fue lo que *no* falló de forma visible. Su caso de XSS con `<script>` habría pasado en verde sobre una app vulnerable que expone el token de sesión, y su Top 5 incluía dos riesgos que no existían (R3 y R5) mientras dejaba fuera el XSS y el CSV incompleto, justo los dos más graves para una auditoría institucional. Un proceso 100 % IA habría entregado un informe convincente con conclusiones equivocadas.

Para el almacén, donde un stock negativo significa insumos entregados que no existen y el valor del inventario sale mil veces menor, se necesita a alguien que decida qué es un bug, valide contra la app y responda por la evidencia. La combinación que nos funcionó fue: la IA propone y acelera, y el equipo verifica, corrige y firma.
