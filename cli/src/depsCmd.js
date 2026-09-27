const fs = require('fs');
const path = require('path');
const { DependencyManager, compareDependencies } = require('./dependencies');

function depsCommand(args) {
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  agentdoctor deps snapshot');
    console.log('  agentdoctor deps compare <commit1> <commit2>');
    process.exit(1);
  }

  const subCommand = args[0];
  const manager = new DependencyManager(process.cwd());

  if (subCommand === 'snapshot') {
    const snap = manager.recordSnapshot();
    console.log(`Dependency snapshot recorded for commit ${snap.commitSha}`);
  } else if (subCommand === 'compare') {
    if (args.length < 3) {
      console.error('Usage: agentdoctor deps compare <commit1> <commit2>');
      process.exit(1);
    }
    const c1 = args[1];
    const c2 = args[2];

    const snap1 = manager.history.find(h => h.commitSha.startsWith(c1));
    const snap2 = manager.history.find(h => h.commitSha.startsWith(c2));

    if (!snap1) { console.error(`Snapshot not found for commit ${c1}`); process.exit(1); }
    if (!snap2) { console.error(`Snapshot not found for commit ${c2}`); process.exit(1); }

    const changes = compareDependencies(snap1, snap2);
    
    if (changes.length === 0) {
      console.log('No dependency changes detected.');
    } else {
      console.log('Dependency changes:');
      changes.forEach(c => {
        if (c.type === 'LOCKFILE_CHANGED') console.log('- Lockfile hash changed');
        else if (c.type === 'PACKAGE_MANAGER_MISMATCH') console.log(`- Package manager changed from ${c.previous} to ${c.current}`);
        else if (c.type === 'ADDED') console.log(`- Added [${c.source}] ${c.name}@${c.current}`);
        else if (c.type === 'REMOVED') console.log(`- Removed [${c.source}] ${c.name}@${c.previous}`);
        else if (c.type === 'VERSION_CHANGED') console.log(`- Version changed [${c.source}] ${c.name}: ${c.previous} -> ${c.current}`);
      });
    }
  } else {
    console.error(`Unknown deps command: ${subCommand}`);
    process.exit(1);
  }
}

module.exports = depsCommand;
