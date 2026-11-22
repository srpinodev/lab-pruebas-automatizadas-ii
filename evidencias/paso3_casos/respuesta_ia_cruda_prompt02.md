# Respuesta cruda de la IA — Prompt 02 (casos de prueba)

- **Herramienta:** Claude (Anthropic), en el mismo chat del Paso 2. Sin acceso al código ni a la app.
- **Prompt:** bloque **Prompt** de `prompts/02_casos_de_prueba.md`, pegado completo.
- **Uso:** se guarda sin editar. La versión refinada por el equipo está en `casos_de_prueba_refinados.xlsx`.

---

Esta es la suite para el MVP de StockPascual, con datos concretos en COP y trazabilidad a los 10 criterios de aceptación (CA). Los valores de inventario que aparecen en los resultados esperados se calcularon con el dataset base D0.

## Dataset base D0 (se restaura antes de cada caso salvo indicación)

| SKU | Nombre | Categoría | Precio (COP) | Stock | Stock mín. | Ubicación | Subtotal (COP) |
|---|---|---|---|---|---|---|---|
| LAB-GUA-001 | Guantes nitrilo talla M x100 | EPP | 25.000 | 40 | 10 | A-01 | 1.000.000 |
| LAB-ALC-002 | Alcohol antiséptico 70% 1L | Químicos | 12.500 | 20 | 5 | B-02 | 250.000 |
| LAB-PAP-003 | Papel filtro cualitativo x100 | Consumibles | 48.900 | 8 | 10 | C-03 | 391.200 |
| LAB-PIP-004 | Pipeta Pasteur plástica x500 | Consumibles | 85.000 | 0 | 2 | C-04 | 0 |

**Línea base D0:** 4 productos totales, 1 con stock bajo (LAB-PAP-003), 1 agotado (LAB-PIP-004), valor de inventario **1.641.200 COP**. M0 es el número de movimientos registrados en D0 y se toma como base para comparar.

**Supuestos que debe confirmar el PO:**
- Un producto tiene stock bajo cuando 0 < stock ≤ mínimo. Los agotados no cuentan como stock bajo.
- Los SKU se comparan sin distinguir mayúsculas ni espacios al inicio o al final.

## Suite de pruebas

| ID | Módulo | Título | Precondiciones | Pasos | Datos de prueba | Resultado esperado | Prioridad | Automatizable |
|---|---|---|---|---|---|---|---|---|
| TC-01 | Login | Login exitoso con rol admin | D0 cargado; sin sesión activa | 1) Abrir /login 2) Ingresar credenciales 3) Clic en "Ingresar" | admin / Admin123! | Redirige al dashboard. Muestra usuario "admin" y opciones de crear, editar y eliminar productos y de ADJUST | P0 | Sí |
| TC-02 | Login | Login exitoso con rol operador | D0 cargado; sin sesión | 1) Abrir /login 2) Ingresar credenciales 3) Clic en "Ingresar" | operador / Oper123! | Redirige al dashboard con usuario "operador". Puede registrar movimientos. No ve opciones de gestión de productos | P0 | Sí |
| TC-03 | Login | Login rechazado con contraseña incorrecta | Sin sesión | 1) Ingresar el usuario válido con contraseña errada 2) Enviar 3) Repetir con usuario inexistente | admin / admin123! ; noexiste / Admin123! | No inicia sesión. El mensaje es genérico ("Usuario o contraseña inválidos") en los dos casos, sin revelar cuál campo falló. Permanece en /login | P1 | Sí |
| TC-04 | Productos | Crear producto válido (CA3) | Sesión admin; D0 | 1) Productos → Nuevo 2) Diligenciar todos los campos 3) Guardar 4) Ir al dashboard | LAB-MAS-005, "Mascarilla N95", EPP, 4.500, stock 100, mín 20, A-02 | Aparece en el listado con los datos exactos. Total de productos = 5. Valor de inventario = 2.091.200 COP (+450.000) | P0 | Sí |
| TC-05 | Productos | Rechazar SKU duplicado exacto (CA2) | Sesión admin; D0 | 1) Nuevo producto 2) Usar un SKU existente 3) Guardar | SKU LAB-GUA-001, "Guantes nitrilo talla L", EPP, 26.000, stock 10, mín 5, A-01 | Rechaza con el mensaje "SKU ya existe". El total sigue en 4 y LAB-GUA-001 no se modifica | P0 | Sí |
| TC-06 | Productos | Rechazar SKU duplicado con diferente capitalización o espacios (CA2) | Sesión admin; D0 | 1) Crear producto con SKU variante 2) Guardar 3) Repetir con la segunda variante | " lab-gua-001 " ; "Lab-Gua-001" | Las dos variantes se rechazan como duplicadas. No se crea una segunda ficha del mismo insumo | P1 | Sí |
| TC-07 | Productos | Rechazar precio negativo (CA3) | Sesión admin; D0 | 1) Nuevo producto con precio negativo 2) Guardar 3) Editar LAB-ALC-002 con precio negativo 4) Guardar | LAB-NEG-007, precio −1 ; LAB-ALC-002 precio −12.500 | Los dos se rechazan con un mensaje de validación. No se crea el producto, el precio de LAB-ALC-002 sigue en 12.500 y el valor sigue en 1.641.200 | P0 | Sí |
| TC-08 | Productos | Rechazar stock inicial negativo (CA3) | Sesión admin; D0 | 1) Nuevo producto con stock negativo 2) Guardar | LAB-NEG-008, "Tubo ensayo 13x100", 1.200, stock −5, mín 10 | Rechaza con un mensaje de validación. No se crea el producto ni aparece en alertas ni en el dashboard | P0 | Sí |
| TC-09 | Productos | Aceptar límites válidos: precio 0 y stock 0 (CA3) | Sesión admin; D0 | 1) Crear producto con precio 0 y stock 0 2) Guardar 3) Ver dashboard | LAB-DON-009, "Bata donada", EPP, 0, stock 0, mín 1, A-03 | Se crea. Aparece como agotado (agotados = 2). El valor de inventario no cambia: 1.641.200 | P1 | Sí |
| TC-10 | Productos | Editar precio y recálculo del valor (CA7) | Sesión admin; D0 | 1) Editar LAB-GUA-001 2) Cambiar el precio 3) Guardar 4) Ver dashboard | Precio 25.000 → 27.000 | El listado muestra 27.000. Valor de inventario = 1.721.200 COP (+80.000) | P1 | Sí |
| TC-11 | Productos | Rechazar campos obligatorios vacíos | Sesión admin; D0 | 1) Nuevo producto 2) Dejar el campo vacío 3) Guardar 4) Repetir por cada campo | SKU vacío; nombre vacío; nombre "   " (solo espacios); precio vacío | Cada intento se rechaza y el mensaje señala el campo. No se crea ningún registro | P1 | Sí |
| TC-12 | Movimientos | Registrar entrada (IN) | Sesión operador; D0 | 1) Movimientos → Nuevo 2) Tipo IN 3) Producto y cantidad 4) Guardar | LAB-ALC-002, IN 30 | Stock 20 → 50. El historial muestra el IN de 30. Valor = 2.016.200 COP (+375.000) | P0 | Sí |
| TC-13 | Movimientos | Registrar salida (OUT) válida | Sesión operador; D0 | 1) Nuevo movimiento 2) Tipo OUT 3) Guardar | LAB-GUA-001, OUT 15 | Stock 40 → 25. El historial muestra el OUT de 15. Valor = 1.266.200 COP (−375.000) | P0 | Sí |
| TC-14 | Movimientos | OUT igual al stock disponible, frontera (CA1) | Sesión operador; D0 | 1) OUT por todo el stock 2) Guardar 3) Ver dashboard | LAB-PAP-003, OUT 8 | Se acepta. Stock = 0. El producto pasa de stock bajo a agotado: stock bajo = 0, agotados = 2. Valor = 1.250.000 COP | P1 | Sí |
| TC-15 | Movimientos | Rechazar OUT mayor al stock (CA1) | Sesión operador; D0 | 1) OUT por encima del stock 2) Guardar | LAB-GUA-001 (stock 40), OUT 41 | Rechaza con un mensaje como "Stock insuficiente (disponible: 40)". El stock sigue en 40 y no se crea movimiento | P0 | Sí |
| TC-16 | Movimientos | Rechazar OUT sobre producto agotado (CA1) | Sesión operador; D0 | 1) OUT de 1 unidad sobre un producto con stock 0 2) Guardar | LAB-PIP-004 (stock 0), OUT 1 | Rechaza. El stock sigue en 0 y no aparece −1 en el listado, el dashboard ni el CSV | P1 | Sí |
| TC-17 | Movimientos | Rechazar cantidades inválidas | Sesión operador; D0 | 1) Registrar un movimiento con cada valor inválido 2) Guardar cada uno | LAB-ALC-002: IN 0, IN −5, OUT −3, IN 2.5, IN "abc", IN vacío | Todos se rechazan. LAB-ALC-002 sigue en 20. En particular, un IN de −5 no puede descontar stock | P1 | Sí |
| TC-18 | Movimientos | ADJUST que baja el stock al valor contado (CA4) | Sesión admin; D0 | 1) Nuevo movimiento 2) Tipo ADJUST 3) Cantidad contada 4) Guardar | LAB-GUA-001 (stock 40), conteo 35 | Stock = 35, no 75 ni 5. El historial registra el ADJUST (diferencia −5). Valor = 1.516.200 COP | P0 | Sí |
| TC-19 | Movimientos | ADJUST que sube el stock al valor contado (CA4) | Sesión admin; D0 | 1) ADJUST con el conteo 2) Guardar | LAB-ALC-002 (stock 20), conteo 23 | Stock = 23, no 43. Valor = 1.678.700 COP (+37.500) | P1 | Sí |
| TC-20 | Movimientos | ADJUST a cero (CA4) | Sesión admin; D0 | 1) ADJUST con conteo 0 2) Guardar 3) Ver dashboard | LAB-PAP-003 (stock 8), conteo 0 | Stock = 0. Agotados = 2 y stock bajo = 0. Valor = 1.250.000 COP | P1 | Sí |
| TC-21 | Movimientos | El movimiento registra autor, fecha y tipo | Sesión operador; D0 | 1) Registrar un OUT 2) Abrir el historial de movimientos | LAB-GUA-001, OUT 2 | La fila muestra tipo OUT, cantidad 2, SKU LAB-GUA-001, usuario "operador" y fecha y hora actuales | P1 | Sí |
| TC-22 | Búsqueda | Búsqueda por nombre sin distinguir mayúsculas (CA5) | Sesión operador; D0 | 1) Buscar cada término en el listado de productos | "guantes", "GUANTES", "GuAnTeS", "nitrilo" | Los cuatro términos devuelven LAB-GUA-001 y nada más | P1 | Sí |
| TC-23 | Búsqueda | Búsqueda por SKU sin distinguir mayúsculas (CA5) | Sesión operador; D0 | 1) Buscar cada término 2) Buscar un SKU inexistente | "lab-alc-002", "LAB-ALC-002", "alc" ; "XYZ-999" | Los tres primeros devuelven LAB-ALC-002. "XYZ-999" muestra "Sin resultados" sin error | P1 | Sí |
| TC-24 | Dashboard | Valor de inventario = Σ(stock × precio) (CA7) | Sesión admin; D0 | 1) Abrir el dashboard 2) Comparar con el cálculo manual de la tabla D0 | D0 | Valor de inventario = **1.641.200 COP** exacto, sin redondeos ni decimales espurios | P0 | Sí |
| TC-25 | Dashboard | Métricas de conteo con D0 | Sesión admin; D0 | 1) Abrir el dashboard 2) Leer cada métrica | D0 | Total productos = 4, stock bajo = 1 (LAB-PAP-003), agotados = 1 (LAB-PIP-004), cantidad de movimientos = M0 | P1 | Sí |
| TC-26 | Alertas | Frontera de stock bajo: stock = mínimo | Sesión admin; D0 | 1) ADJUST de LAB-ALC-002 a 5 2) Ver alertas y dashboard 3) ADJUST a 6 4) Ver de nuevo | LAB-ALC-002 (mín 5): conteo 5, luego 6 | Con 5 aparece en alertas y stock bajo = 2. Con 6 sale de alertas y stock bajo = 1 | P1 | Sí |
| TC-27 | Alertas | La alerta se apaga tras una entrada | Sesión operador; D0 | 1) Verificar que LAB-PAP-003 está en alertas 2) Registrar un IN 3) Ver alertas y dashboard | LAB-PAP-003 (stock 8, mín 10), IN 5 | Stock = 13. Sale de la lista de alertas y stock bajo = 0. Valor = 1.885.700 COP (+244.500) | P1 | Sí |
| TC-28 | Exportación CSV | El CSV exporta todos los productos (CA6) | Sesión admin; D0 + 21 productos extra (25 en total) con paginación de 10 por página y un filtro de búsqueda activo | 1) Aplicar la búsqueda "guantes" 2) Exportar CSV 3) Contar las filas | 25 productos | El CSV trae 25 filas de datos más el encabezado (SKU, nombre, categoría, precio, stock, stock mínimo, ubicación), sin importar la página o el filtro visible. La suma de stock × precio del CSV es igual al valor del dashboard | P1 | Sí |
| TC-29 | Exportación CSV | Caracteres especiales y comas en el CSV | Sesión admin; D0 + producto con caracteres especiales | 1) Crear el producto 2) Exportar 3) Abrir en Excel con configuración regional es-CO | LAB-ÑAN-010, "Papel filtro, cualitativo – Química", 48.900 | "Ñ", la tilde y el guion se ven bien (UTF-8). La coma del nombre no parte la columna. El precio se lee como 48900 | P2 | No (la apertura en Excel es manual; la codificación sí se puede automatizar) |
| TC-30 | Productos | Eliminar producto sin movimientos | Sesión admin; D0 + LAB-MAS-005 creado (TC-04) sin movimientos | 1) Eliminar LAB-MAS-005 2) Confirmar 3) Ver listado, dashboard y CSV | LAB-MAS-005 | Desaparece del listado y del CSV. Total = 4 y valor = 1.641.200 COP | P1 | Sí |
| TC-31 | Productos / Integridad | Eliminar producto con movimientos sin dejar inconsistencias (CA8) | Sesión admin; D0 + IN 30 en LAB-ALC-002 (stock 50) | 1) Intentar eliminar LAB-ALC-002 2) Revisar el historial de movimientos 3) Revisar el dashboard y el CSV | LAB-ALC-002 | Se acepta cualquiera de dos políticas: (a) bloquear con "tiene movimientos asociados", sin cambios; o (b) eliminar o inactivar con total = 3 y valor = 1.391.200 COP, y el IN de 30 sigue visible con su SKU y nombre (no "null" ni vacío). En ningún caso hay error 500, se baja el contador de movimientos o el producto sigue en el CSV | P1 | Sí |
| TC-32 | Seguridad / Roles | El operador no ve acciones de gestión de productos en la interfaz (CA9) | Sesión operador; D0 | 1) Ir a Productos 2) Revisar la barra de acciones y cada fila | — | No aparecen los botones Nuevo, Editar ni Eliminar. Navegar a /productos/nuevo o /productos/LAB-GUA-001/editar redirige o muestra "Acceso denegado" | P0 | Sí |
| TC-33 | Seguridad / Roles | El operador no crea, edita ni elimina productos por API (CA9) | Sesión operador con token o cookie válidos; D0 | 1) Enviar POST de producto 2) Enviar PUT de precio 3) Enviar DELETE, todo con la sesión del operador | POST LAB-HAK-011 ; PUT LAB-GUA-001 precio 1 ; DELETE LAB-PIP-004 | Las tres peticiones responden 403. Los datos quedan como en D0 (total 4, valor 1.641.200) | P0 | Sí |
| TC-34 | Seguridad | Rutas protegidas sin sesión | Sin sesión (o después de cerrar sesión) | 1) Entrar directamente a /dashboard, /productos y /export/csv 2) Cerrar sesión y usar "Atrás" en el navegador | — | Redirige a /login o responde 401. No se descarga el CSV ni se muestran datos en caché tras el cierre de sesión | P1 | Sí |
| TC-35 | Seguridad | No hay XSS almacenado en el nombre de producto (CA10) | Sesión admin; D0 | 1) Crear el producto con el payload 2) Verlo en el listado, las alertas y el dashboard 3) Iniciar sesión como operador y repetir el paso 2 | LAB-XSS-012, nombre `<script>alert('xss')</script>`, stock 1, mín 5 (para que aparezca en alertas) | El texto se muestra literal y escapado en todas las vistas, con los dos roles. No se ejecuta ningún script ni aparece un diálogo | P0 | Sí |
| TC-36 | Seguridad | No hay XSS almacenado en categoría y ubicación (CA10) | Sesión admin; D0 | 1) Crear el producto con los payloads 2) Verlo en el listado, el detalle y el formulario de movimientos (selector de producto) | Categoría `<img src=x onerror=alert(1)>` ; ubicación `"><svg onload=alert(2)>` | Se muestran como texto. No se ejecuta nada y la maquetación no se rompe | P1 | Sí |
| TC-37 | Integridad | Cuadre movimiento ↔ stock ↔ dashboard en una secuencia mixta | Sesión admin; D0 | 1) IN 20 2) OUT 15 3) ADJUST 42 4) OUT 2, todo sobre LAB-GUA-001, revisando el dashboard después de cada paso | LAB-GUA-001 (stock inicial 40) | Stock: 60 → 45 → 42 → 40. Valor: 2.141.200 → 1.766.200 → 1.691.200 → 1.641.200 COP. El historial tiene 4 movimientos en orden y el contador de movimientos queda en M0 + 4 | P0 | Sí |
| TC-38 | Integridad | Un movimiento rechazado no deja rastro | Sesión operador; D0 | 1) Anotar el contador de movimientos y el valor 2) Intentar un OUT de 41 sobre LAB-GUA-001 3) Comparar | LAB-GUA-001, OUT 41 | Contador = M0, valor = 1.641.200 COP, sin fila nueva en el historial y stock en 40 | P1 | Sí |
| TC-39 | Integridad | El doble envío no duplica el movimiento | Sesión operador; D0 | 1) Diligenciar un OUT 2) Hacer doble clic rápido en "Guardar" | LAB-ALC-002, OUT 5 | Un solo movimiento registrado. Stock = 15, no 10. Contador = M0 + 1 | P1 | Sí (con doble clic en Playwright o envío de la petición duplicada) |
| TC-40 | E2E de negocio | Ingreso → salida → alerta → exportación | D0; sesiones admin y operador disponibles | 1) Admin crea el producto 2) Operador registra el IN 3) Operador registra el OUT (entrega al laboratorio de química) 4) Revisar alertas y dashboard 5) Admin exporta el CSV | Crear: LAB-ETA-006, "Etanol absoluto 1L", Químicos, 68.000, stock 0, mín 5, B-05. IN 12, OUT 9 | Después del paso 2: stock 12 y fuera de alertas. Después del paso 3: stock 3. En el paso 4, LAB-ETA-006 aparece en alertas, stock bajo = 2, agotados = 1, total = 5 y valor = 1.845.200 COP (+204.000). En el paso 5, el CSV trae 5 filas y la de LAB-ETA-006 tiene precio 68000 y stock 3 | P0 | Sí |

## Cobertura

| Requisito | Casos | Total |
|---|---|---|
| Funcionales (≥15) | TC-01, 02, 04, 09, 10, 12, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30 | 21 |
| Negativos / validación (≥5) | TC-03, 05, 06, 07, 08, 11, 15, 16, 17 | 9 |
| Seguridad / roles (≥3) | TC-32, 33, 34, 35, 36 | 5 |
| Integridad movimiento ↔ stock ↔ dashboard (≥2) | TC-31, 37, 38, 39 | 4 |
| E2E de negocio (1) | TC-40 | 1 |

**Trazabilidad a los criterios de aceptación:**
- CA1: TC-14, 15, 16
- CA2: TC-05, 06
- CA3: TC-04, 07, 08, 09
- CA4: TC-18, 19, 20
- CA5: TC-22, 23
- CA6: TC-28
- CA7: TC-10, 24, 37
- CA8: TC-30, 31
- CA9: TC-32, 33
- CA10: TC-35, 36

**Criterio de P0 (16 casos):** son los casos sin los cuales el almacén no puede operar o no puede confiar en los datos:
- entrar con los dos roles;
- cargar el catálogo sin SKU duplicados ni valores negativos;
- hacer entradas, salidas y conteos físicos correctos;
- tener el valor de inventario exacto;
- impedir que el operador modifique productos (por interfaz, por API o mediante XSS almacenado, que permitiría robar la sesión del admin).

Las fronteras secundarias, el CSV, la búsqueda y la eliminación quedan en P1/P2. Si fallan, el defecto se registra, pero el piloto puede arrancar con un procedimiento manual de contención.
