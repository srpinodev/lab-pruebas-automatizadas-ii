// tests/e2e-stock-in-out-alerta.spec.ts
// Versión corregida con el prompt de depuración (ver evidencias/paso7_automation/).
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

  // Corrección del equipo: en los <select>, getByLabel(exact) compara contra todo el texto del <label>,
  // que incluye las opciones ("Producto CAB-USB-01 — ..."), y no encuentra nada. El rol combobox sí se llama "Producto".
  await seleccionarProducto(form.getByRole('combobox', { name: UI.campos.producto, exact: true }), sku);
  await form.getByRole('combobox', { name: UI.campos.tipo, exact: true }).selectOption({ label: tipo });
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
