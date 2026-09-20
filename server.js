import fs from 'node:fs';
import path from 'node:path';

if (fs.existsSync(path.resolve('./dist/server.cjs'))) {
  await import('./dist/server.cjs');
} else if (fs.existsSync(path.resolve('./build/server.cjs'))) {
  await import('./build/server.cjs');
} else {
  console.error('Neither ./dist/server.cjs nor ./build/server.cjs found!');
  process.exit(1);
}
