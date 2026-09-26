const path = require('path');

// 2. Ignore irrelevant files (configurable ignore rules)
const DEFAULT_IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 
  'coverage', 'cache', '.cache', 'tmp', 'temp', 'venv', 'env', '.env'
]);

const DEFAULT_IGNORED_EXTS = new Set([
  '.log', '.tmp', '.swp', '.swo', '.lock', '.class', '.pyc'
]);

function isIgnored(filepath) {
  if (!filepath) return true;
  const parts = filepath.split(/[\/\\]/);
  
  if (parts.some(part => DEFAULT_IGNORED_DIRS.has(part))) return true;
  
  const ext = path.extname(filepath).toLowerCase();
  
  // lock files unless specifically needed (package-lock.json is fine, but .lock extensions ignored)
  if (DEFAULT_IGNORED_EXTS.has(ext)) return true;
  
  // OS files
  if (path.basename(filepath) === '.DS_Store' || path.basename(filepath) === 'Thumbs.db') return true;

  return false;
}

// 3. Classify changed files
function classifyFile(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  const basename = path.basename(filepath).toLowerCase();
  
  if (['package.json', 'tsconfig.json', 'pyproject.toml', 'requirements.txt', '.gitignore', 'agentdoctor.json', 'webpack.config.js', 'vite.config.js'].includes(basename)) {
    return 'configuration';
  }
  
  if (basename.includes('test') || basename.includes('spec') || filepath.includes('__tests__')) {
    return 'test';
  }
  
  if (['.md', '.txt', 'license', 'readme'].includes(ext) || basename.includes('readme')) {
    return 'documentation';
  }
  
  if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.css', '.html'].includes(ext)) {
    return 'source';
  }
  
  if (['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].includes(basename)) {
    return 'dependency';
  }

  // generated files like coverage, dist are caught by ignore. If they slip through:
  if (filepath.includes('generated') || ext === '.min.js') {
    return 'generated';
  }

  return 'unknown';
}

// 6. Change significance
function determineSignificance(filepath, category) {
  const ext = path.extname(filepath).toLowerCase();
  const basename = path.basename(filepath).toLowerCase();

  if (category === 'generated') return 'IGNORE';
  
  if (ext === '.md' || basename === '.gitignore' || category === 'documentation') return 'LOCAL_ONLY';
  
  if (category === 'source' || category === 'configuration' || category === 'dependency') return 'ANALYZE';
  
  if (category === 'test') return 'ANALYZE';

  return 'LOCAL_ONLY';
}

module.exports = {
  isIgnored,
  classifyFile,
  determineSignificance
};
