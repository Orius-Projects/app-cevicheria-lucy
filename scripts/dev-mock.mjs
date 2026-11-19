/* global process, console, setTimeout */
/**
 * Levanta API (con MongoDB embebido + seed) y cliente Vite en un solo comando.
 *
 *   npm run dev:mock
 *
 * API:    http://localhost:3000
 * Cliente: http://localhost:5173
 *
 * No requiere MongoDB instalado. Los datos viven en `server/.mongo-dev-data`
 * y se siembran solos si la base está vacía.
 */
import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';

const children = [];
let shuttingDown = false;

function shutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  setTimeout(() => process.exit(exitCode), 300);
}

function run(name, args, extraEnv = {}) {
  const child = spawn(npm, args, {
    stdio: 'inherit',
    shell: isWindows,
    env: { ...process.env, ...extraEnv }
  });

  child.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`\n[dev:mock] ${name} terminó (código ${code ?? 0}). Cerrando el resto...`);
      shutdown(code ?? 0);
    }
  });

  child.on('error', (error) => {
    console.error(`[dev:mock] No se pudo iniciar ${name}: ${error.message}`);
    shutdown(1);
  });

  children.push(child);
  return child;
}

console.log('');
console.log('  Cevichería Lucy — modo demo (MongoDB en memoria)');
console.log('  API:     http://localhost:3000');
console.log('  Cliente: http://localhost:5173');
console.log('');
console.log('  Usuarios: encargado1/encargado123 · mozo1/mozo123 · mozo2/mozo223 · cocinero1/cocina123');
console.log('  Ctrl+C para detener ambos procesos.');
console.log('');

run('API', ['run', 'dev:mock', '-w', 'server']);
run('Cliente', ['run', 'dev', '-w', 'client']);

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
