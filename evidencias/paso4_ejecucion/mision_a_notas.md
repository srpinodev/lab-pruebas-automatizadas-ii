# Sesión exploratoria — Misión A: integridad de stock

**Charter (de la IA, `respuesta_ia_cruda_prompt03.md`):** explorar el registro de movimientos (IN, OUT, ADJUST) con secuencias, valores límite e interrupciones, para descubrir cualquier camino por el que el stock mostrado deje de poder explicarse con el historial.

**Por qué esta misión:** el riesgo número 1 del almacén es no confiar en el stock (Top 5 del Paso 2). Las misiones B y C quedan como ideas para otra sesión.

| Dato | Valor |
|---|---|
| Fecha | 2026-11-22 |
| Timebox | 25 min |
| Ejecución de experimentos | 13:11:03 a 13:11:14. Los experimentos se corrieron con un script de Playwright para dejar hora, datos y captura de cada intento. El resto del timebox se usó en prepararlos y revisar resultados |
| Build | `lab-aixqa-equipo`, servidor recién iniciado (semilla) |
| Roles | admin y operador en dos sesiones del navegador al mismo tiempo |
| Productos foco | CAB-USB-01 (mucho stock, 40) y MON-24-04 (poco stock, 3) |
| Evidencia | `mision_a/` (capturas numeradas por experimento) y `mision_a/notas_crudas.json` (hora de cada intento) |

## Hoja de cuadre (secuencia larga sobre CAB-USB-01)

Stock al iniciar la secuencia: 37,5. Ya venía alterado por los experimentos 2 y 6 de la sesión.

| # | Tipo | Cant. | Stock esperado | Stock visto | ¿Cuadra? |
|---|---|---|---|---|---|
| 1 | IN | 10 | 47,5 | 47,5 | Sí |
| 2 | OUT | 4 | 43,5 | 43,5 | Sí |
| 3 | ADJUST | 30 | 30 | 73,5 | **No** |
| 4 | OUT | 3 | 27 | 70,5 | No (arrastra el error) |
| 5 | IN | 2 | 29 | 72,5 | No |
| 6 | ADJUST | 25 | 25 | 97,5 | **No** |
| 7 | OUT | 1 | 24 | 96,5 | No |

Desde el primer ADJUST, el historial ya no explica el stock: 72,5 unidades de diferencia en 7 movimientos. Captura: `mision_a/09_secuencia_historial.png`.

## Experimentos y resultados

| Hora | Experimento | Resultado | Clasificación |
|---|---|---|---|
| 13:11:03 | Reconstruir el stock de la semilla desde el historial | Solo CAB-USB-01 tiene movimientos (50 − 10 = 40, cuadra). Los otros 4 productos tienen stock sin ningún movimiento que lo explique | **Pregunta** para el PO: ¿el stock inicial debería generar un movimiento? |
| 13:11:03 | Cantidad 0.5: UI y API | La UI lo bloquea (mínimo 1). La API responde 201 y CAB-USB-01 queda en **39,5** unidades | **Bug** → BUG-19 |
| 13:11:03 | IN de 99.999.999.999 por API | 201, sin tope. El dashboard muestra $ 18.900.000.006.643 | **Idea**: validar un máximo razonable; el valor además sale dividido entre 1000 (BUG-03) |
| 13:11:04 | ADJUST con conteo físico 0 | La UI exige mínimo 1 y la API responde 400 "Cantidad debe ser mayor a 0". No se puede registrar que el conteo dio 0 | **Bug** → BUG-18 |
| 13:11:04 | ADJUST de MON-24-04 al mismo valor (3) | El stock pasó a **6**: un conteo que coincide con el sistema duplica el stock | **Bug** → BUG-02 (misma causa) |
| 13:11:05 | Doble clic rápido en "Registrar" (OUT 1) | Se registraron **2** movimientos y el stock bajó 2 | **Bug** → BUG-17 |
| 13:11:08 | Admin y operador registran OUT 2 a la vez sobre MON-24-04 | Los dos pasan (7 → 3). Ninguno recibe aviso; el selector muestra el stock del momento en que se abrió el formulario | **Pregunta**: ¿se necesita control de concurrencia? Con poco stock termina en negativo (BUG-01) |
| 13:11:09 | Formulario abierto mientras otro usuario elimina el producto | "Producto no encontrado" (404) | Correcto, sin hallazgo |
| 13:11:13 | Secuencia de 7 movimientos con cuadre manual | Ver hoja de cuadre | **Bug** → BUG-02 |
| 13:11:14 | Motivo de 500 caracteres con tildes, ñ y emoji | Se guarda completo y se muestra bien; la fila crece en alto | **Idea**: límite de longitud (usabilidad) |
| 13:11:14 | Eliminar CAB-USB-01 con todo su historial | Se elimina sin advertencia; 12 movimientos quedan como "(producto eliminado)" con SKU "—" | **Bug** → BUG-09 |

## Resumen de la sesión

- **Bugs nuevos:** 3 (BUG-17 doble clic duplica el movimiento, BUG-18 ADJUST no admite conteo 0, BUG-19 la API acepta decimales).
- **Bugs reconfirmados:** BUG-01, BUG-02, BUG-03, BUG-09.
- **Preguntas para el PO:** stock inicial sin movimiento; control de concurrencia.
- **Ideas para otra sesión:** Misión B (reconciliar dashboard contra CSV en Excel es-CO, inyección de fórmulas en el CSV) y Misión C (manipular el DOM y localStorage como operador).
- **No cubierto:** "1.000" pegado desde Excel, recargar justo después de enviar, Atrás y reenviar.

## Cierre: las 4 preguntas

1. **¿Qué cubrí?** Cantidades límite, ADJUST, interrupciones, dos roles a la vez, formulario viejo, secuencia larga con cuadre y motivo largo.
2. **¿Qué encontré?** Que el historial no sirve como evidencia del stock: ADJUST suma, el doble clic duplica, se aceptan fracciones y al eliminar se pierde el rastro.
3. **¿Qué me impidió avanzar?** El ADJUST roto contamina todos los cuadres posteriores; hubo que fijar el stock con valores conocidos antes de cada experimento.
4. **¿Qué haría en la próxima sesión?** La Misión B, con la hoja de reconciliación preparada antes.
