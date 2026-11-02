---
description: Sube tu configuración local de Claude Code al repo Perfil-Claude
allowed-tools: Bash, Read, Write, Edit
---

Sincroniza `~/.claude` → repo `~/Perfil-Claude` y haz push. Sigue estos pasos al pie de la letra, sin añadir nada más.

Mensaje de commit: `$ARGUMENTS` (si está vacío usa `Sync configuración de Claude Code`).

1. **Repo**: si `~/Perfil-Claude/.git` no existe, clona `https://github.com/VasquezRivero92/Perfil-Claude.git` en `~/Perfil-Claude`. Si existe, ejecuta `git -C ~/Perfil-Claude pull --ff-only`.
2. **Contenido** (con Bash, sin borrar nada en el destino):
   - Copia `~/.claude/CLAUDE.md` al repo si existe.
   - Copia recursivamente `~/.claude/agents`, `~/.claude/commands` y `~/.claude/my-mods` al repo (solo los que existan).
   - Copia cada carpeta de `~/.claude/skills/` al repo en `skills/`, **excepto `synced`** (lo gestiona la cuenta de claude.ai).
3. **settings.json**: lee `~/.claude/settings.json` y escribe en `~/Perfil-Claude/settings.json` la misma configuración, con estas exclusiones (conserva el resto tal cual, JSON con indentación de 2 espacios):
   - Elimina la clave `autoMode` completa.
   - Elimina de `extraKnownMarketplaces` toda entrada cuyo `source.source` sea `directory` o `file` (son rutas de este equipo), y elimina de `enabledPlugins` las claves que terminen en `@<nombre de esos marketplaces>`.
   - Nunca copies `.credentials.json`, `~/.claude.json`, historial, sesiones ni `settings.local.json`.
4. **Publicar**: `git -C ~/Perfil-Claude add -A`. Si `git status --porcelain` está vacío, di "Sin cambios que subir" y termina. Si no, haz commit con el mensaje y `git push`.
5. Reporta en 3–4 líneas qué se subió (o el error exacto si algo falló).
