#!/usr/bin/env node
// Sincronización de ~/.claude <-> repo Perfil-Claude.
//   (sin args)  Hook PostToolUse (Write|Edit): si el archivo editado es relevante,
//               lanza `--push` en segundo plano.
//   --push      local -> repo, commit y push.
//   --pull      Hook SessionStart: repo -> local (y sube lo local pendiente).
// Regla entre equipos: por archivo gana el más reciente (mtime); nunca se borra nada.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const HOME = os.homedir();
const CLAUDE = path.join(HOME, '.claude');
const REPO = path.join(HOME, 'Perfil-Claude');
const REPO_URL = 'https://github.com/VasquezRivero92/Perfil-Claude.git';
const LOG = path.join(CLAUDE, 'hooks', 'auto-sync.log');
const DIRS = ['agents', 'commands', 'my-mods', 'hooks'];
const MERGE_KEYS = ['enabledPlugins', 'extraKnownMarketplaces', 'pluginConfigs'];

const norm = (p) => path.resolve(p).replace(/\\/g, '/').toLowerCase();
const log = (m) => fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${m}\n`);
const skipName = (s) => /\.(log|lock)$/.test(s);

function isRelevant(file) {
  const f = norm(file);
  const base = norm(CLAUDE) + '/';
  if (!f.startsWith(base)) return false;
  const rel = f.slice(base.length);
  if (rel === 'claude.md' || rel === 'settings.json') return true;
  if (rel.startsWith('skills/')) return !rel.startsWith('skills/synced/');
  if (skipName(rel)) return false;
  return DIRS.some((d) => rel.startsWith(d + '/'));
}

function git(...args) {
  return execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8', timeout: 60000 });
}

function ensureRepo() {
  if (!fs.existsSync(path.join(REPO, '.git'))) {
    execFileSync('git', ['clone', REPO_URL, REPO], { encoding: 'utf8', timeout: 120000 });
  }
}

// Copia src -> dst solo si el contenido difiere y src es más reciente. Conserva mtime.
function copyNewest(src, dst, changed) {
  const s = fs.statSync(src);
  if (fs.existsSync(dst)) {
    const d = fs.statSync(dst);
    if (d.mtimeMs >= s.mtimeMs) return;
    if (fs.readFileSync(src).equals(fs.readFileSync(dst))) return;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  fs.utimesSync(dst, s.atime, s.mtime);
  changed.push(dst);
}

function walk(src, dst, changed, skipTop = []) {
  if (!fs.existsSync(src)) return;
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (skipTop.includes(e.name) || skipName(e.name) || e.name === '.git') continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) walk(s, d, changed);
    else if (e.isFile()) copyNewest(s, d, changed);
  }
}

// Copia el contenido compartido entre dos raíces (from -> to).
function transfer(from, to, changed) {
  copyNewest(path.join(from, 'CLAUDE.md'), path.join(to, 'CLAUDE.md'), changed);
  for (const d of DIRS) walk(path.join(from, d), path.join(to, d), changed);
  walk(path.join(from, 'skills'), path.join(to, 'skills'), changed, ['synced']);
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function filteredSettings(s) {
  s = JSON.parse(JSON.stringify(s));
  delete s.autoMode;
  const local = new Set();
  for (const [name, m] of Object.entries(s.extraKnownMarketplaces || {})) {
    const t = m && m.source && m.source.source;
    if (t === 'directory' || t === 'file') {
      local.add(name);
      delete s.extraKnownMarketplaces[name];
    }
  }
  for (const k of Object.keys(s.enabledPlugins || {})) {
    if (local.has(k.split('@').pop())) delete s.enabledPlugins[k];
  }
  return s;
}

function pushSettings(changed) {
  const lp = path.join(CLAUDE, 'settings.json');
  const rp = path.join(REPO, 'settings.json');
  if (!fs.existsSync(lp)) return;
  const filtered = filteredSettings(readJson(lp));
  if (fs.existsSync(rp)) {
    if (fs.statSync(rp).mtimeMs >= fs.statSync(lp).mtimeMs) return;
    if (sameJson(readJson(rp), filtered)) return;
  }
  writeJson(rp, filtered);
  changed.push(rp);
}

function pullSettings(changed) {
  const lp = path.join(CLAUDE, 'settings.json');
  const rp = path.join(REPO, 'settings.json');
  if (!fs.existsSync(rp)) return;
  const remote = readJson(rp);
  const local = fs.existsSync(lp) ? readJson(lp) : {};
  if (fs.existsSync(lp) && fs.statSync(lp).mtimeMs > fs.statSync(rp).mtimeMs) return;
  if (sameJson(filteredSettings(local), remote)) return;
  const merged = { ...local };
  for (const [k, v] of Object.entries(remote)) {
    merged[k] = MERGE_KEYS.includes(k) ? { ...(local[k] || {}), ...v } : v;
  }
  if (sameJson(merged, local)) return;
  if (fs.existsSync(lp)) fs.copyFileSync(lp, lp + '.bak');
  writeJson(lp, merged);
  changed.push(lp);
}

function commitAndPush() {
  git('add', '-A');
  if (git('status', '--porcelain').trim()) {
    git('commit', '-m', 'Auto-sync: cambios en configuración de Claude Code');
  }
  if (git('rev-list', '--count', '@{u}..HEAD').trim() !== '0') git('push');
}

function push() {
  ensureRepo();
  git('pull', '--ff-only');
  const changed = [];
  transfer(CLAUDE, REPO, changed);
  pushSettings(changed);
  commitAndPush();
  log(changed.length ? `Push OK (${changed.length} archivos)` : 'Sin cambios que subir');
}

function pull() {
  ensureRepo();
  try {
    git('pull', '--rebase');
  } catch (e) {
    try { git('rebase', '--abort'); } catch (_) {}
    throw e;
  }
  const changed = [];
  transfer(REPO, CLAUDE, changed);
  pullSettings(changed);
  // Sube lo que haya pendiente localmente (ediciones hechas fuera de Claude).
  const up = [];
  transfer(CLAUDE, REPO, up);
  pushSettings(up);
  commitAndPush();
  log(`Pull OK (${changed.length} aplicados, ${up.length} subidos)`);
  return changed;
}

const mode = process.argv[2];
if (mode === '--push') {
  try { push(); } catch (e) { log('ERROR push: ' + (e.stderr || e.message)); }
} else if (mode === '--pull') {
  try {
    const changed = pull();
    if (changed.length) {
      const names = changed.map((f) => path.relative(HOME, f).replace(/\\/g, '/')).slice(0, 8).join(', ');
      console.log(`[Perfil-Claude] Se aplicaron ${changed.length} cambios desde el repo: ${names}. Si cambiaron plugins o hooks, reinicia Claude Code o usa /reload-plugins.`);
    }
  } catch (e) {
    log('ERROR pull: ' + (e.stderr || e.message));
    console.log('[Perfil-Claude] No se pudo sincronizar al iniciar (ver ~/.claude/hooks/auto-sync.log).');
  }
} else {
  let raw = '';
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(raw);
      const file = input.tool_input && (input.tool_input.file_path || input.tool_input.notebook_path);
      if (!file || !isRelevant(file)) return;
      spawn(process.execPath, [__filename, '--push'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      }).unref();
    } catch (_) {}
  });
}
