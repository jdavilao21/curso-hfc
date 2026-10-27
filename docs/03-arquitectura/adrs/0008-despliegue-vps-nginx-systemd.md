# ADR 0008: Despliegue en el VPS propio — Nginx + systemd, CI/CD con GitHub Actions

## Estado

Aceptado (el comando forzado por SSH se agregó tras la revisión adversarial)

## Contexto

GEA ya publica sus tableros desde un VPS Ubuntu con Nginx, Certbot y servicios systemd. El
repositorio será público en GitHub (lo revisa el profesor del curso).

## Decisión

- Nginx sirve `web/` y hace proxy de `/api/` al servicio `curso-hfc-api` (systemd, usuario sin
  privilegios `curso-hfc`, `ProtectSystem=strict`). Certificado con Certbot.
- GitHub Actions: `quality` → `e2e` (SQL Server en contenedor) → `deploy` → `smoke`.
- `deploy` entra por SSH como `deploy-curso`, cuya llave tiene un **comando forzado**
  (`deploy/desplegar.sh`): la llave guardada en GitHub no abre una consola, solo despliega un
  commit que ya esté en `origin/main`. Si el `health` falla, el script vuelve al commit anterior.

## Alternativas consideradas

- **Vercel/Render/Railway**: no hablan con el SQL Server del VPS sin exponer el puerto 1433.
- **Deploy manual por MobaXterm**: es como se hace hoy; sin gates, un test roto llega a producción.

## Consecuencias

- Un solo camino a producción, con los E2E como puerta.
- Hace falta abrir el SSH del VPS a los runners de GitHub (IPs variables): la protección es la
  llave + el comando forzado, no la IP.
