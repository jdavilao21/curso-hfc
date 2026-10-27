# 05 — Spec + Tasks (Spec-Driven Development con OpenSpec)

Las specs **no viven en esta carpeta**: el CLI de OpenSpec exige que estén en
[`openspec/`](../../openspec/), en la raíz del repo. Esta página es el puente entre el backlog y
esas specs.

## Cómo se trabaja

Cada ítem de [`BACKLOG.md`](../04-backlog/BACKLOG.md) se convierte en **un** change de OpenSpec:

1. `/opsx:propose` → `proposal.md`, `design.md`, `specs/` (delta) y `tasks.md`.
2. `/opsx:apply` → implementa las tareas y las marca en `tasks.md`.
3. Verificación (`pytest`, Playwright) y code review (`.claude/agents/code-reviewer.md`).
4. `/opsx:archive` → mueve el change a `openspec/changes/archive/` y sincroniza la spec vigente
   en `openspec/specs/`.

## Backlog → change → spec vigente

| Ítem | Change archivado | Spec vigente |
|---|---|---|
| #1 Front recortado | [`2026-10-26-front-recortado-alcance`](../../openspec/changes/archive/2026-10-26-front-recortado-alcance/) | [`app-shell`](../../openspec/specs/app-shell/spec.md) |
| #2 Base y semilla | [`2026-10-26-base-datos-semilla`](../../openspec/changes/archive/2026-10-26-base-datos-semilla/) | [`datos-demo`](../../openspec/specs/datos-demo/spec.md) |
| #3 Login y token | [`2026-10-26-login-token`](../../openspec/changes/archive/2026-10-26-login-token/) | [`acceso`](../../openspec/specs/acceso/spec.md) |
| #4 Endpoints de datos | [`2026-10-26-endpoints-datos-autorizacion`](../../openspec/changes/archive/2026-10-26-endpoints-datos-autorizacion/) | [`api-datos`](../../openspec/specs/api-datos/spec.md) |
| #5 Front ↔ API | [`2026-10-26-front-conectado-api`](../../openspec/changes/archive/2026-10-26-front-conectado-api/) | [`tablero`](../../openspec/specs/tablero/spec.md) |
| #6 CI/CD y despliegue | [`2026-10-27-cicd-despliegue`](../../openspec/changes/archive/2026-10-27-cicd-despliegue/) | [`despliegue`](../../openspec/specs/despliegue/spec.md) |
