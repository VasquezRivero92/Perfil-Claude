---
description: Trae la configuración de Perfil-Claude y la aplica en este equipo
allowed-tools: Bash, Read, Write, Edit
---

Sincroniza repo `~/Perfil-Claude` → `~/.claude` en este equipo. Sigue estos pasos al pie de la letra, sin añadir nada más.

1. **Repo**: si `~/Perfil-Claude/.git` no existe, clona `https://github.com/VasquezRivero92/Perfil-Claude.git` en `~/Perfil-Claude`. Si existe, ejecuta `git -C ~/Perfil-Claude pull --ff-only`.
2. **Contenido** (con Bash; crea `~/.claude` si no existe; no borres nada en el destino):
   - Copia `CLAUDE.md` del repo a `~/.claude/CLAUDE.md`.
   - Copia recursivamente `agents`, `commands` y `my-mods` del repo a `~/.claude/` (solo los que existan).
   - Copia cada carpeta de `skills/` del repo a `~/.claude/skills/`.
3. **settings.json**:
   - Si `~/.claude/settings.json` existe, haz una copia en `~/.claude/settings.json.bak`.
   - Lee el `settings.json` local (si no existe, parte de `{}`) y el del repo. Parte de lo **local** y aplica lo del repo encima: para `enabledPlugins`, `extraKnownMarketplaces` y `pluginConfigs`, combina entrada por entrada (gana el repo); para cualquier otra clave, sustituye por el valor del repo. No toques claves que solo existan en local (por ejemplo `autoMode` o `permissions`).
   - Si existe `~/.claude/my-mods/.claude-plugin/marketplace.json`, registra el marketplace `my-mods` con la ruta absoluta de este equipo: `extraKnownMarketplaces["my-mods"] = {"source": {"source": "directory", "path": "<ruta absoluta de ~/.claude/my-mods>"}}` y `enabledPlugins["agent-status@my-mods"] = true`.
   - Escribe el resultado en `~/.claude/settings.json` (JSON con 2 espacios de indentación).
4. Reporta en 3–4 líneas qué se actualizó (o el error exacto) y recuerda reiniciar Claude Code o usar `/reload-plugins` para aplicar plugins nuevos.
