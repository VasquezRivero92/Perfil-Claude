#!/usr/bin/env node
// Hook PostToolUse (Write|Edit): si se modifica un hook, skill, agente, comando,
// mod, CLAUDE.md o settings.json dentro de ~/.claude, sincroniza con el repo
// Perfil-Claude (misma lógica que /sync-push) y hace push.
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

const norm = (p) => path.resolve(p).replace(/\\/g, '/').toLowerCase();
const log = (m) => fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${m}\n`);

function isRelevant(file) {
  const f = norm(file);
  const base = norm(CLAUDE) + '/';
  if (!f.startsWith(base)) return false;
  const rel = f.slice(base.length);
  if (rel === 'claude.md' || rel === 'settings.json') return true;
  if (rel.startsWith('skills/')) return !rel.startsWith('skills/synced/');
  if (/\.(log|lock)$/.test(rel)) return false;
  return DIRS.some((d) => rel.startsWith(d + '/'));
}

function git(...args) {
  return execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8' });
}

function copyDir(src, dst, skip = []) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dst, {
    recursive: true,
    force: true,
    filter: (s) => !skip.includes(path.basename(s)) && !/\.(log|lock)$/.test(s),
  });
}

function sync() {
  if (!fs.existsSync(path.join(REPO, '.git'))) {
    execFileSync('git', ['clone', REPO_URL, REPO], { encoding: 'utf8' });
  } else {
    git('pull', '--ff-only');
  }

  if (fs.existsSync(path.join(CLAUDE, 'CLAUDE.md'))) {
    fs.copyFileSync(path.join(CLAUDE, 'CLAUDE.md'), path.join(REPO, 'CLAUDE.md'));
  }
  for (const d of DIRS) copyDir(path.join(CLAUDE, d), path.join(REPO, d));
  const skills = path.join(CLAUDE, 'skills');
  if (fs.existsSync(skills)) {
    for (const e of fs.readdirSync(skills, { withFileTypes: true })) {
      if (e.isDirectory() && e.name !== 'synced') {
        copyDir(path.join(skills, e.name), path.join(REPO, 'skills', e.name));
      }
    }
  }

  // settings.json sin rutas locales ni autoMode
  const sp = path.join(CLAUDE, 'settings.json');
  if (fs.existsSync(sp)) {
    const s = JSON.parse(fs.readFileSync(sp, 'utf8'));
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
    fs.writeFileSync(path.join(REPO, 'settings.json'), JSON.stringify(s, null, 2) + '\n');
  }

  git('add', '-A');
  if (!git('status', '--porcelain').trim()) return log('Sin cambios que subir');
  git('commit', '-m', 'Auto-sync: cambios en configuración de Claude Code');
  git('push');
  log('Push OK');
}

if (process.argv[2] === '--run') {
  try {
    sync();
  } catch (e) {
    log('ERROR: ' + (e.stderr || e.message));
  }
} else {
  // Modo hook: leer stdin, decidir y lanzar la sincronización en segundo plano.
  let raw = '';
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(raw);
      const file = input.tool_input && (input.tool_input.file_path || input.tool_input.notebook_path);
      if (!file || !isRelevant(file)) return;
      spawn(process.execPath, [__filename, '--run'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      }).unref();
    } catch (_) {}
  });
}
