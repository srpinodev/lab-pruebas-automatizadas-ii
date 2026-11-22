import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * Regresión de criterios de aceptación (Top 8 de la suite, Paso 3).
 * Las pruebas marcadas con test.fail() reproducen un bug confirmado en evidencias/paso5_bugs:
 * Playwright las cuenta como "fallo esperado". Si el bug se corrige, la prueba pasará y la
 * corrida se pondrá roja para recordar que hay que quitar la marca.
 *
 * Los datos se preparan por API y se verifica por la interfaz. Cada prueba usa un SKU propio
 * para no depender del estado que dejen las demás.
 */

const sku = (p: string) => `${p}-${Date.now()}`;

async function token(request: APIRequestContext, username: string, password: string) {
  const r = await request.post('/api/login', { data: { username, password } });
  expect(r.ok()).toBeTruthy();
  return (await r.json()).token as string;
}

async function crearProducto(request: APIRequestContext, t: string, data: Record<string, unknown>) {
  const r = await request.post('/api/products', { headers: { Authorization: `Bearer ${t}` }, data });
  expect(r.status()).toBe(201);
  return (await r.json()).product as { id: string; sku: string; stock: number };
}

async function login(page: Page, usuario: string, clave: string) {
  await page.goto('/');
  await page.getByLabel('Usuario').fill(usuario);
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
}

async function registrarMovimiento(page: Page, codigo: string, tipo: 'Entrada (IN)' | 'Salida (OUT)' | 'Ajuste (ADJUST)', cantidad: number) {
  await page.getByRole('button', { name: '+ Movimiento' }).click();
  const form = page.locator('#movement-dialog');
  await expect(form).toBeVisible();
  const opcion = form.locator('option').filter({ hasText: new RegExp(`^\\s*${codigo}\\s+—`) });
  await expect(opcion).toHaveCount(1);
  await form.getByRole('combobox', { name: 'Producto', exact: true }).selectOption((await opcion.getAttribute('value'))!);
  await form.getByRole('combobox', { name: 'Tipo', exact: true }).selectOption({ label: tipo });
  await form.getByLabel('Cantidad', { exact: true }).fill(String(cantidad));
  await form.getByLabel('Motivo', { exact: true }).fill(`Regresión ${tipo} ${cantidad}`);
  const resp = page.waitForResponse((r) => r.url().includes('/api/movements') && r.request().method() === 'POST');
  await form.getByRole('button', { name: 'Registrar' }).click();
  return resp;
}

async function stockEnPantalla(page: Page, codigo: string) {
  await page.getByRole('button', { name: 'Productos', exact: true }).click();
  const fila = page.getByRole('table').getByRole('row').filter({ hasText: codigo });
  await expect(fila).toHaveCount(1);
  return fila.getByRole('cell').nth(4); // columnas: SKU, Producto, Categoría, Precio, Stock…
}

test.describe('Criterios de aceptación de StockPascual', () => {
  test('TC-SEG-02 · el operador no crea, edita ni elimina productos por API (CA9)', async ({ request }) => {
    const t = await token(request, 'operador', 'Oper123!');
    const h = { Authorization: `Bearer ${t}` };
    const post = await request.post('/api/products', { headers: h, data: { sku: sku('OPE'), name: 'Hub USB 4 puertos', category: 'Accesorios', price: 45000, stock: 5, minStock: 2, location: 'A-02' } });
    const put = await request.put('/api/products/p3', { headers: h, data: { price: 1 } });
    const del = await request.delete('/api/products/p3', { headers: h });
    expect([post.status(), put.status(), del.status()]).toEqual([403, 403, 403]);
  });

  test('TC-DAS-01 · el valor del inventario es Σ stock × precio (CA7) — BUG-03', async ({ page, request }) => {
    test.fail(true, 'BUG-03: el dashboard divide el valor entre 1000');
    const t = await token(request, 'admin', 'Admin123!');
    // Valor esperado calculado desde otra fuente (el catálogo), no con la fórmula del dashboard
    const { products } = await (await request.get('/api/products', { headers: { Authorization: `Bearer ${t}` } })).json();
    const esperado = products.reduce((a: number, p: { stock: number; price: number }) => a + p.stock * p.price, 0);
    await login(page, 'admin', 'Admin123!');
    const tarjeta = page.locator('.metric', { hasText: 'Valor inventario' }).locator('strong');
    // es-CO usa espacio no separable entre $ y el número: se normaliza antes de comparar
    await expect(tarjeta).toHaveText(new RegExp(`^\\$\\s${esperado.toLocaleString('es-CO').replace(/\./g, '\\.')}$`));
  });

  test('TC-NEG-01 · una salida mayor al stock se rechaza (CA1) — BUG-01', async ({ page, request }) => {
    test.fail(true, 'BUG-01: OUT deja el stock en negativo');
    const t = await token(request, 'admin', 'Admin123!');
    const p = await crearProducto(request, t, { sku: sku('NEG'), name: 'Monitor prueba OUT', category: 'Pantallas', price: 520000, stock: 3, minStock: 4, location: 'C-01' });
    await login(page, 'admin', 'Admin123!');
    const resp = await registrarMovimiento(page, p.sku, 'Salida (OUT)', 4);
    expect((await resp).status(), 'El backend debe rechazar la salida').toBe(400);
    await page.keyboard.press('Escape');
    await expect(await stockEnPantalla(page, p.sku)).toHaveText('3');
  });

  test('TC-MOV-04 · ADJUST deja el stock en el valor contado (CA4) — BUG-02', async ({ page, request }) => {
    test.fail(true, 'BUG-02: ADJUST suma en vez de fijar');
    const t = await token(request, 'admin', 'Admin123!');
    const p = await crearProducto(request, t, { sku: sku('ADJ'), name: 'Teclado prueba ADJUST', category: 'Periféricos', price: 189000, stock: 22, minStock: 5, location: 'B-03' });
    await login(page, 'operador', 'Oper123!');
    expect((await registrarMovimiento(page, p.sku, 'Ajuste (ADJUST)', 20)).ok()).toBeTruthy();
    await expect(await stockEnPantalla(page, p.sku)).toHaveText('20');
  });

  test('TC-NEG-02 · no se permite un SKU duplicado (CA2) — BUG-06', async ({ request }) => {
    test.fail(true, 'BUG-06: el backend acepta SKU repetidos');
    const t = await token(request, 'admin', 'Admin123!');
    const codigo = sku('DUP');
    await crearProducto(request, t, { sku: codigo, name: 'Cable USB-C 1m', category: 'Accesorios', price: 18900, stock: 40, minStock: 10, location: 'A-01' });
    const r = await request.post('/api/products', { headers: { Authorization: `Bearer ${t}` }, data: { sku: codigo, name: 'Cable USB-C 2m', category: 'Accesorios', price: 24900, stock: 12, minStock: 5, location: 'A-02' } });
    expect(r.status(), 'El segundo producto con el mismo SKU debe rechazarse').toBeGreaterThanOrEqual(400);
  });

  test('TC-SEG-03 · un nombre con HTML no ejecuta código (CA10) — BUG-04', async ({ page, request }) => {
    test.fail(true, 'BUG-04: XSS almacenado en el selector de movimientos');
    const t = await token(request, 'admin', 'Admin123!');
    const p = await crearProducto(request, t, { sku: sku('XSS'), name: '<img src=x onerror=alert("XSS")>', category: 'Accesorios', price: 10000, stock: 1, minStock: 5, location: 'A-02' });
    const alertas: string[] = [];
    page.on('dialog', async (d) => { alertas.push(d.message()); await d.dismiss(); });
    try {
      await login(page, 'operador', 'Oper123!');
      await page.getByRole('button', { name: '+ Movimiento' }).click();
      await expect(page.locator('#movement-dialog')).toBeVisible();
      expect(alertas, `Se ejecutó código del nombre del producto ${p.sku}`).toEqual([]);
    } finally {
      // Limpieza: el script se ejecuta en cada recarga y molestaría a las demás pruebas
      await request.delete(`/api/products/${p.id}`, { headers: { Authorization: `Bearer ${t}` } });
    }
  });

  test('TC-CSV-01 · el CSV exporta todos los productos (CA6) — BUG-05', async ({ page }) => {
    test.fail(true, 'BUG-05: el CSV omite los dos últimos productos');
    await login(page, 'admin', 'Admin123!');
    await page.getByRole('button', { name: 'Productos', exact: true }).click();
    const enPantalla = await page.getByRole('table').getByRole('row').count() - 1; // sin el encabezado
    const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Exportar CSV' }).click()]);
    const fs = await import('node:fs');
    const filas = fs.readFileSync(await descarga.path(), 'utf8').trim().split('\n').length - 1;
    expect(filas, `Productos en pantalla: ${enPantalla}`).toBe(enPantalla);
  });
});
