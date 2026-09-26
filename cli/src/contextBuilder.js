const fs = require('fs');
const path = require('path');

const BUDGET = {
  maxFiles: 12,
  maxFileCharacters: 12000,
  maxTotalCharacters: 60000,
  maxTokens: 12000 // roughly maxTotalCharacters / 4
};

const DANGEROUS_EXTENSIONS = new Set([
  '.pem', '.key', '.p12', '.pfx', '.exe', '.dll', '.so', '.dylib', '.bin', '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.zip', '.tar', '.gz', '.min.js', '.min.css'
]);

// Simple in-memory cache
const fileCache = new Map();

function isSafeToRead(filepath) {
  const basename = path.basename(filepath).toLowerCase();
  const ext = path.extname(filepath).toLowerCase();
  
  if (basename.startsWith('.env') || basename === 'credentials' || DANGEROUS_EXTENSIONS.has(ext)) {
    return false;
  }
  
  return true;
}

function truncateContent(content, maxChars) {
  if (content.length <= maxChars) return content;
  
  const half = Math.floor(maxChars / 2);
  const head = content.slice(0, half - 50);
  const tail = content.slice(content.length - (half - 50));
  
  return `${head}\n\n[...content truncated...]\n\n${tail}`;
}

function getFileContent(cwd, relativePath, maxChars) {
  const absolutePath = path.resolve(cwd, relativePath);
  
  if (!fs.existsSync(absolutePath)) return null;
  if (!isSafeToRead(relativePath)) return '[binary/secret file omitted]';

  const stat = fs.statSync(absolutePath);
  if (stat.size > 1024 * 1024) return '[file too large to read]'; // > 1MB

  // Cache hit check
  const lastModified = stat.mtimeMs;
  const cached = fileCache.get(absolutePath);
  if (cached && cached.mtime === lastModified) {
    return cached.content; // It's truncated content
  }

  try {
    const content = fs.readFileSync(absolutePath, 'utf8');
    const truncated = truncateContent(content, maxChars);
    
    fileCache.set(absolutePath, { mtime: lastModified, content: truncated });
    return truncated;
  } catch (err) {
    return '[read error]';
  }
}

function findRelatedFiles(cwd, changedFile) {
  const ext = path.extname(changedFile);
  const basename = path.basename(changedFile, ext);
  const dir = path.dirname(changedFile);
  
  const related = [];
  const candidates = [];
  
  if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
    candidates.push(
      path.join(dir, `${basename}.test${ext}`),
      path.join(dir, `${basename}.spec${ext}`),
      path.join(dir, `types${ext}`),
      path.join(dir, `index${ext}`)
    );
  }

  for (const candidate of candidates) {
    if (candidate !== changedFile && fs.existsSync(path.resolve(cwd, candidate))) {
      related.push(candidate);
    }
  }
  
  return related;
}

function buildContext(changeBatch, cwd, envSnapshot) {
  const selectedFiles = [];
  let totalCharacters = 0;

  // 1. Separate relevant files
  const highRelevance = [];
  const mediumRelevance = [];
  
  for (const file of changeBatch.changedFiles) {
    if (file.significance === 'ANALYZE' && file.eventType !== 'unlink') {
      highRelevance.push(file);
    }
  }

  // 2. Discover related files for high relevance source files
  const discoveredSet = new Set();
  for (const file of highRelevance) {
    if (file.category === 'source') {
      const related = findRelatedFiles(cwd, file.path);
      for (const rel of related) {
        if (!discoveredSet.has(rel) && !highRelevance.some(f => f.path === rel)) {
          discoveredSet.add(rel);
          mediumRelevance.push({
            path: rel,
            eventType: 'none',
            category: 'related',
            significance: 'ANALYZE'
          });
        }
      }
    }
  }

  // 3. Select files within budget
  const allCandidates = [...highRelevance, ...mediumRelevance];
  const finalFiles = [];

  for (const file of allCandidates) {
    if (finalFiles.length >= BUDGET.maxFiles) break;
    
    const content = getFileContent(cwd, file.path, BUDGET.maxFileCharacters);
    if (!content) continue;

    const charCount = content.length;
    
    if (totalCharacters + charCount > BUDGET.maxTotalCharacters) {
      if (file.category === 'related') continue; // Drop medium relevance if we run out of room
      
      // If high relevance, we include it but it means we might exceed budget slightly, or we can just drop it.
      // Let's drop it if it's too big and we are really over.
      if (totalCharacters >= BUDGET.maxTotalCharacters) break;
    }

    totalCharacters += charCount;
    finalFiles.push({
      path: file.path,
      relevance: file.category === 'related' ? 'medium' : 'high',
      content: content
    });
  }

  const estimatedTokens = Math.ceil(totalCharacters / 4);

  // Logging
  const timeString = new Date().toTimeString().split(' ')[0];
  console.log(`[context] ${timeString} | ${finalFiles.length} files selected`);
  console.log(`[context] ${timeString} | ~${estimatedTokens.toLocaleString()} tokens`);
  console.log(`[context] ${timeString} | budget: ${BUDGET.maxTokens.toLocaleString()}`);

  return {
    environment: envSnapshot || {},
    changeSummary: {
      filesChanged: changeBatch.changedFiles.map(f => f.path),
      categories: changeBatch.categories
    },
    files: finalFiles,
    constraints: {
      maxTokens: BUDGET.maxTokens
    }
  };
}

module.exports = {
  buildContext,
  BUDGET,
  isSafeToRead
};
