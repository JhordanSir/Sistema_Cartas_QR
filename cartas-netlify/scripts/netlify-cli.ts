// Runs netlify-cli with THIS folder as the project root.
//
// netlify-cli takes the outermost package.json as the project root, and here
// that is the Sistema_Cartas_QR monorepo: `netlify dev` would inject the
// monorepo's .env and look for functions there. Its `--cwd` flag fixes that,
// but only when the process starts from another directory.
//
// The CLI runs inside this same process (no child): stopping this script stops
// the CLI too, so `netlify dev` never outlives whoever started it.
//
//   node scripts/netlify-cli.ts dev
//   node scripts/netlify-cli.ts deploy --prod
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const cliEntry = join(appRoot, 'node_modules', 'netlify-cli', 'bin', 'run.js');

process.chdir(dirname(appRoot));
// Mutated in place: the CLI reads the very same array through `import { argv } from 'process'`.
process.argv.splice(1, Infinity, cliEntry, ...process.argv.slice(2), '--cwd', appRoot);
await import(pathToFileURL(cliEntry).href);
