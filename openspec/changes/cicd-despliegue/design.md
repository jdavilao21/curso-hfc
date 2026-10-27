## Decisions
- E2E en CI contra `mcr.microsoft.com/mssql/server:2022-latest` como service container; claves de CI válidas solo dentro del contenedor.
- `deploy` usa el environment `production` (secrets propios) y `concurrency` sin cancelación.
- El script corre `semilla.py`: cada deploy deja la base en estado conocido.

## Assumptions
- Registro DNS `curso-hfc` creado por Jose.

## Risks / Trade-offs
- El SSH del VPS queda expuesto a los runners (IPs variables); la defensa es la llave + comando forzado.
