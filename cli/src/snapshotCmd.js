const fs = require('fs');
const path = require('path');
const { buildEnvironmentSnapshot, compareEnvironmentSnapshots } = require('./snapshot');

function snapshotCommand(args) {
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  agentdoctor snapshot create <output.json>');
    console.log('  agentdoctor snapshot compare <local.json> <ci.json>');
    process.exit(1);
  }

  const subCommand = args[0];

  if (subCommand === 'create') {
    if (args.length < 2) {
      console.error('Missing output file path');
      process.exit(1);
    }
    const outPath = path.resolve(process.cwd(), args[1]);
    const snapshot = buildEnvironmentSnapshot(process.cwd());
    fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    console.log(`Snapshot saved to ${outPath}`);
  } else if (subCommand === 'compare') {
    if (args.length < 3) {
      console.error('Usage: agentdoctor snapshot compare <local.json> <ci.json>');
      process.exit(1);
    }
    const localPath = path.resolve(process.cwd(), args[1]);
    const ciPath = path.resolve(process.cwd(), args[2]);

    if (!fs.existsSync(localPath)) {
      console.error(`Local snapshot not found: ${localPath}`);
      process.exit(1);
    }
    if (!fs.existsSync(ciPath)) {
      console.error(`CI snapshot not found: ${ciPath}`);
      process.exit(1);
    }

    const localSnap = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    const ciSnap = JSON.parse(fs.readFileSync(ciPath, 'utf-8'));

    const diffs = compareEnvironmentSnapshots(localSnap, ciSnap);

    if (diffs.length === 0) {
      console.log('Environments are identical.');
    } else {
      console.log('Environment differences found:');
      diffs.forEach(d => console.log(`- ${d}`));
    }
  } else {
    console.error(`Unknown snapshot command: ${subCommand}`);
    process.exit(1);
  }
}

module.exports = snapshotCommand;
