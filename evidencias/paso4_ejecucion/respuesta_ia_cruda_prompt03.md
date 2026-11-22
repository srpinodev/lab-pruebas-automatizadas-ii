# Respuesta cruda de la IA — Prompt 03 (misiones exploratorias)

- **Herramienta:** Claude (Anthropic), mismo chat de los pasos anteriores.
- **Prompt:** bloque **Prompt** de `prompts/03_exploracion_guiada.md`.
- **Misión elegida por el equipo:** A, integridad de stock. Ver `mision_a_notas.md`.

---

Aquí tienes las 3 misiones (charters) para sesiones exploratorias de 25 minutos. Cada una apunta a un tipo de riesgo y trae lo que necesitas para saber si encontraste algo y para no perder el foco. No describo bugs esperados: describo dónde mirar y qué cuenta como señal.

## Reglas comunes de las tres sesiones

- **Reparto del tiempo:** 3 min para preparar (reiniciar la semilla, abrir pestañas, tener la hoja de notas lista), 18 min para explorar y 4 min para cerrar (ordenar notas y clasificar hallazgos).
- **Antes de mirar el resultado, escribe qué esperas.** Si no anotaste la predicción, no puedes saber si lo que viste está mal.
- **Hay que distinguir tres cosas:**
  - **Bug:** contradice una regla acordada o una fuente confiable.
  - **Pregunta:** la regla no está clara. Ejemplo: "¿un agotado cuenta como stock bajo?".
  - **Idea:** algo para otra sesión.
- **Fuera de la misión:** si algo te distrae, anótalo en una línea en "Ideas" y vuelve. No lo persigas.
- **Evidencia mínima por bug:** pasos exactos, datos usados, resultado esperado contra observado, y una captura o la petición copiada desde la pestaña Network.

---

## Misión A: Integridad de stock

**Charter:** explorar el registro de movimientos (IN, OUT, ADJUST) con secuencias, valores límite e interrupciones, para descubrir cualquier camino por el que el stock mostrado deje de poder explicarse con el historial.

**Objetivo:** confirmar que cada unidad de stock se puede explicar con un movimiento, y que ningún movimiento queda sin efecto o con un efecto distinto al registrado.

**Áreas a atacar**
- Formulario "+ Movimiento": producto, tipo, cantidad y motivo.
- Historial de Movimientos.
- Listado de Productos (columna de stock y estado).
- Edición de producto (el campo de stock).
- Eliminación de productos con movimientos.
- El mismo flujo con admin y con operador.

**Ideas de datos y ataques**
- **Cantidades raras:** 1, exactamente el stock, stock + 1, 0, −1, 0,5, 99999999999, " 5 " con espacios, "5abc". También "1.000" pegado desde Excel: en es-CO el punto es separador de miles, así que hay que ver si lo lee como 1 o como 1000.
- **Cambiar cosas a mitad del formulario:**
  - Escribir la cantidad y después cambiar el tipo (IN → OUT) o el producto. ¿La validación usa el stock del producto nuevo?
  - Hacer un ADJUST al mismo valor que ya tiene el stock (diferencia 0). ¿Crea movimiento? ¿Cómo se ve en el historial?
- **Interrupciones:** doble clic en Registrar, Enter repetido, recargar justo después de enviar, Atrás y reenviar.
- **Dos pestañas a la vez:**
  - Admin y operador hacen OUT sobre el mismo producto con poco stock (MON-24-04, stock 3), uno después del otro sin recargar.
  - Un formulario abierto en una pestaña vieja después de que otra pestaña cambió el stock o eliminó el producto.
- **Secuencia larga:** 8 a 10 movimientos mezclados sobre un mismo producto (CAB-USB-01), y luego reconstruir el stock a mano desde el historial.
- **Motivo:** vacío, de 500 caracteres, con tildes, ñ o emojis. ¿Se guarda y se muestra completo?

**Cómo saber si falló**
- El stock no cuadra con la fórmula. El stock inicial se toma de la semilla o de la creación del producto. Luego se suman los IN y se restan los OUT, y un ADJUST reemplaza el stock por el valor contado.
- Aparece un stock negativo en cualquier vista.
- Hay un movimiento en el historial que no cambió el stock, o un cambio de stock sin movimiento.
- Dos vistas (Productos, Alertas, Dashboard) muestran stocks distintos para el mismo producto.
- La app muestra un mensaje de éxito y no pasa nada, o muestra un error y el cambio sí ocurrió.
- Hay errores en la consola del navegador o respuestas 500 en Network.

**Riesgo de explorar sin foco**
- Quedarse puliendo mensajes de validación o textos. Eso es usabilidad: anótalo y sigue.
- Saltar al dashboard a revisar el valor. Eso es la misión B.
- Repetir el mismo ataque con datos distintos sin aprender nada nuevo.
- **Cómo evitarlo:** trabaja con solo 2 productos (uno con poco stock y uno con mucho). Lleva la hoja de cuadre a mano y reconcilia cada 6 minutos, aunque no veas nada raro.

**Plantilla de notas (Misión A)**
```
Sesión A · Fecha/hora: ____ · Tester: ____ · Build/commit: ____ · Rol(es): ____
Productos foco: ________ / ________   Stock inicial: ___ / ___

Hoja de cuadre
| Hora | Producto | Tipo | Cant. | Stock esperado | Stock visto | ¿Cuadra? |
|------|----------|------|-------|----------------|-------------|----------|

Tiempo: preparación __ min | exploración __ min | investigar bugs __ min | fuera de misión __ min
Bugs:      [hora] pasos → esperado / observado → evidencia
Preguntas: (reglas no claras, p. ej. ¿ADJUST sin diferencia crea movimiento?)
Ideas:     (para otra sesión)
No cubierto: ______
```

---

## Misión B: Credibilidad del dashboard y del CSV

**Charter:** explorar el Dashboard, las Alertas y la exportación CSV con cambios controlados en productos y movimientos, para descubrir si los números que usa administración se pueden reconciliar entre sí y con un cálculo manual.

**Objetivo:** comprobar que un administrativo puede tomar cualquier cifra del dashboard o del CSV y llegar al mismo número por otro camino.

**Áreas a atacar**
- Las 5 tarjetas: productos activos, stock bajo, agotados, valor del inventario y movimientos.
- La lista de Alertas.
- El filtro "Solo stock bajo" en Productos.
- La exportación CSV, abierta en Excel con configuración es-CO y en un editor de texto.
- La actualización de las cifras: después de un cambio, en otra pestaña y sin recargar.

**Ideas de datos y ataques**
- **Línea base:** calcula a mano el valor de la semilla antes de abrir el dashboard. Después haz un solo cambio a la vez y escribe la cifra que esperas antes de mirar.
- **Valores extremos en productos:**
  - Precio 0 con stock 0.
  - Precio muy alto con stock alto (por ejemplo 99.999.999 × 999): ¿cambia el formato o aparece notación científica?
  - Precio con centavos, si la app lo permite: ¿cómo redondea?
- **Fronteras de clasificación:**
  - Stock = mínimo, stock = mínimo + 1, mínimo = 0, producto agotado.
  - En cada caso, compara la tarjeta, la lista de Alertas y el filtro.
- **Ciclo de vida del producto:** crear, editar el precio, eliminar. ¿Las tarjetas, las alertas y el CSV cambian juntos?
- **Dos roles a la vez:** el operador registra un movimiento y el admin mira el dashboard en otra pestaña. ¿Se actualiza? ¿Se nota cuándo una cifra está desactualizada?
- **El CSV como lo usaría administración:**
  - Abrirlo en Excel y sumar price × stock.
  - Nombres con tilde, ñ, comas, comillas o saltos de línea.
  - ¿Excel lee 18.900 como 18,9?
  - Exportar con un filtro activo en Productos.
  - Exportar como operador y como admin, y comparar.
  - Un nombre que empiece por "=", "+", "-" o "@": ¿Excel lo trata como fórmula?

**Cómo saber si falló**
- Una tarjeta no coincide con el cálculo manual.
- El valor del dashboard no coincide con la suma de price × stock del CSV.
- El contador de stock bajo, la lista de Alertas y el filtro no muestran los mismos productos.
- El número de filas del CSV no coincide con los productos activos.
- El CSV muestra texto dañado (por ejemplo "QuÃ­mica"), columnas corridas o números mal leídos en Excel.
- Una cifra queda desactualizada sin que la app lo indique.
- Un producto eliminado sigue sumando, o al eliminarlo desaparece historial que sí debía quedar.

**Riesgo de explorar sin foco**
- Discutir definiciones (¿un agotado cuenta como stock bajo?). Es una pregunta para el PO, no un bug: anótala y sigue.
- Perder 10 minutos dándole formato al Excel.
- Equivocarse en el cálculo mental y reportar un falso bug.
- **Cómo evitarlo:** prepara antes una hoja de cálculo con la semilla y fórmulas. Limítate a unos 6 cambios controlados en la sesión y reconcilia después de cada uno.

**Plantilla de notas (Misión B)**
```
Sesión B · Fecha/hora: ____ · Tester: ____ · Build/commit: ____
Línea base calculada a mano: valor $ ________ | bajo __ | agotados __ | activos __ | mov. __

Hoja de reconciliación
| # | Cambio aplicado | Valor esperado | Tarjeta | Suma CSV | Bajo (tarjeta/alertas/filtro) | ¿Cuadra? |
|---|-----------------|----------------|---------|----------|-------------------------------|----------|

Tiempo: preparación __ | exploración __ | investigar bugs __ | fuera de misión __
Bugs:      [hora] cambio → cifra esperada / cifra vista → captura + CSV adjunto
Preguntas: (definiciones de stock bajo, agotado, refresco, redondeo)
Ideas:
No cubierto: ______
```

---

## Misión C: Abuso de permisos y seguridad básica de la interfaz

**Charter:** explorar la app como operador y sin sesión, manipulando URLs, el DOM, el almacenamiento local y los campos de texto, para descubrir acciones de admin a las que se pueda llegar o contenido que la app interprete en vez de mostrar como texto.

**Alcance:** solo en el entorno local o de pruebas (localhost) y con los usuarios de prueba. No se hacen escaneos, fuerza bruta ni pruebas contra servidores institucionales.

**Objetivo:** averiguar si un operador puede hacer, ver o inyectar algo que solo debería poder hacer un admin.

**Áreas a atacar**
- Barra superior y botones por fila ("+ Producto", Editar, Eliminar).
- Modales de producto.
- Rutas y URLs.
- localStorage (sp_token y cualquier dato de usuario o rol guardado ahí).
- Cierre de sesión.
- Mensajes de error y de confirmación.
- Todos los campos de texto que se muestran en otras vistas.

**Ideas de datos y ataques**
- **Como operador, desde las herramientas del navegador:**
  - Quitar `hidden` o `disabled` de los botones de admin, o abrir el modal de producto a la fuerza, e intentar guardar.
- **Reusar peticiones:**
  - Con sesión de admin, copia una petición de crear, editar o eliminar ("Copy as fetch" en Network). Ejecútala con el token del operador.
- **Almacenamiento:**
  - Si el rol está guardado en localStorage, cambiarlo.
  - Usar un token vacío, recortado o de otra sesión.
- **Navegación:**
  - Escribir directamente la URL o el hash de vistas de admin estando como operador.
  - Cerrar sesión y usar Atrás.
  - Con dos pestañas abiertas, cerrar sesión en una y seguir usando la otra.
- **Campos de texto** (nombre, categoría, ubicación, motivo del movimiento):
  - Probar `<b>negrita</b>`, `<img src=x onerror=alert(1)>`, `"><svg onload=alert(1)>`.
  - Revisarlos en todas las vistas: listados, selector de movimientos, alertas, confirmación "¿Eliminar…?" y avisos emergentes (toasts).
- **Login:**
  - "ADMIN" en mayúsculas, espacios al inicio o al final.
  - ¿El mensaje cambia entre un usuario inexistente y una clave errada?
- **Errores:** forzar respuestas 400, 401 y 500. ¿Muestran trazas internas, rutas del servidor o consultas?

**Cómo saber si falló**
- Cualquier dato cambia después de una acción del operador que debería estar prohibida, aunque la interfaz muestre un error.
- Un endpoint de admin responde 200 a una petición hecha con el token del operador.
- La app interpreta HTML en vez de mostrarlo como texto. Que una negrita se vea en negrita ya es señal, aunque no salte ningún alert.
- El token sigue funcionando después de cerrar sesión, o se ve contenido protegido sin sesión.
- Los mensajes revelan detalles internos o permiten saber qué usuarios existen.

**Riesgo de explorar sin foco**
- Convertir la sesión en un pentest completo (dependencias, cabeceras, fuerza bruta), que está fuera de "seguridad básica de interfaz".
- Quedarse 15 minutos perfeccionando un solo payload.
- Encontrar algo y no guardar la petición exacta para reproducirlo.
- **Cómo evitarlo:** antes de empezar, define 5 acciones de admin como objetivo (crear, editar precio, eliminar, ver algo de admin, inyectar texto). Dale como máximo 5 minutos a cada vía de ataque y guarda cada petición sospechosa.

**Plantilla de notas (Misión C)**
```
Sesión C · Fecha/hora: ____ · Tester: ____ · Build/commit: ____ · Entorno: localhost

Matriz de ataque (resultado: Bloqueado / Parcial / Logrado)
| Acción objetivo        | UI oculta/DOM | URL directa | Petición con token operador | Storage | Resultado |
|------------------------|---------------|-------------|-----------------------------|---------|-----------|
| Crear producto         |               |             |                             |         |           |
| Editar precio          |               |             |                             |         |           |
| Eliminar producto      |               |             |                             |         |           |
| Ver/descargar sin sesión|              |             |                             |         |           |
| Texto interpretado (XSS)| campo: ___   | vista: ___  |                             |         |           |

Tiempo: preparación __ | exploración __ | investigar bugs __ | fuera de misión __
Bugs:      [hora] vector → petición copiada / payload → efecto observado → evidencia
Preguntas: (¿qué puede hacer el operador según la regla? ¿ADJUST es solo de admin?)
Ideas:
No cubierto: ______
```

---

## Cierre de cada sesión (los 4 minutos finales)

Responde 4 preguntas en voz alta o por escrito:

1. ¿Qué cubrí?
2. ¿Qué encontré?
3. ¿Qué me impidió avanzar?
4. ¿Qué haría en la próxima sesión?

Si la sesión arroja una pregunta que bloquea el trabajo, por ejemplo "¿el operador puede hacer ADJUST?", llévala al PO antes de repetir la misión. Si no, la siguiente sesión termina explorando sin una referencia clara de qué está bien y qué está mal.
