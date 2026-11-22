# LABORATORIO PRUEBAS AUTOMATIZADAS II + IA

**Caso de estudio:** StockPascual, inventarios de la Institución Universitaria Pascual Bravo

**CURSO:** PRUEBAS DE SOFTWARE  
**INSTITUCIÓN:** Institución Universitaria Pascual Bravo  
**DURACIÓN SUGERIDA:** De 3 a 6 horas, más trabajo autónomo  
**EQUIPOS:** Grupo de confianza de siempre

> **Este archivo es la guía oficial del laboratorio.** Contiene todas las instrucciones a seguir. Las carpetas `app/`, `prompts/`, `plantillas/`, `evidencias/` y `entrega/` son material de apoyo y no reemplazan este documento.

---

## DATOS DEL EQUIPO — completar al iniciar

| # | Nombre completo |
|---|-----------------|
| 1 | Juan Pablo Florez |
| 2 | Linda Maria Perez |
| 3 | Duvan Andres Villadiego |

---

## OBJETIVO

Entender y afianzar sobre **pruebas automatizadas / QA asistido por IA** en apps web, mediante un entorno práctico real, con el uso de herramientas usadas en el mercado laboral actual: IA generativa, pruebas manuales y exploratorias, reporte de defectos, Git/GitHub y Playwright, aplicadas al software de inventarios institucionales **StockPascual**.

Al finalizar el laboratorio, el equipo deberá:

1. Levantar y recorrer StockPascual.  
2. Analizar riesgos de calidad con ayuda de IA y criterio humano.  
3. Diseñar y refinar casos de prueba.  
4. Ejecutar pruebas, explorar y encontrar defectos.  
5. Reportar bugs con evidencia.  
6. Evaluar críticamente lo que generó la IA.  
7. Automatizar un flujo E2E con Playwright, asistido por IA.  
8. Subir todo el trabajo al **fork** del equipo en Git, con evidencias y entrega.  

---

## SUGERENCIA

- Leer bien el enunciado y seguir el **paso a paso**.  
- Usar la IA como apoyo, pero **validar siempre** en StockPascual lo que ella sugiera.  
- Un hallazgo solo cuenta como bug si se reprodujo en la app y quedó documentado con pasos y captura en el repositorio.  

---

## ENUNCIADO

La **Institución Universitaria Pascual Bravo** contrató un equipo junior de calidad para el piloto de **StockPascual**. El rol a ejercer es **QA Analyst Junior** con enfoque **AI-assisted QA**: usar IA como asistente, validar siempre en la aplicación y dejar evidencia revisable en Git.

El área de Recursos Físicos y Almacén General administraba el inventario en Excel. Eso dejó de ser confiable: hay diferencias entre stock físico y sistema, salidas a laboratorios sin control, y el área administrativa no confía en el **valor del inventario**. TI institucional desarrolló el MVP web **StockPascual**, con Node.js, **Express** y frontend estático.

Antes del piloto con el almacén real, el equipo debe evaluar StockPascual aplicando el flujo típico de un ciclo de pruebas:

- Análisis de riesgos asistido por IA  
- Diseño de casos de prueba asistido por IA  
- Ejecución manual y exploración  
- Reporte de bugs  
- Evaluación crítica de la IA  
- Automatización E2E con Playwright asistida por IA  

### Alcance funcional bajo prueba

| Módulo | Capacidad |
|--------|-----------|
| Autenticación | Roles `admin` y `operador` |
| Dashboard | Métricas de inventario |
| Productos | Alta, edición, eliminación, búsqueda y filtro |
| Movimientos | IN entrada, OUT salida, ADJUST ajuste |
| Alertas | Stock bajo |
| Exportación | CSV del inventario |

### Criterios de aceptación

1. Un producto no puede quedar con stock negativo por una salida.  
2. El SKU debe ser único.  
3. El precio y el stock inicial no pueden ser negativos.  
4. Un ajuste ADJUST debe **establecer** el stock al valor contado, no sumarlo.  
5. La búsqueda debe funcionar sin importar mayúsculas o minúsculas.  
6. Exportar CSV debe incluir **todos** los productos.  
7. El valor de inventario del dashboard = Σ stock × precio.  
8. Al eliminar un producto, no deben quedar inconsistencias graves en movimientos o reportes.  
9. El operador no puede crear, editar ni eliminar productos.  
10. Los campos de texto no deben permitir XSS en la UI.  

> **Importante:** StockPascual contiene **defectos intencionales** para el aprendizaje. Si “todo parece perfecto”, es muy probable que aún falte profundidad en las pruebas.

### Credenciales de prueba

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `admin` | `Admin123!` | Administrador: CRUD de productos y movimientos |
| `operador` | `Oper123!` | Operador: consulta y movimientos; no gestiona productos |

URL local, con el proyecto en ejecución: **http://localhost:3080**

Si se encuentran bugs, reportarlos con la plantilla `plantillas/Reporte_Bugs_StockPascual.csv`, abierta en Excel o similar.

---

## PASO A PASO

Con el equipo de trabajo de clase, seguir el siguiente paso a paso.  
Cada paso indica su peso. La calificación del laboratorio es de **0,0 a 5,0**.

---

### PASO 0 — Fork del repositorio y clonación — 0,25

Este laboratorio se entrega por **Git**. No basta con trabajar en local sin subir evidencias.

1. Entrar al enlace del repositorio del curso publicado por el docente en GitHub o GitLab.  
2. Hacer **Fork** a la cuenta del estudiante o del equipo.  
3. Clonar el **fork** del equipo, no el repo original del profesor:

```bash
git clone https://github.com/TU_USUARIO/NOMBRE_DEL_REPO.git
cd NOMBRE_DEL_REPO
git remote -v
```

4. Verificar que `origin` apunta al repositorio del equipo.  
5. Recomendado: crear una rama de trabajo:

```bash
git checkout -b lab-aixqa-equipo
```

**Observación:** Si se clonó el repo del profesor y luego no es posible hacer `push`, es porque no se está en el fork del equipo. Corregir eso desde el inicio.

6. Completar de una vez la sección **DATOS DEL EQUIPO** al inicio de esta guía, con los nombres completos de todos.

```bash
git add docs/Laboratorio_Pruebas_Automatizadas_II_IA.md
git commit -m "equipo: datos e integrantes del laboratorio"
git push -u origin lab-aixqa-equipo
```

---

### PASO 1 — Ubicar el código y arrancar StockPascual con Express — 0,25

El código de la aplicación bajo prueba está en la carpeta:

```text
app/
├── package.json          ← dependencias Express y scripts
├── server.js             ← API Express y arranque del servidor
└── public/
    ├── index.html        ← interfaz
    ├── styles.css
    └── app.js            ← lógica del frontend
```

**Echarle el ojo** al `package.json`: ahí está la dependencia de **Express** y el script `start`.

#### 1.1. Requisitos previos

- Tener instalado **Node.js 18 o superior**. En la terminal:

```bash
node -v
npm -v
```

Si el comando no se reconoce, instalar Node LTS desde https://nodejs.org y volver a abrir la terminal.

- Tener un navegador Chrome o Edge.  
- Tener una herramienta de IA: ChatGPT, Claude, Gemini, Cursor Chat u otra.  
- Tener Excel, Google Sheets o LibreOffice para matrices y bugs.  

#### 1.2. Instalar dependencias y levantar el proyecto

Abrir la terminal en la raíz del fork y ejecutar **en este orden**:

```bash
cd app
npm install
npm start
```

**Qué hace cada comando**

| Comando | Para qué |
|---------|----------|
| `cd app` | Entrar a la carpeta donde está el código de StockPascual |
| `npm install` | Descargar Express y dejar listo `node_modules/`. Hacerlo la **primera vez** y si cambian dependencias |
| `npm start` | Arrancar el servidor Express |

En consola debe aparecer algo similar a:

```text
StockPascual (Express) listo → http://localhost:3080
```

**Nota:** No cerrar esa terminal mientras se prueba. Si se cierra, la app se apaga.  
Si el puerto 3080 ya está ocupado, cerrar la otra ventana donde corra StockPascual y volver a ejecutar `npm start`.

#### 1.3. Abrir la aplicación

1. Abrir el navegador.  
2. Entrar a: http://localhost:3080  
3. Iniciar sesión con `admin` / `Admin123!`  
4. Recorrer Dashboard, Productos, Movimientos, Alertas y Exportar CSV.  
5. Cerrar sesión e iniciar con `operador` / `Oper123!` para observar diferencias de permisos.  

#### 1.4. Guardar evidencia del setup

Guardar capturas en:

```text
evidencias/paso1_arranque/
```

Ejemplos de nombres: `01_login_admin.png`, `02_dashboard.png`, `03_vista_operador.png`.

Luego subir al fork:

```bash
git add evidencias/paso1_arranque
git commit -m "evidencias: paso 1 arranque StockPascual"
git push
```

---

### PASO 2 — Análisis de riesgos con IA — 0,50

1. Leer `docs/Requisitos_StockPascual_MVP.md` durante 5 a 10 minutos, sin IA.  
2. Abrir `prompts/01_analisis_riesgos.md`.  
3. Copiar el bloque **Prompt** y pegarlo en la herramienta de IA: ChatGPT, Claude, Gemini o Cursor.  
4. Guardar la respuesta cruda; sirve después para criticar a la IA.  
5. En equipo, dejar un **Top 5** de riesgos priorizados por impacto y probabilidad, con sentido para el almacén del Pascual Bravo.  
6. Marcar **al menos 3** cosas que la IA inventó, subestimó o dejó demasiado genéricas.  

**Preguntas guía** — solo para orientar el análisis; **no se responden** ni se entregan.

- ¿Qué pasa si se hace una salida mayor al stock?  
- ¿Quién puede alterar precios?  
- ¿Cómo comprobar si el dashboard “miente”?  
- ¿Qué tan grave es un CSV incompleto para auditoría institucional?  

**Qué guardar** en `evidencias/paso2_riesgos/`:

1. El **Top 5** de riesgos refinados, por ejemplo `top5_riesgos.xlsx` o `.csv`.  
2. Las **notas sobre la IA** (≥ 3 observaciones: inventó, subestimó o quedó genérico), en el mismo archivo o en `notas_ia.md`.  

Luego commit + push:

```bash
git add evidencias/paso2_riesgos
git commit -m "evidencias: paso 2 analisis de riesgos"
git push
```

---

### PASO 3 — Diseño de casos de prueba con IA — 0,75

1. Abrir `prompts/02_casos_de_prueba.md`.  
2. Pegar el prompt en la IA; ideal usar el mismo chat del paso anterior.  
3. Pasar la tabla a Excel o Sheets con columnas:

`ID | Módulo | Título | Precondiciones | Pasos | Datos | Resultado esperado | Prioridad P0/P1/P2 | Automatizable Sí/No`

4. **Refinar en humano**, esto se califica:  
   - Eliminar casos vagos del tipo “que el botón se vea bien”.  
   - Poner datos concretos: SKU, precios en COP, cantidades.  
   - Cumplir cobertura mínima:  
     - ≥ 15 funcionales  
     - ≥ 5 negativos o de validación  
     - ≥ 3 de seguridad o roles  
     - ≥ 2 de integridad entre movimiento, stock y dashboard  
     - ≥ 1 E2E de negocio: ingreso, salida, alerta y export  

5. Recomendado: usar el “Prompt de refino” del mismo archivo.  

Guardar `casos_de_prueba_refinados.xlsx` en `evidencias/paso3_casos/` y hacer push.

**Ejemplo de caso bien escrito**

- **ID:** TC-OUT-01  
- **Título:** OUT no debe dejar stock negativo  
- **Precondiciones:** Login admin; producto con stock = 3  
- **Pasos:** + Movimiento → tipo OUT → cantidad 10 → Registrar  
- **Esperado:** el sistema rechaza o mantiene stock en 3; **nunca** queda negativo  
- **Prioridad:** P0  

---

### PASO 4 — Ejecución y pruebas exploratorias — 0,75

#### 4.1. Ejecutar el Top 10

1. Escoger 10 casos, primero P0 y luego P1.  
2. Ejecutarlos uno a uno en StockPascual.  
3. Registrar en matriz. Puede usarse como base `plantillas/Matriz_Ejecucion.csv`:  

`Pass` | `Fail` | `Blocked`

4. Si falla, capturar evidencia.

#### 4.2. Exploración con misión, 25 minutos

Una **misión de exploración** es el objetivo corto de la sesión, por ejemplo: “atacar la integridad del stock”. No es un caso de prueba paso a paso; sirve para explorar con foco durante un tiempo fijo.

1. Abrir `prompts/03_exploracion_guiada.md` y pedir a la IA 3 misiones de exploración.  
2. Elegir **una**.  
3. Poner temporizador de 25 minutos y explorar con ese objetivo, no “pasear”.  
4. Anotar ideas probadas, resultados y bugs candidatos.  

**Ideas de ataque si hace falta**

- Valores `0`, `1`, `-1`, vacío  
- SKU duplicado  
- OUT mayor al stock  
- ADJUST vs IN  
- Buscar `mouse`, `Mouse` y `MOUSE`  
- Contar filas del CSV frente a productos en pantalla  
- Nombre con `<img src=x onerror=alert(1)>`  
- Login operador e intentar crear producto  

Guardar matriz y notas en `evidencias/paso4_ejecucion/` y hacer push.

---

### PASO 5 — Reporte de bugs — 0,75

1. Usar `plantillas/Reporte_Bugs_StockPascual.csv` y abrirla en Excel.  
2. Reportar **mínimo 5 bugs confirmados** en StockPascual.  
3. Cada bug debe traer: título, severidad, módulo, pasos numerados, esperado vs actual, datos usados, evidencia, si lo sugirió la IA, y confirmación en app = **Sí**.  
4. Guardar en `evidencias/paso5_bugs/`:  
   - el reporte diligenciado, por ejemplo `reporte_bugs.xlsx` o `.csv`  
   - las capturas con nombres claros, por ejemplo `bug01_stock_negativo.png`  

**Severidad**

- **Crítica:** corrompe stock o dinero, o bloquea la operación.  
- **Alta:** funcional grave con workaround parcial.  
- **Media:** incorrecto pero acotado.  
- **Baja:** cosmético o UX menor.  

Hacer commit + push.

---

### PASO 6 — Evaluación crítica de la IA — 0,50

1. Completar `plantillas/Evaluacion_IA.md` y guardarla en `evidencias/paso6_evaluacion_ia/`.  
2. Pegar 2 o 3 prompts reales usados en el laboratorio.  
3. Responder con ejemplos: qué acertó, qué alucinó, qué no vio, falsos positivos.  
4. Reflexión de 10 a 15 líneas: ¿Contratar un QA 100% reemplazado por IA en la Institución Universitaria Pascual Bravo? ¿Por qué sí o no?  

Hacer push al fork.

---

### PASO 7 — Automatización con Playwright — 0,75

La carpeta `automation/` ya trae el proyecto Playwright listo. No hace falta crear el proyecto desde cero.

1. StockPascual debe seguir corriendo en http://localhost:3080.  
2. En **otra** terminal:

```bash
cd automation
npm install
npx playwright install chromium
```

3. Usar `prompts/04_automatizacion.md` para pedir a la IA un test E2E: login, crear producto, IN, OUT y validar stock o alertas.  
4. Ajustar el código en `automation/tests/`. Hay un smoke de ejemplo: `stockpascual-smoke.spec.ts`.  
5. Ejecutar:

```bash
npm run test:headed
npm run report
```

6. Guardar en `evidencias/paso7_automation/` una captura o el reporte HTML de ejecución. El código del test debe quedar en `automation/tests/` dentro del fork.  

**Observación:** En el mercado es habitual partir de un repo con Playwright ya configurado. El código puede nacer con IA, pero el equipo debe explicarlo, corregirlo y demostrarlo ejecutado.

---

### PASO 8 — Empaque final en `entrega/` y push — 0,25

Copiar a `entrega/` las **versiones finales** de lo ya trabajado en `evidencias/` y plantillas. No es trabajo nuevo: es el paquete ordenado para revisión, como un handoff a un lead o a un cliente.

```text
entrega/
├── 01_top5_riesgos.xlsx        ← desde paso2
├── 02_casos_de_prueba.xlsx     ← desde paso3
├── 03_matriz_ejecucion.xlsx    ← desde paso4
├── 04_reporte_bugs.xlsx        ← desde paso5 / plantilla
└── 05_evaluacion_ia.md         ← desde paso6
```

Subir todo:

```bash
git add entrega evidencias docs/Laboratorio_Pruebas_Automatizadas_II_IA.md automation
git commit -m "entrega: Laboratorio Pruebas Automatizadas II + IA"
git push
```

Opcional:

```bash
git tag -a entrega-final -m "Entrega Laboratorio Pruebas Automatizadas II + IA"
git push origin entrega-final
```

Enviar al docente la **URL del fork**, la rama y, si aplica, el tag.

**Presentación (0,25):** al cierre, oral o video de **5 minutos** sobre hallazgos, uso de la IA y conclusiones. No lleva carpeta propia.

---

## ESTRUCTURA DEL REPOSITORIO

```text
├── README.md
├── app/                 ← StockPascual (Express): npm install / npm start
├── docs/
│   ├── Laboratorio_Pruebas_Automatizadas_II_IA.md   ← guía oficial
│   └── Requisitos_StockPascual_MVP.md
├── prompts/             ← prompts para la IA
├── plantillas/          ← bugs, matriz, evaluación
├── automation/          ← Playwright (ya configurado)
├── evidencias/          ← bitácora del proceso por paso
└── entrega/             ← paquete final para revisión
```

**`evidencias/` vs `entrega/`**

| Carpeta | Para qué sirve |
|---------|----------------|
| `evidencias/pasoN_…` | Prueba de que se hizo cada paso: capturas, borradores, reportes de corrida |
| `entrega/` | Copia final ordenada de documentos clave, para que el docente revise sin buscar por todo el repo |

**Dónde guardar el trabajo — el número de carpeta coincide con el número del paso**

| Paso | Carpeta | Qué va ahí |
|------|---------|------------|
| 0 | Sección **DATOS DEL EQUIPO** de esta guía | Nombres completos de los integrantes |
| 1 | `evidencias/paso1_arranque/` | Login, dashboard, recorrido inicial |
| 2 | `evidencias/paso2_riesgos/` | Top 5 riesgos, notas sobre la IA |
| 3 | `evidencias/paso3_casos/` | Suite de casos refinada |
| 4 | `evidencias/paso4_ejecucion/` | Matriz Pass/Fail y notas de la misión de 25 min |
| 5 | `evidencias/paso5_bugs/` | Reporte de bugs y capturas |
| 6 | `evidencias/paso6_evaluacion_ia/` | Evaluación crítica de la IA |
| 7 | `evidencias/paso7_automation/` y `automation/tests/` | Captura o reporte Playwright y código del test |
| 8 | `entrega/` | Documentos finales consolidados |

---

## ENTREGABLES

1. **Fork** del repositorio con historial de commits y evidencias por paso.  
2. Sección **DATOS DEL EQUIPO** diligenciada en esta guía.  
3. Carpeta `evidencias/` completa según la tabla anterior, incluida automatización.  
4. Carpeta `entrega/` con riesgos, casos, matriz, bugs y evaluación IA.  
5. Pruebas Playwright ejecutadas, con evidencia en el fork.  
6. Presentación oral de **5 minutos**, o video, al cierre del laboratorio.  

### Nota de autenticidad

- El trabajo debe ser auténtico y a conciencia.  
- No se aceptan las mismas capturas de este documento, ni de otros compañeros, ni fakes.  
- Bugs no confirmados en StockPascual = no cuentan.  
