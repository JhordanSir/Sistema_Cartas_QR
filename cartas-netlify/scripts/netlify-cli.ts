// Runs netlify-cli with THIS folder as the project root.
//
// netlify-cli takes the outermost package.json as the project root, and here
// that is the Sistema_Cartas_QR monorepo: `netlify dev` would inject the
// monorepo's .env and look for functions there. Its `--cwd` flag fixes that,
// but only when the process starts from another directory, so this wrapper
// launches the CLI from the parent folder.
//
//   node scripts/netlify-cli.ts dev
//   node scripts/netlify-cli.ts deploy --prod
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const cliEntry = join(appRoot, 'node_modules', 'netlify-cli', 'bin', 'run.js');

const child = spawn(process.execPath, [cliEntry, ...process.argv.slice(2), '--cwd', appRoot], {
  cwd: dirname(appRoot),
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
