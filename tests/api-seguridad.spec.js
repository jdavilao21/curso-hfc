// SECURITY-REPORT SP-01…SP-05 · spec openspec/specs/api-datos/spec.md
// Pruebas directas a la API (sin navegador): lo que el front no puede garantizar.
const { test, expect } = require('@playwright/test');
const { loginApi } = require('./helpers');

test.describe('API: autenticación y contrato', () => {
  test('sin token responde 401', async ({ request }) => {
    for (const ep of ['hfc-diario', 'hfc-supervisores']) {
      expect((await request.post(`/api/${ep}`)).status()).toBe(401);
    }
  });

  test('token con la firma alterada responde 401', async ({ request }) => {
    const t = await loginApi(request, 'sup');
    const [cab, datos] = t.split('.');
    const r = await request.post('/api/hfc-diario', { headers: { Authorization: `Bearer ${cab}.${datos}.AAAA` } });
    expect(r.status()).toBe(401);
  });

  test('token con alg=none responde 401', async ({ request }) => {
    const t = await loginApi(request, 'sup');
    const datos = t.split('.')[1];
    const cab = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url');
    expect((await request.post('/api/hfc-diario', { headers: { Authorization: `Bearer ${cab}.${datos}.` } })).status()).toBe(401);
  });

  test('con token válido devuelve las filas con el contrato esperado', async ({ request }) => {
    const t = await loginApi(request, 'admin');
    const r = await request.post('/api/hfc-diario', { headers: { Authorization: `Bearer ${t}` } });
    expect(r.status()).toBe(200);
    expect(r.headers()['cache-control']).toBe('no-store');
    const filas = await r.json();
    expect(filas.length).toBe(61 * 18);                    // 61 días × 18 franjas (semilla fija)
    expect(Object.keys(filas[0])).toEqual(expect.arrayContaining(
      ['PERIODO', 'FECHA', 'FECHA_VISUAL', 'SEMANA', 'FRANJA_GTR', 'LLAM_RECIBIDAS', 'CANT_ATENDIDA', 'TMG_TOTAL_SEG']));
    for (const f of filas) expect(f.CANT_ATENDIDA + f.CANT_ABANDONADA).toBe(f.LLAM_RECIBIDAS);
  });

  test('CLIENTE CLARO recibe Supervisores agregado, sin detalle por asesor', async ({ request }) => {
    const pedir = async quien => (await request.post('/api/hfc-supervisores',
      { headers: { Authorization: `Bearer ${await loginApi(request, quien)}` } })).json();
    const [detalle, agregado] = [await pedir('admin'), await pedir('cliente')];
    expect(agregado.every(f => f.USUARIO === '' && f.NOMBRE_ASESOR === '')).toBe(true);
    expect(agregado.length).toBeLessThan(detalle.length);
    const suma = (filas, c) => filas.reduce((a, f) => a + f[c], 0);
    expect(suma(agregado, 'CANT_ATENDIDA')).toBe(suma(detalle, 'CANT_ATENDIDA'));   // mismos totales
  });

  test('el login no revela si el usuario existe', async ({ request }) => {
    const a = await request.post('/api/hfc-login', { data: { usuario_e: 'NO.EXISTE', password: 'x'.repeat(10) } });
    const b = await request.post('/api/hfc-login', { data: { usuario_e: 'ADMIN.DEMO', password: 'x'.repeat(10) } });
    expect(a.status()).toBe(401);
    expect(await a.json()).toEqual(await b.json());
  });

  test('inyección SQL en el usuario no entra', async ({ request }) => {
    const r = await request.post('/api/hfc-login', { data: { usuario_e: "' OR 1=1 --", password: "' OR 1=1 --" } });
    expect(r.status()).toBe(401);
  });

  test('cinco intentos fallidos bloquean al sexto con 429', async ({ request }) => {
    const datos = { usuario_e: 'LIMITE.PRUEBA', password: 'incorrecta' };
    for (let i = 0; i < 5; i++) expect((await request.post('/api/hfc-login', { data: datos })).status()).toBe(401);
    expect((await request.post('/api/hfc-login', { data: datos })).status()).toBe(429);
  });

  test('la documentación automática de FastAPI no está expuesta', async ({ request }) => {
    for (const p of ['/docs', '/openapi.json']) expect((await request.get(p)).status()).toBe(404);
  });
});
