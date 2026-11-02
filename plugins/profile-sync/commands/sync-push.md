---
description: Sube tu configuración local de Claude Code al repo Perfil-Claude
allowed-tools: Bash(powershell:*)
---

Ejecuta exactamente este comando y reporta el resultado (qué se subió o si hubo error):

```
powershell -NoProfile -ExecutionPolicy Bypass -File "${CLAUDE_PLUGIN_ROOT}/scripts/sync.ps1" -Action push -Message "$ARGUMENTS"
```

Si `$ARGUMENTS` está vacío, omite el parámetro `-Message`. No hagas nada más.
