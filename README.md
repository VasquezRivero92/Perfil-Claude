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

## Sincronización automática (hooks)

`hooks/auto-sync.js` está registrado en dos hooks:

- **`SessionStart`** (`startup|resume`): al abrir Claude Code trae los cambios del repo (`git pull --rebase`), los aplica en `~/.claude` y sube lo que haya pendiente en local. Si aplica algo, avisa en la sesión; si cambiaron plugins o hooks, reinicia o usa `/reload-plugins`.
- **`PostToolUse`** (`Write|Edit|NotebookEdit`): cuando Claude modifica un hook, skill, agente, comando, mod, `CLAUDE.md` o `settings.json` dentro de `~/.claude`, lo sube al repo en segundo plano.

Entre equipos, por archivo **gana el más reciente** (fecha de modificación) y nunca se borra nada. El resultado queda en `~/.claude/hooks/auto-sync.log`.

Limitaciones:

- La subida solo se dispara con ediciones hechas por las herramientas de Claude. Si cambias algo a mano o con Bash, se sube en el siguiente inicio de sesión o con `/sync-push`.
- Los borrados no se propagan entre equipos.
- Si hay un conflicto o falla la red, solo se ve en el log (y un aviso al iniciar).

## Qué NO se sube

- `autoMode` de `settings.json` (datos de la organización).
- Marketplaces locales (`directory` o `file`) y los plugins que dependen de ellos: llevan rutas de un equipo concreto. `/sync-pull` registra `my-mods` de nuevo con la ruta del equipo destino.
- Credenciales (`.credentials.json`, `~/.claude.json`), historial, sesiones y `settings.local.json`.
- `skills/synced`, que gestiona la cuenta de claude.ai.
