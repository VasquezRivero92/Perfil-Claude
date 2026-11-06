# Perfil-Claude

Mi configuración personal de [Claude Code](https://claude.com/claude-code), versionada para llevarla de un equipo a otro.

## Qué contiene

| Ruta | Contenido |
|------|-----------|
| `CLAUDE.md` | Instrucciones globales para todos los proyectos |
| `settings.json` | Plugins activados, marketplaces, hooks y opciones (sin datos locales, ver abajo) |
| `skills/` | Skills personales (p. ej. `graphify`) |
| `my-mods/` | Marketplace local con mis mods (`agent-status`) |
| `hooks/auto-sync.js` | Hook que sube los cambios a este repo automáticamente |
| `plugins/profile-sync/` | Plugin con los comandos `/sync-push` y `/sync-pull` |
| `.claude-plugin/marketplace.json` | Declara este repo como marketplace de plugins |

## Instalación en un equipo nuevo

```
/plugin marketplace add VasquezRivero92/Perfil-Claude
/plugin install profile-sync@perfil-claude
```

Luego reinicia Claude Code (o usa `/reload-plugins`) y ejecuta:

```
/sync-pull
```

Esto clona el repo en `~/Perfil-Claude` y aplica la configuración sobre `~/.claude`. Antes de tocar `settings.json` guarda una copia en `settings.json.bak`.

## Comandos

- **`/sync-pull`**: trae la configuración del repo y la aplica en este equipo.
- **`/sync-push [mensaje]`**: sube la configuración local al repo.

## Subida automática (hook)

`hooks/auto-sync.js` está registrado como hook `PostToolUse` (`Write|Edit|NotebookEdit`). Cuando Claude modifica un hook, skill, agente, comando, mod, `CLAUDE.md` o `settings.json` dentro de `~/.claude`, sincroniza con este repo y hace `git push` en segundo plano. El resultado queda en `~/.claude/hooks/auto-sync.log`.

Limitaciones:

- Solo detecta ediciones hechas con las herramientas de Claude. Si cambias algo a mano o con Bash, usa `/sync-push`.
- Si el push falla (por ejemplo, por un conflicto), solo se ve en el log.

## Qué NO se sube

- `autoMode` de `settings.json` (datos de la organización).
- Marketplaces locales (`directory` o `file`) y los plugins que dependen de ellos: llevan rutas de un equipo concreto. `/sync-pull` registra `my-mods` de nuevo con la ruta del equipo destino.
- Credenciales (`.credentials.json`, `~/.claude.json`), historial, sesiones y `settings.local.json`.
- `skills/synced`, que gestiona la cuenta de claude.ai.
