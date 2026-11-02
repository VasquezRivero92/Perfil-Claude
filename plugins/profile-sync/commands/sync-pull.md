---
description: Trae la configuración de Perfil-Claude y la aplica en este equipo
allowed-tools: Bash(powershell:*)
---

Ejecuta exactamente este comando y reporta el resultado (qué se actualizó o si hubo error):

```
powershell -NoProfile -ExecutionPolicy Bypass -File "${CLAUDE_PLUGIN_ROOT}/scripts/sync.ps1" -Action pull
```

Al terminar, recuerda al usuario que debe reiniciar Claude Code (o usar `/reload-plugins`) para que se apliquen plugins nuevos. No hagas nada más.
