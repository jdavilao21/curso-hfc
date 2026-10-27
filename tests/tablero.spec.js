// PRD §Criterios de éxito 4–6 y casos borde CB-03, CB-04 · specs tablero-diario, tablero-equipo, exportacion
const { test, expect } = require('@playwright/test');
const { ingresarComo, valorTarjeta } = require('./helpers');

test.describe('Tablero', () => {
  test.beforeEach(async ({ page }) => { await ingresarComo(page, 'admin'); });

  test('Diario abre en el último período con datos', async ({ page }) => {
    await expect(page.locator('#sel-periodo')).toHaveValue('202609');
  });

  test('cambiar de período recalcula las tarjetas', async ({ page }) => {
    const sep = await valorTarjeta(page, '#kpi-strip-dia', 'Llam. Recibidas');
    await page.selectOption('#sel-periodo', '202608');
    await expect.poll(() => valorTarjeta(page, '#kpi-strip-dia', 'Llam. Recibidas')).not.toBe(sep);
  });

  test('Intervalos muestra una fila por franja de 30 minutos', async ({ page }) => {
    await page.click('.sb-nav button[data-tab="intervalos"]');
    const tabla = page.locator('#tab-intervalos table.datos tbody tr');
    await expect(tabla.first()).toBeVisible();
    await expect(page.locator('#tab-intervalos')).toContainText('08:00');
    await expect(page.locator('#tab-intervalos')).toContainText('16:30');
  });

  test('Supervisores lista a los tres supervisores de la nómina', async ({ page }) => {
    await page.click('.sb-nav button[data-tab="supervisores"]');
    for (const s of ['Karina Ríos', 'Marco Salas', 'Lucía Vega']) {
      await expect(page.locator('#tbl-sup')).toContainText(s);
    }
  });

  test('Asesores filtra por supervisor', async ({ page }) => {
    await page.click('.sb-nav button[data-tab="asesores"]');
    const filas = page.locator('#tab-asesores table.datos tbody tr');
    await expect(filas.first()).toBeVisible();
    const antes = await filas.count();
    const sel = page.locator('#tab-asesores select').filter({ has: page.locator('option', { hasText: 'Marco Salas' }) }).first();
    await sel.selectOption({ label: 'Marco Salas' });
    await expect.poll(() => filas.count()).toBeLessThan(antes);
    await expect(page.locator('#tab-asesores table.datos tbody')).not.toContainText('Karina Ríos');
  });

  test('exportar Diario descarga un Excel', async ({ page }) => {
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#tab-diario .btn-export').first().click(),
    ]);
    expect(descarga.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('un nombre con HTML en la nómina se muestra como texto (CB-06, SP-08)', async ({ page }) => {
    let dialogos = 0;
    page.on('dialog', d => { dialogos++; d.dismiss(); });
    const veneno = "FULL TIME');alert(1);('";
    await page.route('**/api/hfc-supervisores', async r => {
      const filas = await (await r.fetch()).json();
      filas.forEach(f => { f.CONDICION_LAB = veneno; f.NOMBRE_ASESOR = '<img src=x onerror=alert(2)>'; });
      await r.fulfill({ json: filas });
    });
    await page.click('#btn-refresh');
    await page.click('.sb-nav button[data-tab="asesores"]');
    await expect(page.locator('#tab-asesores table.datos tbody tr').first()).toBeVisible();
    for (const fila of await page.locator('#tab-asesores [onclick]').all()) await fila.click({ force: true }).catch(() => {});
    expect(await page.locator('#tab-asesores img[src="x"]').count()).toBe(0);
    expect(dialogos).toBe(0);
  });

  test('la API caída muestra un aviso en vez de una pantalla vacía', async ({ page }) => {
    await page.route('**/api/hfc-diario', r => r.fulfill({ status: 503, body: '{"ok":false}' }));
    await page.click('#btn-refresh');
    await expect(page.locator('#carga-estado')).toContainText('No se pudo cargar los datos');
  });
});
