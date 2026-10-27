---
titulo: Diagrama de flujo — CI/CD y despliegue
version: 1.0.0
fecha: 2026-10-26
fuentes:
  - .github/workflows/ci-cd.yml
  - deploy/desplegar.sh
  - deploy/curso-hfc-api.service
adrs: [ADR-0008]
---

# CI/CD y despliegue — flujo (v1.0.0)

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 2026-10-26 | Versión inicial: cuatro jobs, comando forzado por SSH y rollback automático |

```mermaid
flowchart TD
    P([push / pull_request]) --> Q

    subgraph GH ["GitHub Actions"]
        Q["quality<br/>pytest · py_compile · node --check<br/>grep de secretos · pip-audit (informativo)"]
        Q -- falla --> X1[/"❌ se detiene"/]
        Q -- ok --> E["e2e<br/>SQL Server 2022 en contenedor<br/>01_crear_bd.sql → semilla.py → Playwright"]
        E -- falla --> X2[/"❌ se detiene · sube playwright-report"/]
        E -- ok --> B{"¿push a main?"}
        B -- no (PR) --> FIN([fin: solo verificación])
        B -- sí --> DP["deploy · environment production<br/>ssh deploy-curso@host &lt;SHA&gt;"]
    end

    subgraph VPS ["VPS — deploy/desplegar.sh (comando forzado)"]
        DP --> V1{"¿SHA = 40 hex<br/>y está en origin/main?"}
        V1 -- no --> X3[/"exit 2/3 · nada cambia"/]
        V1 -- sí --> G["git checkout --detach SHA"]
        G --> PIP["pip install -r api/requirements.txt"]
        PIP --> S["semilla.py (curso_hfc_carga)<br/>esquema idempotente + datos fijos"]
        S --> R["systemctl restart curso-hfc-api"]
        R --> HC{"/api/health ok<br/>en ≤ 30 s?"}
        HC -- sí --> OK([✅ desplegado])
        HC -- no --> RB["trap ERR: checkout commit anterior<br/>+ restart"]
        PIP -- error --> RB
        S -- error --> RB
        RB --> X4[/"❌ job deploy falla"/]
    end

    OK --> SM["smoke (desde GitHub)<br/>health · title · CSP · hfc-diario sin token = 401"]
    SM -- falla --> X5[/"❌ alerta: revisar y revertir a mano"/]
    SM -- ok --> FIN2([fin])
```
