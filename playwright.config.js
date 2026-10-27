// E2E del Panel HFC (docs/07-testing/README.md).
// Levanta la API con SERVIR_WEB=1 (web + API en el mismo origen, como en producción detrás de Nginx).
// Requiere una BD_CURSO_HFC con la semilla cargada y las variables DB_*, JWT_SECRET y CLAVE_* (ver .env.example).
const { defineConfig } = require('@playwright/test');

const PUERTO = process.env.E2E_PUERTO || '8077';
const PYTHON = process.env.PYTHON || 'python3';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,       // comparten el límite de intentos de login en memoria de la API
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || `http://127.0.0.1:${PUERTO}`,
    viewport: { width: 1366, height: 800 },
    contextOptions: { reducedMotion: 'reduce' },
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
  },
  // Con E2E_BASE_URL (smoke contra producción) no se levanta nada local.
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: `${PYTHON} -m uvicorn main:app --host 127.0.0.1 --port ${PUERTO}`,
    cwd: './api',
    url: `http://127.0.0.1:${PUERTO}/api/health`,
    env: { ...process.env, SERVIR_WEB: '1' },
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
