# Notas sobre la IA — Paso 2, análisis de riesgos

Fuente: `respuesta_ia_cruda_prompt01.md` (Claude, chat sin acceso al código).
El equipo leyó `docs/Requisitos_StockPascual_MVP.md` antes de usar la IA y después contrastó cada riesgo contra la app.

## Qué inventó, subestimó o dejó genérico

1. **Inventó un riesgo que no existe en la app (R3, "stock editable en el CRUD").**
   La IA lo puso en su Top 5. En StockPascual el campo *Stock inicial* queda deshabilitado al editar y RF-02 dice que el stock solo se define en la creación. Se probó también enviando `stock: 999` directo a la API (`PUT /api/products/p2`) y el stock siguió en 8. Era un supuesto suyo, no un riesgo del sistema. Le dio un lugar del Top 5 a algo que no aplica.

2. **Inventó una matriz de permisos.**
   Asumió que el operador solo hace IN/OUT y que ADJUST es exclusivo del admin. RF-04 dice que *cualquier usuario autenticado* registra IN, OUT y ADJUST, y en la app el operador registró un ADJUST sin problema. Si el equipo hubiera copiado eso, habría reportado como bug un comportamiento correcto.

3. **Subestimó el XSS: no aparece en su Top 12.**
   RNF-02 lo pide de forma explícita y es el criterio de aceptación 10. En la app un nombre de producto con HTML se ejecuta como script en la sesión de **todos** los usuarios, operador incluido, y puede leer el token de sesión (BUG-04). Es uno de los hallazgos más graves y la IA no lo listó.

4. **Subestimó el CSV incompleto.**
   En R11 se enfocó en tildes, separador ";" e inyección de fórmulas, pero no propuso contar filas del CSV contra el catálogo. El defecto real es que el CSV **omite los 2 últimos productos** (BUG-05), justo lo más grave para auditoría (criterio 6).

5. **Genérico o poco aplicable al MVP.**
   R7 (concurrencia entre dos operadores) y R12 (prueba de usabilidad con operadores reales y vales impresos) son consejos válidos en general. En un piloto de laboratorio con un servidor Express en memoria no son lo primero que hay que probar, y no ayudaron a encontrar defectos.

6. **No vio que la validación de precio y stock inicial negativos es de *productos*, no de movimientos.**
   R4 se centró en cantidades inválidas en movimientos, y esas la app sí las rechaza (0 y negativos). El defecto estaba en el formulario de producto: acepta precio −1.500.000 y stock −4 (BUG-07).

## Qué acertó (para no ser injustos)

- R1 (OUT deja negativo), R2 (ADJUST mal interpretado), R6 (valor de inventario y efecto del stock negativo), R8 (SKU duplicado) y R9 (eliminar con movimientos) se confirmaron en la app.
- La idea de R5 de "cerrar sesión y reusar la sesión anterior" encontró un defecto real: el token sigue sirviendo después de cerrar sesión (BUG-13).
- Separar severidad técnica de impacto de negocio fue útil para justificar prioridades.
