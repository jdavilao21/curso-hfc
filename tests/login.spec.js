// PRD §Criterios de éxito 1–3 y casos borde CB-01, CB-02, CB-05 · spec openspec/specs/acceso/spec.md
const { test, expect } = require('@playwright/test');
const { USUARIOS, ingresar, ingresarComo } = require('./helpers');

test.describe('Acceso al panel', () => {
  test('un supervisor entra y ve las cuatro pestañas con datos', async ({ page }) => {
    await ingresarComo(page, 'sup');
    for (const tab of ['diario', 'intervalos', 'supervisores', 'asesores']) {
      await expect(page.locator(`.sb-nav button[data-tab="${tab}"]`)).toBeVisible();
    }
    await expect(page.locator('#kpi-strip-dia')).toContainText('Llam. Recibidas');
    await expect(page.locator('#sb-who')).toHaveText('Karina Ríos');
  });

  test('clave incorrecta muestra el aviso y no entra', async ({ page }) => {
    await ingresar(page, USUARIOS.sup.usuario, 'clave-equivocada');
    await expect(page.locator('#login-err')).toHaveText('Usuario o contraseña incorrectos');
    await expect(page.locator('#app')).not.toHaveClass(/\bon\b/);
  });

  test('un usuario dado de baja no entra aunque la clave sea correcta', async ({ page }) => {
    await ingresar(page, USUARIOS.baja.usuario, USUARIOS.baja.clave);
    await expect(page.locator('#login-err')).toHaveText('Usuario o contraseña incorrectos');
  });

  test('campos vacíos se avisan sin llamar a la API', async ({ page }) => {
    let llamadas = 0;
    page.on('request', r => { if (r.url().includes('/api/hfc-login')) llamadas++; });
    await ingresar(page, '', '');
    await expect(page.locator('#login-err')).toHaveText('Ingresa usuario y contraseña.');
    expect(llamadas).toBe(0);
  });

  test('el usuario se normaliza a mayúsculas', async ({ page }) => {
    await ingresar(page, 'sup.demo', USUARIOS.sup.clave);
    await expect(page.locator('#app')).toHaveClass(/\bon\b/);
  });

  test('el perfil CLIENTE CLARO no ve la pestaña Asesores', async ({ page }) => {
    await ingresarComo(page, 'cliente');
    await expect(page.locator('.sb-nav button[data-tab="supervisores"]')).toBeVisible();
    await expect(page.locator('.sb-nav button[data-tab="asesores"]')).toBeHidden();
    await page.click('.sb-nav button[data-tab="supervisores"]');
    for (const s of ['Karina Ríos', 'Marco Salas', 'Lucía Vega']) await expect(page.locator('#tbl-sup')).toContainText(s);
  });

  test('Salir vuelve al login y limpia los campos', async ({ page }) => {
    await ingresarComo(page, 'admin');
    await page.getByRole('button', { name: /Salir/ }).click();
    await expect(page.locator('#pantalla-login')).toBeVisible();
    await expect(page.locator('#inp-pass')).toHaveValue('');
  });

  test('sesión vencida: al actualizar vuelve al login con el aviso', async ({ page }) => {
    await ingresarComo(page, 'admin');
    await page.evaluate(() => { SESION.token = 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.firma-invalida'; });
    await page.click('#btn-refresh');
    await expect(page.locator('#login-err')).toHaveText('Tu sesión venció. Ingresa de nuevo.');
  });
});
