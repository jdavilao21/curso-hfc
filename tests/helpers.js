// Utilidades comunes de los E2E. Las claves vienen del entorno, nunca del código (SP-06).
const { expect } = require('@playwright/test');

const USUARIOS = {
  admin:   { usuario: 'ADMIN.DEMO',   clave: process.env.CLAVE_ADMIN,      perfil: 'ADMINISTRADOR' },
  sup:     { usuario: 'SUP.DEMO',     clave: process.env.CLAVE_SUPERVISOR, perfil: 'SUPERVISOR' },
  cliente: { usuario: 'CLIENTE.DEMO', clave: process.env.CLAVE_CLIENTE,    perfil: 'CLIENTE CLARO' },
  baja:    { usuario: 'BAJA.DEMO',    clave: process.env.CLAVE_SUPERVISOR, perfil: 'SUPERVISOR' },
};

// El formulario aparece al hacer clic en la mascota (js/login-mascota.js).
async function abrirLogin(page) {
  await page.goto('/');
  await page.locator('#gl-mascota').click({ force: true });
  await expect(page.locator('#inp-user')).toBeVisible();
}

async function ingresar(page, usuario, clave) {
  await abrirLogin(page);
  await page.fill('#inp-user', usuario);
  await page.fill('#inp-pass', clave);
  await page.click('#btn-login');
}

async function ingresarComo(page, quien) {
  const u = USUARIOS[quien];
  await ingresar(page, u.usuario, u.clave);
  await expect(page.locator('#app')).toHaveClass(/\bon\b/);
  await expect(page.locator('#sb-perfil')).toHaveText(u.perfil);
}

// Valor numérico de una tarjeta KPI por su título (p. ej. «Llam. Recibidas» → 52766).
async function valorTarjeta(page, contenedor, titulo) {
  const tarjeta = page.locator(`${contenedor} > *`).filter({ hasText: titulo }).first();
  await expect(tarjeta).toBeVisible();
  const texto = await tarjeta.innerText();
  const m = texto.split('\n').map(s => s.trim()).find(s => /^[\d.,:%]+$/.test(s));
  return m;
}

async function loginApi(request, quien) {
  const u = USUARIOS[quien];
  const r = await request.post('/api/hfc-login', { data: { usuario_e: u.usuario, password: u.clave } });
  expect(r.status()).toBe(200);
  return (await r.json()).token;
}

module.exports = { USUARIOS, abrirLogin, ingresar, ingresarComo, valorTarjeta, loginApi };
