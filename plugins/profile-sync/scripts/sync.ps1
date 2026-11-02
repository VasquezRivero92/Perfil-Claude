param(
    [Parameter(Mandatory = $true)][ValidateSet('push', 'pull')][string]$Action,
    [string]$Message = 'Sync configuracion de Claude Code'
)

# Sincroniza ~/.claude con el repo Perfil-Claude.
#   push: ~/.claude -> repo (settings sin datos locales) -> commit + push
#   pull: git pull -> repo -> ~/.claude (conservando lo local de este equipo)

$ErrorActionPreference = 'Stop'
$claude = Join-Path $HOME '.claude'
$repo = if ($env:PERFIL_CLAUDE_REPO) { $env:PERFIL_CLAUDE_REPO } else { Join-Path $HOME 'Perfil-Claude' }
$remote = 'https://github.com/VasquezRivero92/Perfil-Claude.git'
$utf8 = New-Object System.Text.UTF8Encoding $false

function Read-Json($path) {
    if (Test-Path $path) { return (Get-Content $path -Raw | ConvertFrom-Json) }
    return [pscustomobject]@{}
}
function Write-Json($obj, $path) {
    [IO.File]::WriteAllText($path, ($obj | ConvertTo-Json -Depth 20), $utf8)
}
function Set-Prop($obj, $name, $value) {
    $obj | Add-Member -NotePropertyName $name -NotePropertyValue $value -Force
}
function Git-Run {
    & git -C $repo @args
    if ($LASTEXITCODE -ne 0) { throw "git $($args -join ' ') fallo (codigo $LASTEXITCODE)" }
}
function Copy-Tree($src, $dst) {
    if (-not (Test-Path $src)) { return }
    New-Item -ItemType Directory -Force $dst | Out-Null
    Copy-Item -Path (Join-Path $src '*') -Destination $dst -Recurse -Force
}
# Carpetas/archivos que se sincronizan (skills/synced lo gestiona la cuenta de claude.ai)
function Sync-Content($from, $to) {
    foreach ($f in 'CLAUDE.md') {
        if (Test-Path (Join-Path $from $f)) { Copy-Item (Join-Path $from $f) (Join-Path $to $f) -Force }
    }
    foreach ($d in 'agents', 'commands', 'my-mods') {
        Copy-Tree (Join-Path $from $d) (Join-Path $to $d)
    }
    $skills = Join-Path $from 'skills'
    if (Test-Path $skills) {
        Get-ChildItem $skills -Directory | Where-Object { $_.Name -ne 'synced' } | ForEach-Object {
            Copy-Tree $_.FullName (Join-Path (Join-Path $to 'skills') $_.Name)
        }
    }
}
function Is-LocalMarketplace($mk) {
    return ($mk.source.source -in @('directory', 'file'))
}

if (-not (Test-Path (Join-Path $repo '.git'))) {
    Write-Host "Clonando $remote en $repo"
    & git clone $remote $repo
    if ($LASTEXITCODE -ne 0) { throw 'git clone fallo' }
}
New-Item -ItemType Directory -Force $claude | Out-Null

if ($Action -eq 'push') {
    # 1) contenido
    Sync-Content $claude $repo

    # 2) settings sin datos especificos de este equipo
    $s = Read-Json (Join-Path $claude 'settings.json')
    $s.PSObject.Properties.Remove('autoMode')
    $localNames = @()
    if ($s.extraKnownMarketplaces) {
        foreach ($p in @($s.extraKnownMarketplaces.PSObject.Properties)) {
            if (Is-LocalMarketplace $p.Value) {
                $localNames += $p.Name
                $s.extraKnownMarketplaces.PSObject.Properties.Remove($p.Name)
            }
        }
    }
    if ($s.enabledPlugins) {
        foreach ($p in @($s.enabledPlugins.PSObject.Properties)) {
            foreach ($n in $localNames) {
                if ($p.Name.EndsWith("@$n")) { $s.enabledPlugins.PSObject.Properties.Remove($p.Name) }
            }
        }
    }
    Write-Json $s (Join-Path $repo 'settings.json')

    # 3) commit + push
    Git-Run add -A
    $changes = & git -C $repo status --porcelain
    if (-not $changes) { Write-Host 'Sin cambios que subir.'; exit 0 }
    Git-Run commit -q -m $Message
    Git-Run push
    Write-Host 'Push completado.'
}
else {
    Git-Run pull --ff-only
    $localSettingsPath = Join-Path $claude 'settings.json'
    if (Test-Path $localSettingsPath) { Copy-Item $localSettingsPath "$localSettingsPath.bak" -Force }

    Sync-Content $repo $claude

    # settings: parte de lo local y aplica lo remoto encima (se conserva autoMode, permisos, etc.)
    $l = Read-Json $localSettingsPath
    $r = Read-Json (Join-Path $repo 'settings.json')
    foreach ($p in $r.PSObject.Properties) {
        if ($p.Name -in @('enabledPlugins', 'extraKnownMarketplaces', 'pluginConfigs') -and $l.PSObject.Properties[$p.Name]) {
            foreach ($q in $p.Value.PSObject.Properties) { Set-Prop $l.($p.Name) $q.Name $q.Value }
        }
        else {
            Set-Prop $l $p.Name $p.Value
        }
    }
    # registrar my-mods con la ruta de ESTE equipo
    $myMods = Join-Path $claude 'my-mods'
    if (Test-Path (Join-Path $myMods '.claude-plugin\marketplace.json')) {
        if (-not $l.extraKnownMarketplaces) { Set-Prop $l 'extraKnownMarketplaces' ([pscustomobject]@{}) }
        if (-not $l.enabledPlugins) { Set-Prop $l 'enabledPlugins' ([pscustomobject]@{}) }
        Set-Prop $l.extraKnownMarketplaces 'my-mods' ([pscustomobject]@{ source = [pscustomobject]@{ source = 'directory'; path = $myMods } })
        Set-Prop $l.enabledPlugins 'agent-status@my-mods' $true
    }
    Write-Json $l $localSettingsPath
    Write-Host 'Pull completado. Reinicia Claude Code (o usa /reload-plugins) para aplicar plugins nuevos.'
}
