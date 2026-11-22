# Respuesta cruda de la IA — Prompt 04 (automatización E2E)

- **Herramienta:** Claude (Anthropic), mismo chat de los pasos anteriores. Sin acceso al DOM real.
- **Prompt:** bloque **Prompt** de `prompts/04_automatizacion.md`.
- **Resultado al correrlo sin cambios:** falla en el paso 2 (`01_corrida_codigo_ia_sin_cambios.txt`).

---

Este es el test E2E completo. Antes de correrlo, ten en cuenta que los textos de etiquetas, botones y menús los tomé de la suite que pegaste antes ("+ Producto", "Stock inicial", "Registrar", "Alertas stock"…), no del DOM real. Por eso los dejé todos en una constante `UI`: si alguno no coincide, se corrige en un solo lugar. Valídalos primero con `npx playwright codegen http://localhost:3080`.

## 1. Configuración mínima

```ts
// playwright.config.ts (fragmento)
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3080',
    trace: 'retain-on-failure',      // traza solo si falla, para diagnosticar
    screenshot: 'only-on-failure',
  },
});
```

## 2. Prueba E2E

```ts
// tests/e2e-stock-in-out-alerta.spec.ts
import { test, expect, type Page, type Locator } from '@playwright/test';

// Textos de la UI en un solo lugar. CONFIRMAR con codegen o el inspector antes de usar.
const UI = {
  usuario: 'Usuario',
  contrasena: 'Contraseña',
  ingresar: 'Ingresar',
  nuevoProducto: '+ Producto',
  nuevoMovimiento: '+ Movimiento',
  guardar: 'Guardar',
  registrar: 'Registrar',
  navProductos: 'Productos',
  navAlertas: /alertas/i,
  columnaStock: 'Stock',
  campos: {
    sku: 'SKU',
    nombre: 'Nombre',
    categoria: 'Categoría',
    precio: 'Precio',
    stockInicial: 'Stock inicial',
    stockMinimo: 'Stock mínimo',
    ubicacion: 'Ubicación',
    producto: 'Producto',
    tipo: 'Tipo',
    cantidad: 'Cantidad',
    motivo: 'Motivo',
  },
};

// Credenciales por variables de entorno, con el valor de prueba como respaldo
const ADMIN = {
  user: process.env.SP_ADMIN_USER ?? 'admin',
  pass: process.env.SP_ADMIN_PASS ?? 'Admin123!',
};

// ---------- Helpers ----------

// Navega por el menú, sea enlace o botón
async function irA(page: Page, nombre: string | RegExp) {
  const opts = typeof nombre === 'string' ? { name: nombre, exact: true } : { name: nombre };
  await page.getByRole('link', opts).or(page.getByRole('button', opts)).first().click();
}

// Sirve tanto si el campo es <select> como si es <input>
async function llenarOSeleccionar(campo: Locator, valor: string) {
  const tag = await campo.evaluate((el) => el.tagName);
  if (tag === 'SELECT') await campo.selectOption({ label: valor });
  else await campo.fill(valor);
}

// Selecciona la única opción cuyo texto contiene `texto`.
// toHaveCount(1) reintenta hasta que el catálogo cargue y además evita ambigüedad.
async function seleccionarOpcionQueContiene(select: Locator, texto: string) {
  const opcion = select.locator('option', { hasText: texto });
  await expect(opcion, `Debe existir una sola opción con "${texto}"`).toHaveCount(1);
  const valor = await opcion.getAttribute('value');
  await select.selectOption(valor ?? { label: (await opcion.innerText()).trim() });
}

// Registra un movimiento y espera la confirmación del backend (sin waits fijos)
async function registrarMovimiento(
  page: Page,
  sku: string,
  tipo: '(IN)' | '(OUT)',
  cantidad: number,
  motivo: string,
) {
  await page.getByRole('button', { name: UI.nuevoMovimiento }).click();
  const form = page.getByRole('dialog');
  await expect(form).toBeVisible();

  await seleccionarOpcionQueContiene(form.getByLabel(UI.campos.producto, { exact: true }), sku);
  await seleccionarOpcionQueContiene(form.getByLabel(UI.campos.tipo, { exact: true }), tipo);
  await form.getByLabel(UI.campos.cantidad, { exact: true }).fill(String(cantidad));
  await form.getByLabel(UI.campos.motivo, { exact: true }).fill(motivo);

  // El listener se arma ANTES del clic para no perder la respuesta
  const respuesta = page.waitForResponse(
    (r) => r.url().includes('/api/movements') && r.request().method() === 'POST',
  );
  await form.getByRole('button', { name: UI.registrar }).click();
  expect((await respuesta).ok(), `POST /api/movements ${tipo} debe responder 2xx`).toBeTruthy();
  await expect(form).toBeHidden(); // el modal cerrado indica que la UI terminó
}

// Devuelve la celda "Stock" de la fila del SKU, ubicando la columna por su encabezado
async function celdaStock(page: Page, sku: string): Promise<Locator> {
  await irA(page, UI.navProductos);
  const tabla = page.getByRole('table');
  const fila = tabla.getByRole('row').filter({ hasText: sku });
  await expect(fila, `El producto ${sku} debe aparecer una sola vez`).toHaveCount(1);

  const encabezados = (await tabla.getByRole('columnheader').allInnerTexts()).map((t) => t.trim());
  const idx = encabezados.indexOf(UI.columnaStock); // exacto: no confunde con "Stock mín."
  expect(idx, `Debe existir la columna "${UI.columnaStock}"`).toBeGreaterThanOrEqual(0);
  return fila.getByRole('cell').nth(idx);
}

// ---------- Prueba ----------

test.describe('E2E inventario: alta → IN → OUT → stock → alerta', () => {
  test('el stock refleja IN y OUT, y aparece en Alertas si queda ≤ mínimo', async ({ page }) => {
    // SKU único por ejecución y por worker, para no chocar con otras corridas
    const sku = `E2E-${Date.now()}-${test.info().workerIndex}`;
    const producto = {
      sku,
      nombre: `Producto E2E ${sku}`,
      categoria: 'Químicos',
      precio: 68000,
      stockInicial: 0,
      stockMinimo: 5,
      ubicacion: 'B-05',
    };
    const N = 12; // unidades de entrada
    const M = 9;  // unidades de salida

    // El resultado esperado se deriva de los datos, no se escribe a mano
    const stockTrasIn = producto.stockInicial + N;
    expect(M, 'Precondición del dato: M debe ser menor que el stock tras el IN').toBeLessThan(stockTrasIn);
    const stockEsperado = stockTrasIn - M;
    const debeAlertar = stockEsperado <= producto.stockMinimo;

    await test.step('1) Login como admin', async () => {
      await page.goto('/');
      await page.getByLabel(UI.usuario, { exact: true }).fill(ADMIN.user);
      await page.getByLabel(UI.contrasena, { exact: true }).fill(ADMIN.pass);
      await page.getByRole('button', { name: UI.ingresar }).click();
      // Evidencia de sesión admin: el botón exclusivo del admin está visible
      await expect(page.getByRole('button', { name: UI.nuevoProducto })).toBeVisible();
    });

    await test.step('2) Crear producto con SKU único', async () => {
      await page.getByRole('button', { name: UI.nuevoProducto }).click();
      const form = page.getByRole('dialog');
      await expect(form).toBeVisible();

      const c = UI.campos;
      await form.getByLabel(c.sku, { exact: true }).fill(producto.sku);
      await form.getByLabel(c.nombre, { exact: true }).fill(producto.nombre);
      await llenarOSeleccionar(form.getByLabel(c.categoria, { exact: true }), producto.categoria);
      await form.getByLabel(c.precio, { exact: true }).fill(String(producto.precio)); // sin separador de miles
      await form.getByLabel(c.stockInicial, { exact: true }).fill(String(producto.stockInicial));
      await form.getByLabel(c.stockMinimo, { exact: true }).fill(String(producto.stockMinimo));
      await form.getByLabel(c.ubicacion, { exact: true }).fill(producto.ubicacion);

      const respuesta = page.waitForResponse(
        (r) => r.url().includes('/api/products') && r.request().method() === 'POST',
      );
      await form.getByRole('button', { name: UI.guardar }).click();
      expect((await respuesta).ok(), 'POST /api/products debe responder 2xx').toBeTruthy();
      await expect(form).toBeHidden();
    });

    await test.step(`3) Registrar IN de ${N}`, async () => {
      await registrarMovimiento(page, sku, '(IN)', N, `E2E entrada ${sku}`);
    });

    await test.step(`4) Registrar OUT de ${M}`, async () => {
      await registrarMovimiento(page, sku, '(OUT)', M, `E2E salida ${sku}`);
    });

    await test.step(`5) Productos muestra stock ${stockEsperado}`, async () => {
      const celda = await celdaStock(page, sku);
      // toHaveText reintenta: tolera que la tabla se vuelva a renderizar después del movimiento
      await expect(celda).toHaveText(String(stockEsperado));
    });

    await test.step(`6) Alertas: ${debeAlertar ? 'aparece' : 'no aparece'}`, async () => {
      await irA(page, UI.navAlertas);
      // Ancla positiva: confirma que la vista cargó, para que la aserción negativa no pase por vacío
      await expect(page.getByRole('heading', { name: UI.navAlertas })).toBeVisible();

      // exact: true evita coincidir con un toast que mencione el SKU dentro de una frase
      const enAlertas = page.getByText(sku, { exact: true });
      if (debeAlertar) {
        await expect(enAlertas, `${sku} (stock ${stockEsperado} ≤ mín ${producto.stockMinimo}) debe estar en Alertas`).toBeVisible();
      } else {
        await expect(enAlertas, `${sku} no debe estar en Alertas`).toBeHidden();
      }
    });
  });
});
```

**Decisiones de diseño:**
- **Sin `waitForTimeout`.** La sincronización se hace con:
  - `waitForResponse` en cada POST;
  - `toBeHidden()` del modal;
  - aserciones que reintentan (`toHaveCount`, `toHaveText`).
- **Datos:** con stock inicial 0, mínimo 5, N = 12 y M = 9, el stock final es 3. Eso pasa por la rama de alerta de forma determinista. Si cambias N o M, el resultado esperado y la rama del paso 6 se recalculan solos.
- **`exact: true` en `getByLabel`.** Por defecto Playwright busca por subcadena, y "Stock" coincidiría con "Stock inicial" y con "Stock mínimo".
- **Limpieza:** el producto queda creado. El SKU dinámico evita choques, pero suma 1 a los contadores del dashboard. Si otras pruebas validan cifras exactas, agreguen un reset de semilla, o un `afterEach` que lo elimine por API usando el `id` que devuelve el POST, una vez confirmada la forma de esa respuesta.

---

## 3. Tres riesgos de flakiness en esta app

1. **Estado compartido en el servidor.** La semilla vive en el servidor y no se reinicia entre pruebas. Las pruebas en paralelo o las corridas anteriores cambian stocks, alertas y contadores.
   - En este test se controla con el SKU único y aserciones solo sobre ese producto.
   - Las pruebas que validan cifras globales (valor del inventario, "Stock bajo = 3") necesitan un endpoint de reset o `workers: 1`.
2. **Catálogos y tablas que cargan de forma asíncrona.** El selector de productos de "+ Movimiento" se llena con un fetch, y la tabla de Productos se vuelve a renderizar después de guardar. Si se lee una sola vez con `innerText()` o `isVisible()`, se puede tomar el estado anterior o actuar sobre una opción que todavía no existe.
   - Mitigación: aserciones que reintentan, y `waitForResponse` armado antes del clic.
3. **Toasts y modales con animación.** Un toast como "Producto creado…" puede tapar el botón "+ Movimiento" (el clic falla) o contener el SKU (un `getByText` encuentra dos elementos). Si el modal tiene animación de cierre, el siguiente clic puede llegar antes de que termine.
   - Mitigación: esperar `toBeHidden()` del modal, usar `exact: true` o acotar la búsqueda a una región, y no forzar clics con `{ force: true }`.

---

## 4. Aserciones que la IA NO debería inventar sin evidencia del DOM

| No inventar | Por qué | En este código |
|---|---|---|
| Textos exactos de etiquetas, botones y menú ("Stock inicial", "Registrar", "Alertas stock") | Una sola palabra distinta rompe el selector | Vienen de tu suite, no del DOM. Están en `UI` para confirmarlos |
| Roles ARIA: que el modal sea `role="dialog"`, que Productos sea una `<table>` con `columnheader`, que Alertas tenga un `heading` | Un modal hecho con un `<div>` sin rol, o una lista hecha con `<div>`, hace fallar `getByRole` | Se usan `dialog`, `table` y `heading`: **supuestos por confirmar** |
| Mensajes exactos de éxito o error ("Movimiento registrado", "Stock insuficiente") | Son textos arbitrarios del desarrollador y cambian a menudo | No se valida ningún toast. Se usa el código HTTP y el cierre del modal |
| Formato de presentación: "3/5" en Alertas, "$ 68.000", insignias "Stock bajo" o "Agotado", colores | El formato es-CO incluye espacios no separables, y los textos de estado varían | Solo se verifica el número de la celda Stock y la presencia del SKU |
| Contrato de la API: forma del JSON (`id`, `product.id`), 201 frente a 200, valores internos del `<select>` (`IN` u `OUT`) | Inventarlos produce falsos fallos o limpiezas que no borran nada | Solo `resp.ok()` y la ruta. Las opciones se eligen por el texto visible "(IN)" u "(OUT)" |
| Efectos secundarios no observados: que crear un producto genere un movimiento, que el contador del dashboard suba en X, el orden de la tabla ("primera fila") | Son reglas de negocio o detalles de presentación sin confirmar | No se valida ninguno. La fila se busca por SKU, no por posición |

**Regla práctica:** cada aserción debería poder señalarse en una captura del DOM real, en un criterio de aceptación escrito o en un contrato de API documentado. Si no se puede, no es una aserción: es una pregunta para el equipo.
