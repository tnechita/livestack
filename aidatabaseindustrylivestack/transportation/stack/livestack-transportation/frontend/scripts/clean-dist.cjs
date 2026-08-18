const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const exts = new Set(['.html', '.js', '.css']);

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (entry.name.endsWith('.map') || entry.name === '.DS_Store') {
      fs.rmSync(full, { force: true });
      continue;
    }
    if (!exts.has(path.extname(entry.name))) continue;
    const current = fs.readFileSync(full, 'utf8');
    const next = current.replace(/—/g, '-').replace(/&mdash;/g, '-');
    if (next !== current) fs.writeFileSync(full, next);
  }
}

walk(distDir);
