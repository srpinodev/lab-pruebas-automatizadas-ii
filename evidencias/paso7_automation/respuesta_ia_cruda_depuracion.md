# Respuesta cruda de la IA — Prompt de depuración (Playwright)

- **Herramienta:** Claude (Anthropic), mismo chat.
- **Prompt:** "Prompt de depuración" de `prompts/04_automatizacion.md`, con el error de la primera corrida y los textos y roles reales copiados del inspector.
- **Resultado:** el test avanzó hasta el paso 3 y volvió a fallar (`02_corrida_tras_depuracion.txt`). El equipo hizo la corrección final (ver `README.md`).

---

La causa del timeout es el texto de la etiqueta. Con `exact: true`, el test buscaba "Precio", pero en la interfaz real la etiqueta dice **"Precio (COP)"**, así que `getByLabel` nunca encontraba el campo y Playwright esperó hasta agotar los 60 s.

Con lo que copiaste del inspector encontré otros **cinco problemas** que habrían hecho fallar el test en los pasos siguientes. Los corregí todos de una vez. El objetivo de negocio no cambia: login → crear → IN → OUT → stock → alerta.

## Qué se corrigió y por qué

| # | Problema | Evidencia que diste | Corrección |
|---|---|---|---|
| 1 | **Timeout actual:** la etiqueta "Precio" no existe | La etiqueta es "Precio (COP)" | `UI.campos.precio = 'Precio (COP)'` |
| 2 | El campo "Unidad" no se llenaba. Si es obligatorio, el navegador no envía el formulario y `waitForResponse` se queda esperando (sería el siguiente timeout) | El modal tiene una etiqueta "Unidad" | Se llena con `'und'` |
| 3 | El helper `llenarOSeleccionar` sobraba para Categoría | Categoría es un input con datalist | `fill()` directo y se elimina el helper |
| 4 | `getByRole('dialog')` era ambiguo: hay dos `<dialog>` en el DOM | `#product-dialog` y `#movement-dialog` | `page.locator('#product-dialog')` y `page.locator('#movement-dialog')` |
| 5 | El tipo de movimiento se elegía por la subcadena "(IN)" | Las opciones son "Entrada (IN)" y "Salida (OUT)" | `selectOption({ label: 'Entrada (IN)' })` |
| 6 | La opción de producto se buscaba por subcadena del SKU | Cada opción se ve como "SKU — Nombre (stock: N)" | Expresión regular anclada al inicio: `^SKU —` |
| 7 | Navegación con `link.or(button).first()` | El menú lateral son botones | `getByRole('button', { name, exact: true })` |
| 8 | Los encabezados en mayúsculas rompían la búsqueda de la columna: `innerText` aplica el CSS y devuelve "STOCK" | `text-transform: uppercase` | `allTextContents()` (no aplica CSS) y comparación en minúsculas |
| 9 | `getByText(sku)` en Alertas habría encontrado también las copias del SKU en las vistas **ocultas** (Productos y Dashboard): `getByText` no descarta elementos con `hidden` | Las 4 vistas siempre están en el DOM | Se usa `getByRole('table')`, que excluye lo oculto, y se filtra la fila por SKU |
| 10 | `heading /alertas/i` encontraba dos títulos y fallaba por strict mode | Hay un h2 "Alertas stock" y un h3 "Alertas de reposición" | `heading` de nivel 3 con nombre exacto "Alertas de reposición" |
| 11 | Fallo lento y poco claro: un selector errado consumía todo el timeout del test | El log mostró los 60 s completos | `actionTimeout: 10_000` y timeout propio en cada `waitForResponse` |

## Configuración (fragmento actualizado)

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3080',
    actionTimeout: 10_000,          // un selector errado falla en 10 s con su log, no en 60 s
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
```

## Test corregido

```ts
// tests/e2e-stock-in-out-alerta.spec.ts
import { test, expect, type Page, type Locator } from '@playwright/test';

// Textos y selectores confirmados con el inspector (o por ejecución, ver notas)
const UI = {
  usuario: 'Usuario',
  contrasena: 'Contraseña',
  ingresar: 'Ingresar',
  nuevoProducto: '+ Producto',
  nuevoMovimiento: '+ Movimiento',
  guardar: 'Guardar',
  registrar: 'Registrar',
  dialogoProducto: '#product-dialog',
  dialogoMovimiento: '#movement-dialog',
  menu: { productos: 'Productos', alertas: 'Alertas stock' },
  tituloVistaAlertas: 'Alertas de reposición', // h3 propio de la vista (el h2 es la barra superior)
  columnaStock: 'stock',                        // se compara en minúsculas
  tipo: { in: 'Entrada (IN)', out: 'Salida (OUT)' },
  campos: {
    sku: 'SKU',
    nombre: 'Nombre',
    categoria: 'Categoría',
    precio: 'Precio (COP)',
    stockInicial: 'Stock inicial',
    stockMinimo: 'Stock mínimo',
    unidad: 'Unidad',
    ubicacion: 'Ubicación',
    producto: 'Producto',
    tipo: 'Tipo',
    cantidad: 'Cantidad',
    motivo: 'Motivo',
  },
};

const ADMIN = {
  user: process.env.SP_ADMIN_USER ?? 'admin',
  pass: process.env.SP_ADMIN_PASS ?? 'Admin123!',
};

// Timeout para esperar respuestas de la API: si el formulario no se envía, falla rápido
const TIMEOUT_API = 10_000;

// ---------- Helpers ----------

// El menú lateral son botones. exact evita confundir "Productos" con "+ Producto"
async function irA(page: Page, boton: string) {
  await page.getByRole('button', { name: boton, exact: true }).click();
}

// Las opciones se ven como "SKU — Nombre (stock: N)": se ancla al inicio para no tomar otro SKU
async function seleccionarProducto(select: Locator, sku: string) {
  const opcion = select.locator('option').filter({ hasText: new RegExp(`^\\s*${sku}\\s+—`) });
  await expect(opcion, `Debe existir una sola opción para ${sku}`).toHaveCount(1); // espera a que cargue el catálogo
  const valor = await opcion.getAttribute('value');
  await select.selectOption(valor ?? { label: (await opcion.textContent())!.trim() });
}

async function registrarMovimiento(
  page: Page,
  sku: string,
  tipo: string,
  cantidad: number,
  motivo: string,
) {
  await page.getByRole('button', { name: UI.nuevoMovimiento }).click();
  const form = page.locator(UI.dialogoMovimiento);
  await expect(form).toBeVisible();

  await seleccionarProducto(form.getByLabel(UI.campos.producto, { exact: true }), sku);
  await form.getByLabel(UI.campos.tipo, { exact: true }).selectOption({ label: tipo });
  await form.getByLabel(UI.campos.cantidad, { exact: true }).fill(String(cantidad));
  await form.getByLabel(UI.campos.motivo, { exact: true }).fill(motivo);

  const respuesta = page.waitForResponse(
    (r) => r.url().includes('/api/movements') && r.request().method() === 'POST',
    { timeout: TIMEOUT_API },
  );
  await form.getByRole('button', { name: UI.registrar }).click();
  expect((await respuesta).ok(), `POST /api/movements (${tipo}) debe responder 2xx`).toBeTruthy();
  await expect(form).toBeHidden(); // el <dialog> cerrado deja de mostrarse
}

// Devuelve la celda "Stock" de la fila del SKU en la tabla visible
async function celdaStock(page: Page, sku: string): Promise<Locator> {
  await irA(page, UI.menu.productos);

  // getByRole descarta las vistas con atributo hidden: solo debe quedar la tabla de Productos
  const tabla = page.getByRole('table');
  await expect(tabla, 'Solo una tabla visible (vista Productos)').toHaveCount(1);

  const fila = tabla.getByRole('row').filter({ hasText: sku });
  await expect(fila, `El producto ${sku} debe aparecer una sola vez`).toHaveCount(1);

  // textContent ignora el text-transform: uppercase del CSS (innerText no)
  const encabezados = (await tabla.getByRole('columnheader').allTextContents())
    .map((t) => t.trim().toLowerCase());
  const idx = encabezados.indexOf(UI.columnaStock); // exacto: no confunde con "mín."
  expect(idx, `Debe existir la columna Stock. Encabezados: ${encabezados.join(', ')}`).toBeGreaterThanOrEqual(0);

  // td o th, por si la primera columna se marca como encabezado de fila
  return fila.locator('td, th').nth(idx);
}

// ---------- Prueba ----------

test.describe('E2E inventario: alta → IN → OUT → stock → alerta', () => {
  test('el stock refleja IN y OUT, y aparece en Alertas si queda ≤ mínimo', async ({ page }) => {
    // SKU único por ejecución y por worker
    const sku = `E2E-${Date.now()}-${test.info().workerIndex}`;
    const producto = {
      sku,
      nombre: `Producto E2E ${sku}`,
      categoria: 'Químicos',
      precio: 68000,
      stockInicial: 0,
      stockMinimo: 5,
      unidad: 'und',
      ubicacion: 'B-05',
    };
    const N = 12; // entrada
    const M = 9;  // salida

    // El resultado esperado se deriva de los datos
    const stockTrasIn = producto.stockInicial + N;
    expect(M, 'Precondición: M debe ser menor que el stock tras el IN').toBeLessThan(stockTrasIn);
    const stockEsperado = stockTrasIn - M;
    const debeAlertar = stockEsperado <= producto.stockMinimo;

    await test.step('1) Login como admin', async () => {
      await page.goto('/');
      await page.getByLabel(UI.usuario, { exact: true }).fill(ADMIN.user);
      await page.getByLabel(UI.contrasena, { exact: true }).fill(ADMIN.pass);
      await page.getByRole('button', { name: UI.ingresar }).click();
      await expect(page.getByRole('button', { name: UI.nuevoProducto })).toBeVisible();
    });

    await test.step('2) Crear producto con SKU único', async () => {
      await page.getByRole('button', { name: UI.nuevoProducto }).click();
      const form = page.locator(UI.dialogoProducto);
      await expect(form).toBeVisible();

      const c = UI.campos;
      await form.getByLabel(c.sku, { exact: true }).fill(producto.sku);
      await form.getByLabel(c.nombre, { exact: true }).fill(producto.nombre);
      await form.getByLabel(c.categoria, { exact: true }).fill(producto.categoria); // input con datalist
      await form.getByLabel(c.precio, { exact: true }).fill(String(producto.precio)); // sin separador de miles
      await form.getByLabel(c.stockInicial, { exact: true }).fill(String(producto.stockInicial));
      await form.getByLabel(c.stockMinimo, { exact: true }).fill(String(producto.stockMinimo));
      await form.getByLabel(c.unidad, { exact: true }).fill(producto.unidad);
      await form.getByLabel(c.ubicacion, { exact: true }).fill(producto.ubicacion);

      const respuesta = page.waitForResponse(
        (r) => r.url().includes('/api/products') && r.request().method() === 'POST',
        { timeout: TIMEOUT_API },
      );
      await form.getByRole('button', { name: UI.guardar }).click();
      expect((await respuesta).ok(), 'POST /api/products debe responder 2xx').toBeTruthy();
      await expect(form).toBeHidden();
    });

    await test.step(`3) Registrar IN de ${N}`, async () => {
      await registrarMovimiento(page, sku, UI.tipo.in, N, `E2E entrada ${sku}`);
    });

    await test.step(`4) Registrar OUT de ${M}`, async () => {
      await registrarMovimiento(page, sku, UI.tipo.out, M, `E2E salida ${sku}`);
    });

    await test.step(`5) Productos muestra stock ${stockEsperado}`, async () => {
      const celda = await celdaStock(page, sku);
      await expect(celda).toHaveText(String(stockEsperado)); // la celda muestra un entero, p. ej. "3"
    });

    await test.step(`6) Alertas: ${debeAlertar ? 'aparece' : 'no aparece'}`, async () => {
      await irA(page, UI.menu.alertas);
      // Ancla positiva y sin ambigüedad: el h3 propio de la vista (el h2 es de la barra superior)
      await expect(
        page.getByRole('heading', { name: UI.tituloVistaAlertas, level: 3, exact: true }),
      ).toBeVisible();

      // Única tabla visible: la de Alertas (Dashboard y Productos quedan con hidden)
      const tablaAlertas = page.getByRole('table');
      await expect(tablaAlertas, 'Solo una tabla visible (vista Alertas)').toHaveCount(1);

      const filaAlerta = tablaAlertas.getByRole('row').filter({ hasText: sku });
      if (debeAlertar) {
        await expect(
          filaAlerta,
          `${sku} (stock ${stockEsperado} ≤ mín ${producto.stockMinimo}) debe estar en Alertas`,
        ).toHaveCount(1);
      } else {
        await expect(filaAlerta, `${sku} no debe estar en Alertas`).toHaveCount(0);
      }
    });
  });
});
```

## Supuestos que siguen pendientes de confirmar

- **Ya confirmados al ejecutar:** las etiquetas del login, el botón "Ingresar", el botón "+ Producto" y los campos SKU, Nombre y Categoría. El test llegó hasta Precio, así que todo lo anterior funcionó.
- **Sin confirmar todavía:**
  - El texto del botón "+ Movimiento".
  - Las rutas `/api/products` y `/api/movements`. Si cambian, `waitForResponse` falla en 10 s con un mensaje claro.
  - Que "Unidad" acepte el valor `'und'` (texto libre o lista).
- **Para el próximo fallo:** abre la traza con `npx playwright show-trace test-results/**/trace.zip`. En la pestaña Network se ve si el POST salió o si el formulario quedó bloqueado por una validación nativa, que es lo que pasaría si falta un campo obligatorio.
