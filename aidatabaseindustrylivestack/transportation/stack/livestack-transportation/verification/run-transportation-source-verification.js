#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const failures = [];

function run(label, command, args) {
  process.stdout.write(`\n== ${label} ==\n`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: {
      ...process.env,
      ASKDATA_LIVE_BASE_URL: '',
      ASKDATA_PIPELINE_BASE_URL: '',
      ASKDATA_PROMPT_BASE_URL: '',
    },
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    failures.push({
      label,
      detail: result.error?.message || `exit ${result.status ?? 'unknown'}`,
    });
  }
}

function javascriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.js') ? [absolute] : [];
  });
}

run('Frontend production build', npm, ['run', 'build']);
for (const file of javascriptFiles(path.join(root, 'backend'))) {
  run(`Syntax ${path.relative(root, file)}`, process.execPath, ['--check', file]);
}

const contracts = [
  'check-import-contract.js',
  'check-transportation-askdata-contract.js',
  'check-brand-colors.js',
  'check-demo-date-reanchor.js',
  'check-transportation-demo-session-contract.js',
  'check-transportation-admin-package-contract.js',
  'check-transportation-demo-route-contract.js',
  'check-transportation-credential-surface-contract.js',
  'check-transportation-durable-restore-recovery-contract.js',
  'check-transportation-atomic-generation-lifecycle-contract.js',
  'check-transportation-vpd-feature-lifecycle-ut4-contract.js',
  'check-transportation-dataset-serving-fence-unit.js',
  'check-transportation-oml-lifecycle-contract.js',
  'check-transportation-feature-parity-contract.js',
  'check-transportation-ui-integration-contract.js',
];

for (const contract of contracts) {
  run(contract, process.execPath, [path.join(root, 'verification', contract)]);
}

if (failures.length) {
  process.stderr.write('\nTransportation source verification failed:\n');
  for (const failure of failures) process.stderr.write(`- ${failure.label}: ${failure.detail}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nTransportation source verification passed.\n');
}
