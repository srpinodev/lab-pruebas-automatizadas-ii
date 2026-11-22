# Respuesta cruda de la IA — Prompt de refino (casos de prueba)

- **Herramienta:** Claude (Anthropic), mismo chat de los pasos 2 y 3.
- **Prompt:** "Prompt de refino" de `prompts/02_casos_de_prueba.md`, pegado con nuestra suite v1 de 39 casos ya ajustada a la app real (`suite_v1_equipo.md`).
- **Uso:** se guarda sin editar. Lo que el equipo aceptó o descartó está en la hoja `Cambios_vs_IA` de `casos_de_prueba_refinados.xlsx`.

---

Hice las tres cosas: depuré la suite de 39 a 32 casos, corregí los datos de prueba que podían dar falsos positivos y agregué 5 casos de frontera nuevos. La suite queda en **37 casos**. Al final están los 8 que automatizaría primero con Playwright.

Todos los valores de inventario esperados los calculé con la semilla:

- CAB-USB-01: 40 × 18.900 = 756.000
- MOU-WL-02: 8 × 45.900 = 367.200
- TEC-MEC-03: 22 × 189.000 = 4.158.000
- MON-24-04: 3 × 520.000 = 1.560.000
- AUD-BT-05: 0 × 99.000 = 0
- **Total: $ 6.841.200.** Revisé los valores de tu tabla y todos cuadran.

---

## 1. Redundancias eliminadas (7 casos fusionados)

| Caso retirado | Se fusiona en | Motivo |
|---|---|---|
| TC-MOV-05 (ADJUST sube) | TC-MOV-04 (ahora con dos filas de datos) | Es la misma regla (CA4) con otro dato. En Playwright queda como una sola prueba parametrizada |
| TC-MOV-06 (campos del movimiento) | TC-MOV-02 | Los dos son un OUT del operador. Basta con agregar al OUT válido las verificaciones de motivo, usuario, fecha y orden |
| TC-BUS-02 (búsqueda por SKU) | TC-BUS-01 | Es la misma regla de búsqueda sin distinguir mayúsculas (CA5) sobre otro campo |
| TC-DAS-02 (métricas de la semilla) | TC-DAS-01 | Los dos solo leen el dashboard con la semilla. Una sola prueba verifica las 5 tarjetas |
| TC-NEG-07 (editar con precio negativo) | TC-NEG-03 | Es la misma regla (CA3). Ahora un solo caso cubre crear (POST) y editar (PUT) |
| TC-NEG-08 (OUT sobre agotado) | TC-NEG-01 (dos filas de datos) | Es la misma regla (CA1): stock + 1 y stock 0 son dos valores de la misma frontera |
| TC-INT-03 (un rechazo no deja rastro) | TC-NEG-01 | Las verificaciones de "sin fila nueva, contador y valor iguales" pasan al rechazo de negocio. El rechazo de cantidad −3 ya lo cubre TC-NEG-05 |

También hay dos solapamientos parciales:

- **TC-LOG-02 vs TC-SEG-01:** las verificaciones de que el operador *no ve* ciertos botones pasan todas a TC-SEG-01. TC-LOG-02 queda solo como login.
- **TC-ALE-01 vs TC-BUS-03:** el filtro "Solo stock bajo" pasa a TC-ALE-01, que ahora compara tres vistas (Alertas, filtro y tarjeta). TC-BUS-03 queda solo con el filtro por categoría.

## 2. Mejoras de datos de prueba

1. **Los casos negativos deben tener todos los demás campos válidos.** TC-NEG-04 y TC-NEG-06 no traían categoría ni ubicación, y TC-SEG-02 enviaba un POST incompleto. Así, un rechazo puede deberse a otro campo, o a un 400 que tapa el 403, y el caso pasa sin probar lo que dice. Completé los payloads.
2. **Usar el valor inválido más cercano a la frontera:**
   - OUT de 4 sobre stock 3, en vez de OUT de 10.
   - Precio −1 en vez de −1.500.000.
   - Stock −1 en vez de −4.
   - Un bug de tipo "≥ en vez de >" solo aparece en el límite.
3. **Los resultados esperados deben ser verificables.** Cambié "mensaje de validación" y "coherentes" por cifras concretas: productos activos, valor, contador de movimientos y fila en el historial.
4. **Cada caso debe ser independiente.** TC-PRO-04 dependía de TC-PRO-01. Ahora crea su producto por API en el setup.
5. **Evitar choques de SKU.** TC-PRO-01 y TC-E2E-01 usaban el mismo SKU (LAB-ETA-06). TC-PRO-01 pasa a LAB-ISO-06 con el mismo precio y stock, así que sus cifras no cambian.
6. **CSV con más casos difíciles:** comillas dobles y tilde además de la coma.
7. **TC-SEG-03 con stock 1 y mínimo 5,** para que el payload también salga en Alertas y en el Dashboard, que son las vistas con más riesgo.

---

## 3. Suite depurada (37 casos)

Precondición común: **servidor recién iniciado con la semilla** (o reiniciado antes de cada caso), salvo que se indique otra cosa.

| ID | Módulo | Título | Precondiciones | Pasos | Datos de prueba | Resultado esperado | Prioridad | Automatizable |
|---|---|---|---|---|---|---|---|---|
| TC-LOG-01 | Autenticación | Login admin exitoso | Sin sesión | 1) Abrir http://localhost:3080 2) Ingresar usuario y contraseña 3) Clic en Ingresar | admin / Admin123! | Dashboard con el chip "Ana Admin · admin" y el botón "+ Producto" visible | P0 | Sí |
| TC-LOG-02 | Autenticación | Login operador exitoso | Sin sesión | 1) Abrir la app 2) Ingresar credenciales 3) Ingresar | operador / Oper123! | Dashboard con el chip "Carlos Operador · operator". Se ven "+ Movimiento" y "Exportar CSV". Las ausencias se verifican en TC-SEG-01 | P0 | Sí |
| TC-LOG-03 | Autenticación | Credenciales inválidas con mensaje genérico | Sin sesión | 1) Intentar con cada combinación 2) Ingresar | admin / admin123! (cambia una mayúscula); noexiste / Admin123!; admin / (vacío) | No entra en ningún caso. El mensaje "Credenciales inválidas" es idéntico para usuario inexistente y para clave errada, sin revelar cuál falló | P1 | Sí |
| TC-PRO-01 | Productos | Crear producto válido | Sesión admin | 1) + Producto 2) Diligenciar todos los campos 3) Guardar 4) Ir al Dashboard | LAB-ISO-06, "Alcohol isopropílico 1L", Químicos, 68.000, stock 12, mín 5, B-05 | Aparece en Productos con los datos exactos. Productos activos = 6. Valor = $ 7.657.200 (+816.000) | P0 | Sí |
| TC-PRO-02 | Productos | Editar el precio recalcula el valor | Sesión admin | 1) Editar CAB-USB-01 2) Precio 18.900 → 20.000 3) Guardar 4) Dashboard | CAB-USB-01, precio 20.000 | El listado muestra $ 20.000. Valor = $ 6.885.200 (+44.000) | P1 | Sí |
| TC-PRO-03 | Productos | El stock no se puede editar después de crear | Sesión admin | 1) Editar TEC-MEC-03 y revisar el campo Stock inicial 2) (API) PUT /api/products/p3 con stock 999 | TEC-MEC-03 (stock 22) | El campo está deshabilitado y la API ignora el stock enviado: sigue en 22. Movimientos = 2 (no se crea movimiento) | P1 (antes P2, ver nota final) | Sí |
| TC-PRO-04 | Productos | Eliminar producto sin movimientos | Sesión admin. LAB-ISO-06 creado por POST /api/products con el token de admin en el setup | 1) Eliminar LAB-ISO-06 2) Aceptar la confirmación 3) Revisar Productos, Dashboard y CSV | LAB-ISO-06 | Desaparece del listado y del CSV (5 filas). Productos activos = 5. Valor = $ 6.841.200 | P1 | Sí |
| TC-MOV-01 | Movimientos | IN suma al stock | Sesión admin | 1) + Movimiento 2) CAB-USB-01, Entrada (IN), 15, motivo 3) Registrar | CAB-USB-01 (stock 40), IN 15, "Compra OC-2026-118" | Stock = 55. El IN de 15 aparece en Movimientos. Movimientos = 3. Valor = $ 7.124.700 (+283.500) | P0 | Sí |
| TC-MOV-02 | Movimientos | OUT válido resta y queda trazado | Sesión operador | 1) + Movimiento 2) TEC-MEC-03, Salida (OUT), 2, motivo 3) Registrar 4) Ir a Movimientos | TEC-MEC-03 (stock 22), OUT 2, "Entrega laboratorio de sistemas" | Stock = 20. La primera fila del historial (orden descendente) muestra MOU... no: TEC-MEC-03, OUT, 2, el motivo, el usuario operador y la fecha y hora actuales. Movimientos = 3. Valor = $ 6.463.200 | P0 | Sí |
| TC-MOV-03 | Movimientos | OUT igual al stock disponible (frontera aceptada) | Sesión admin | 1) OUT por todo el stock 2) Registrar 3) Dashboard | MON-24-04 (stock 3), OUT 3 | Se acepta. Stock = 0 y estado Agotado. Agotados = 2. Stock bajo = 3 (incluye agotados). Valor = $ 5.281.200 | P1 | Sí |
| TC-MOV-04 | Movimientos | ADJUST fija el stock al conteo físico (parametrizado) | Sesión admin para la fila A, sesión operador para la fila B. Semilla limpia por fila | 1) + Movimiento 2) Tipo Ajuste (ADJUST) con el conteo 3) Registrar 4) Revisar stock, Alertas y Dashboard | **A:** TEC-MEC-03 (stock 22), conteo 20. **B:** MOU-WL-02 (stock 8), conteo 12 | **A:** stock = 20 (ni 42 ni 2), valor = $ 6.463.200. **B:** stock = 12 (ni 20 ni 4), valor = $ 7.024.800, y sigue en Alertas porque 12 ≤ 15. Movimientos = 3 en cada fila | P0 | Sí |
| TC-BUS-01 | Productos | Búsqueda por nombre y SKU sin distinguir mayúsculas | Sesión operador | 1) Productos 2) Buscar cada término por separado | Nombre: "mouse", "MOUSE", "mOuSe". SKU: "mou-wl", "MOU-WL-02". Sin coincidencia: "XYZ-999" | Los 5 primeros términos devuelven solo MOU-WL-02 (Mouse inalámbrico). "XYZ-999" muestra "Sin resultados" sin error | P1 | Sí |
| TC-BUS-03 | Productos | Filtro por categoría | Sesión operador | 1) Elegir la categoría Periféricos 2) Buscar | Periféricos | Devuelve exactamente MOU-WL-02 y TEC-MEC-03 | P2 | Sí |
| TC-DAS-01 | Dashboard | Tarjetas del dashboard con la semilla | Sesión admin | 1) Abrir Dashboard 2) Leer las 5 tarjetas y comparar con el cálculo manual | 40×18.900 + 8×45.900 + 22×189.000 + 3×520.000 + 0×99.000 | Productos activos 5, Stock bajo 3, Agotados 1, Movimientos 2, Valor inventario **$ 6.841.200** | P0 | Sí |
| TC-ALE-01 | Alertas | Alertas, filtro y tarjeta coinciden | Sesión operador | 1) Ir a Alertas stock 2) Productos → marcar "Solo stock bajo" → Buscar 3) Dashboard | Semilla | Alertas lista MOU-WL-02 (8/15), MON-24-04 (3/4) y AUD-BT-05 (0/8), y no lista CAB-USB-01 ni TEC-MEC-03. El filtro devuelve los mismos 3 y la tarjeta muestra Stock bajo = 3 | P1 | Sí |
| TC-ALE-02 | Alertas | La alerta se apaga tras un IN | Sesión operador | 1) Confirmar MOU-WL-02 en Alertas 2) IN 10 3) Volver a Alertas | MOU-WL-02 (stock 8, mín 15), IN 10 | Stock = 18. Sale de Alertas. Stock bajo = 2. Valor = $ 7.300.200 | P1 | Sí |
| TC-CSV-01 | Exportación | El CSV incluye todos los productos y cuadra con el dashboard | Sesión admin | 1) Exportar CSV 2) Contar filas 3) Sumar price × stock del archivo | Semilla (5 productos) | inventario.csv con encabezado sku,name,category,price,stock,minStock,location y 5 filas de datos. La suma de price × stock del CSV es 6841200, igual a la tarjeta | P0 | Sí |
| TC-CSV-02 | Exportación | Comas, comillas y tildes no rompen el CSV | Sesión admin | 1) Editar el nombre de TEC-MEC-03 2) Exportar CSV 3) Revisar la fila | Nombre: `Teclado mecánico, español "ISO"` | La fila conserva 7 columnas. El campo sale como `"Teclado mecánico, español ""ISO"""` y la "á" es legible (UTF-8) | P2 | Sí |
| TC-NEG-01 | Movimientos | OUT por encima del stock se rechaza sin dejar rastro (parametrizado) | Sesión admin. Semilla limpia por fila | 1) Anotar Movimientos y Valor 2) + Movimiento, OUT 3) Registrar 4) Comparar | **A:** MON-24-04 (stock 3), OUT 4 (stock + 1). **B:** AUD-BT-05 (stock 0), OUT 1 | Rechazo con mensaje en los dos casos. El stock sigue en 3 y en 0, nunca negativo. Movimientos = 2, Valor = $ 6.841.200, sin fila nueva en el historial | P0 | Sí |
| TC-NEG-02 | Productos | SKU duplicado se rechaza | Sesión admin | 1) + Producto con SKU existente y el resto válido 2) Guardar | CAB-USB-01, "Cable USB-C 2m", Accesorios, 24.900, stock 12, mín 5, A-02 | Mensaje de SKU duplicado. Productos activos = 5 y CAB-USB-01 sigue con 18.900 y stock 40 | P0 | Sí |
| TC-NEG-03 | Productos | Precio negativo se rechaza al crear y al editar | Sesión admin | 1) + Producto con precio −1 → Guardar 2) Editar AUD-BT-05 con precio −1 → Guardar | Crear: PRY-EPS-06, "Proyector Epson EB-X51", Pantallas, −1, stock 2, mín 1, A-04. Editar: AUD-BT-05 precio −1 | Mensaje de validación en el campo Precio en los dos casos. Productos activos = 5. AUD-BT-05 sigue en 99.000. Valor = $ 6.841.200 | P0 | Sí |
| TC-NEG-04 | Productos | Stock inicial negativo se rechaza | Sesión admin | 1) + Producto con stock −1 y el resto válido 2) Guardar | PRY-EPS-07, "Proyector Epson EB-X51", Pantallas, 1.500.000, stock −1, mín 1, A-04 | Mensaje de validación en el campo Stock. No se crea: productos activos = 5 y no aparece en Alertas | P0 | Sí |
| TC-NEG-05 | Movimientos | Cantidad 0 o negativa se rechaza | Sesión operador | 1) UI: OUT con cantidad 0 2) API: POST /api/movements IN −5 | CAB-USB-01: OUT 0; IN −5 | La UI no deja registrar 0 (mínimo 1). La API responde 400 "Cantidad debe ser mayor a 0". Stock 40, Movimientos 2 | P1 | Sí |
| TC-NEG-06 | Productos | SKU vacío o solo con espacios se rechaza | Sesión admin | 1) + Producto con cada variante de SKU y el resto válido 2) Guardar | SKU "" y "   ". "Kit cables de red Cat6", Accesorios, 35.000, stock 10, mín 2, A-02 | Mensaje de SKU obligatorio (RF-02) en las dos variantes. Productos activos = 5 | P1 | Sí |
| TC-SEG-01 | Seguridad | El operador no ve acciones de gestión de productos | Sesión operador | 1) Revisar la barra superior 2) Ir a Productos y revisar cada fila | — | No aparece "+ Producto" ni botones Editar o Eliminar en ninguna de las 5 filas | P0 | Sí |
| TC-SEG-02 | Seguridad | El operador no crea, edita ni elimina por API | Sesión operador; token del operador | 1) POST /api/products 2) PUT /api/products/p3 3) DELETE /api/products/p3, todo con el token del operador | POST con payload válido: OPE-TST-01, "Hub USB 4 puertos", Accesorios, 45.000, stock 5, mín 2, A-02. PUT p3 con precio 1. DELETE p3 | Las tres responden 403 "Solo admin puede realizar esta acción" (no 400). Productos activos 5, TEC-MEC-03 sigue en 189.000, valor $ 6.841.200 | P0 | Sí |
| TC-SEG-03 | Seguridad | XSS almacenado en el nombre del producto | Sesión admin | 1) + Producto con el payload en Nombre 2) Revisar Productos, Alertas, Dashboard y el selector de + Movimiento 3) Cerrar sesión, entrar como operador y repetir el paso 2 | XSS-TEST-07, nombre `<img src=x onerror=alert('XSS')>`, Accesorios, 10.000, stock 1, mín 5, A-02 | El nombre se ve como texto literal en las 4 vistas con los dos roles. No aparece ningún diálogo alert | P0 | Sí |
| TC-SEG-04 | Seguridad | API protegida sin sesión | Sin token | 1) GET /api/products 2) GET /api/export/csv, sin encabezado Authorization | — | Las dos responden 401 "No autenticado" y no devuelven datos | P1 | Sí |
| TC-SEG-05 | Seguridad | El token deja de servir al cerrar sesión | Sesión operador | 1) Copiar el token (localStorage sp_token) 2) Cerrar sesión 3) GET /api/products con ese token | Token del operador | 401: la sesión quedó invalidada en el servidor | P1 | Sí |
| TC-INT-01 | Integridad | Cuadre movimiento ↔ stock ↔ dashboard en una secuencia mixta | Sesión admin | 1) IN 20 2) OUT 15 3) ADJUST 42 4) OUT 2, todo sobre CAB-USB-01, revisando el Dashboard después de cada paso | CAB-USB-01 (stock 40, 18.900) | Stock: 60 → 45 → 42 → 40. Valor: 7.219.200 → 6.935.700 → 6.879.000 → 6.841.200. Movimientos = 6 | P0 | Sí |
| TC-INT-02 | Integridad | Eliminar producto con movimientos no deja inconsistencias | Sesión admin | 1) Eliminar CAB-USB-01 (tiene 2 movimientos semilla) 2) Revisar Movimientos 3) Revisar Dashboard y CSV | CAB-USB-01 | **Si se bloquea:** mensaje claro, productos 5, valor $ 6.841.200, Movimientos 2. **Si se elimina o inactiva:** productos 4, valor $ 6.085.200, CSV con 4 filas, Movimientos 2, y las 2 filas del historial siguen mostrando CAB-USB-01 y su nombre. Nunca: error 500, filas con SKU vacío o "undefined", ni el contador en 0 | P1 | Sí |
| TC-E2E-01 | E2E | Ingreso → salida → alerta → exportación | Sesiones admin y operador (dos contextos) | 1) Admin crea el producto con stock 0 2) Operador registra IN 12 3) Operador registra OUT 9 (entrega al laboratorio de química) 4) Revisar Alertas y Dashboard 5) Admin exporta el CSV | LAB-ETA-06, "Etanol absoluto 1L", Químicos, 68.000, stock 0, mín 5, B-05 | Después del IN: stock 12 y fuera de Alertas. Después del OUT: stock 3 y aparece en Alertas. Dashboard: Stock bajo 4, Agotados 1, Valor $ 7.045.200, Movimientos 4 (si la creación no genera movimiento). El CSV tiene 6 filas y la de LAB-ETA-06 trae price 68000 y stock 3 | P0 | Sí |
| **TC-FRO-01** (nuevo) | Alertas | Frontera stock = mínimo y mínimo + 1 | Sesión operador | 1) IN 1 sobre MON-24-04 → revisar Alertas y Dashboard 2) IN 1 más → revisar de nuevo | MON-24-04 (stock 3, mín 4) | Con stock 4 (= mín) **sigue** en Alertas (4/4), Stock bajo = 3, Valor = $ 7.361.200. Con stock 5 **sale** de Alertas, Stock bajo = 2, Valor = $ 7.881.200 | P1 | Sí |
| **TC-FRO-02** (nuevo) | Movimientos | ADJUST a 0 aceptado y ADJUST −1 rechazado | Sesión admin | 1) ADJUST de TEC-MEC-03 a 0 2) Dashboard 3) (API) ADJUST −1 sobre TEC-MEC-03 | TEC-MEC-03 (stock 22): conteo 0, luego −1 | Con 0: stock 0, Agotado, Agotados 2, Stock bajo 4, Valor $ 2.683.200, Movimientos 3. Con −1: 400, el stock sigue en 0 y Movimientos en 3 | P1 | Sí |
| **TC-FRO-03** (nuevo) | Productos | Precio 0 y stock inicial 0 se aceptan (límite válido de CA3) | Sesión admin | 1) + Producto con precio 0 y stock 0 2) Guardar 3) Dashboard y CSV | DON-MOU-06, "Mouse donado", Periféricos, 0, stock 0, mín 1, A-05 | Se crea. Productos 6, Agotados 2, Stock bajo 4, Valor sin cambio en $ 6.841.200. Fila en el CSV con price 0 y stock 0 | P1 | Sí |
| **TC-FRO-04** (nuevo) | Productos | SKU duplicado con otras mayúsculas o espacios | Sesión admin | 1) + Producto con cada variante y el resto válido 2) Guardar | "cab-usb-01" y " CAB-USB-01 ", con "Cable USB-C 2m", Accesorios, 24.900, stock 12, mín 5, A-02 | Las dos variantes se rechazan como duplicadas y productos activos sigue en 5. Si la app las acepta, registrarlo como hallazgo: el stock de un mismo insumo queda partido en dos fichas | P1 | Sí |
| **TC-FRO-05** (nuevo) | Movimientos | Cantidad mínima válida (1) y decimal rechazado | Sesión operador | 1) OUT 1 sobre CAB-USB-01 2) (API) OUT 0.5 sobre CAB-USB-01 3) UI: intentar escribir 0,5 | CAB-USB-01 (stock 40) | OUT 1: stock 39, Valor $ 6.822.300, Movimientos 3. OUT 0.5: 400 y el stock sigue en 39. La UI no acepta 0,5 (paso de 1) | P1 | Sí |

(Corrección de la fila TC-MOV-02: la primera fila del historial debe mostrar TEC-MEC-03, OUT, 2, el motivo "Entrega laboratorio de sistemas", el usuario operador y la fecha y hora actuales.)

**Qué frontera cubre cada caso nuevo:**

| Caso | Frontera |
|---|---|
| FRO-01 | Regla "≤ mínimo" en los dos lados del límite |
| FRO-02 | Valor más bajo válido e inválido del conteo físico |
| FRO-03 | Lado válido de CA3; los casos NEG solo prueban el lado inválido |
| FRO-04 | Igualdad de SKU (CA2) con normalización |
| FRO-05 | Granularidad de la cantidad: entero mínimo y decimal |

---

## 4. Los 8 casos que automatizaría primero con Playwright

Antes de la lista: TC-LOG-01 y TC-LOG-02 no van como pruebas sueltas. Se convierten en el **setup de autenticación** (un `storageState` por rol), así que se ejecutan implícitamente en cada corrida.

| Orden | Caso | Por qué primero |
|---|---|---|
| 1 | **TC-DAS-01** | Es el oráculo base: si la semilla o el valor no dan $ 6.841.200, todos los demás valores esperados quedan inválidos. Sirve de smoke test y tarda segundos |
| 2 | **TC-NEG-01** | Cubre CA1 en su frontera exacta (stock + 1 y agotado) y verifica que el rechazo no deje rastro. Es lo primero que se rompe al tocar la lógica de movimientos |
| 3 | **TC-MOV-04** | Cubre CA4. Con un `for` sobre las filas de datos, una sola prueba cubre subir y bajar. Si falla, vuelve el problema de Excel que motivó el proyecto |
| 4 | **TC-INT-01** | Son 12 verificaciones en una secuencia (stock, valor y contador en 4 pasos). A mano es lento y fácil de equivocarse. En automatización es la mejor red contra la desincronización entre stock y dashboard |
| 5 | **TC-SEG-02** | Usa el contexto `request` de Playwright, sin interfaz, y corre en milisegundos. Es la única prueba que demuestra que CA9 se cumple en el backend: ocultar botones (SEG-01) no protege |
| 6 | **TC-SEG-03** | Con `page.on('dialog')`, la prueba falla automáticamente si salta un alert, en las 4 vistas y con los dos roles (dos contextos). A mano es fácil pasar por alto el `onerror` del selector de movimientos |
| 7 | **TC-NEG-02 + TC-FRO-04** | Cubre CA2 con tres filas de datos (exacto, minúsculas, espacios). Es barato y protege contra el stock partido en fichas duplicadas |
| 8 | **TC-E2E-01** | Es el flujo de negocio completo con dos roles a la vez y la descarga del CSV (`waitForEvent('download')`, luego se parsea el archivo). Funciona como prueba de regresión antes de cada entrega al almacén |

Así quedan cubiertos con automatización CA1, CA2, CA4, CA7, CA9, CA10 y, a través del E2E, CA6.

**Siguiente tanda:** TC-NEG-03/04 + TC-FRO-03 (CA3), TC-CSV-01, TC-FRO-01, TC-PRO-03 y TC-SEG-05.

**Notas para implementarlo:**

- **Reinicio de datos:** todos los casos asumen la semilla limpia. Agreguen un endpoint de reset solo para pruebas o reinicien el servidor por archivo de prueba. Mientras no exista, usen `workers: 1`, porque en paralelo los valores esperados chocan.
- **Preparar por API, verificar por interfaz:** crear productos y movimientos previos con `request` y dejar la interfaz solo para lo que se está probando. Así las pruebas son más rápidas y menos frágiles.
- **Formato de moneda:** `Intl.NumberFormat('es-CO')` pone un espacio no separable (U+00A0) entre "$" y el número. Comparen con una expresión regular (`/\$\s?6\.841\.200/`) o normalicen el texto, o la prueba fallará sin que haya un bug real.
- **Valores esperados fijos:** escriban los valores esperados a mano, a partir de la semilla. No los calculen con la misma fórmula que usa la app, porque si la fórmula está mal, la prueba también lo estará y pasará igual.

## 5. Dos puntos para decidir con el equipo

- **TC-PRO-03 debería subir de P2 a P1 o a P0.** Si el stock se puede editar sin generar movimiento, el historial deja de explicar el stock, que es la causa raíz del problema de negocio.
- **Hay que confirmar si crear un producto con stock inicial mayor a 0 genera un movimiento.** De eso depende el contador "Movimientos" esperado en TC-PRO-01 y TC-E2E-01.
