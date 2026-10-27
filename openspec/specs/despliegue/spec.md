# despliegue Specification

## Purpose
Único camino a producción: las pruebas como puerta, un despliegue que no abre una consola en el servidor y una vuelta atrás automática.

## Requirements

### Requirement: Puertas antes de producción
El job `deploy` SHALL ejecutarse solo en `push` a `main` y solo si `quality` (unitarias, sintaxis, búsqueda de secretos) y `e2e` (Playwright contra SQL Server en contenedor) terminaron bien.

#### Scenario: Test roto
- **WHEN** falla un test E2E
- **THEN** no se ejecuta `deploy`

### Requirement: Llave de despliegue sin consola
La llave SSH guardada en GitHub SHALL tener en `authorized_keys` el comando forzado `deploy/desplegar.sh`, sin pty ni reenvíos, y el script SHALL aceptar solo un SHA de 40 caracteres hexadecimales que esté en `origin/main`.

#### Scenario: Comando arbitrario
- **WHEN** alguien con la llave intenta `ssh deploy-curso@host "cat /etc/shadow"`
- **THEN** el script responde «commit inválido» y termina

### Requirement: Vuelta atrás automática
Si cualquier paso del script falla o `/api/health` no responde en 30 s, el script SHALL volver al commit anterior y reiniciar el servicio.

### Requirement: Verificación posterior
El job `smoke` SHALL comprobar en producción `/api/health`, el `<title>` de la página, la cabecera `Content-Security-Policy` y que `hfc-diario` sin token responda `401`.
