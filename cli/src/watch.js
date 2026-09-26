const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { isIgnored, classifyFile, determineSignificance } = require('./classifier');

function runGitCommand(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim();
  } catch (error) {
    return null;
  }
}

function getGitContext(cwd) {
  const isGit = fs.existsSync(path.join(cwd, '.git'));
  if (!isGit) return null;

  try {
    const branch = runGitCommand('git rev-parse --abbrev-ref HEAD') || 'unknown';
    const root = runGitCommand('git rev-parse --show-toplevel') || cwd;
    const hasUncommittedChanges = runGitCommand('git status --porcelain').length > 0;
    return { branch, root, hasUncommittedChanges };
  } catch (e) {
    return null;
  }
}

function getFileGitMetadata(filepath) {
  try {
    const statusOut = runGitCommand(`git status -s -- "${filepath}"`);
    let status = 'unmodified';
    
    if (statusOut) {
      const code = statusOut.substring(0, 2);
      if (code === '??') status = 'untracked';
      else if (code.includes('A')) status = 'added';
      else if (code.includes('D')) status = 'deleted';
      else if (code.includes('R')) status = 'renamed';
      else if (code.includes('M')) status = 'modified';
      else status = 'modified';
    }

    let added = 0;
    let removed = 0;
    if (status === 'modified' || status === 'added') {
      const diffOut = runGitCommand(`git diff --numstat -- "${filepath}"`) || runGitCommand(`git diff --cached --numstat -- "${filepath}"`);
      if (diffOut) {
        const parts = diffOut.split(/\s+/);
        added = parseInt(parts[0], 10) || 0;
        removed = parseInt(parts[1], 10) || 0;
      }
    }

    return { status, added, removed };
  } catch (e) {
    return { status: 'unknown', added: 0, removed: 0 };
  }
}

const { buildContext } = require('./contextBuilder');
const { MockAIProvider } = require('./ai/provider');
const { AIAnalysisEngine } = require('./ai/engine');
const { FindingEngine } = require('./ai/findingEngine');

const aiProvider = new MockAIProvider();
const aiEngine = new AIAnalysisEngine(aiProvider);

function watchCommand() {
  const cwd = process.cwd();
  const configDir = path.join(cwd, '.agentdoctor');
  const configFile = path.join(configDir, 'config.json');

  if (!fs.existsSync(configFile)) {
    console.error('Error: AgentDoctor is not initialized in this directory.');
    process.exit(1);
  }

  const gitCtx = getGitContext(cwd);
  if (!gitCtx) {
    console.log('Git context unavailable. Running in file-only mode.\n');
  }

  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  } catch (err) {
    console.error('Error reading config file.');
    process.exit(1);
  }

  if (!config.sessionId) {
    config.sessionId = crypto.randomUUID();
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  }

  const findingEngine = new FindingEngine(cwd);

  const API_URL = process.env.AGENTDOCTOR_API_URL || 'http://localhost:8000';

  console.log('AgentDoctor watching...\n');
  process.on('SIGINT', () => {
    console.log('\nAgentDoctor stopped.');
    process.exit(0);
  });

  // State
  let pendingEvents = new Map(); // filepath -> eventType (add/change/unlink)
  let debounceTimer = null;
  const DEBOUNCE_MS = parseInt(process.env.AGENTDOCTOR_DEBOUNCE_MS) || 500;
  
  const MAX_EVENTS_PER_BATCH = parseInt(process.env.AGENTDOCTOR_MAX_EVENTS) || 50;
  
  // Rate limiting & Queue
  const eventQueue = [];
  let isSending = false;
  let lastRequestTime = 0;
  const MIN_REQUEST_INTERVAL = 200; // max 5 requests/sec

  async function processQueue() {
    if (isSending || eventQueue.length === 0) return;
    
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    
    if (timeSinceLast < MIN_REQUEST_INTERVAL) {
      setTimeout(processQueue, MIN_REQUEST_INTERVAL - timeSinceLast);
      return;
    }

    isSending = true;
    lastRequestTime = Date.now();

    const batch = eventQueue.splice(0, 100);
    const requestBody = { events: batch };

    let retries = 3;
    let delay = 2000;
    
    while (retries > 0) {
      try {
        const res = await fetch(`${API_URL}/api/v1/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(5000)
        });

        if (res.ok) {
          // Success silently handled here, actual logging is done in flushPendingEvents
          break;
        } else if (res.status === 429) {
          const retryAfter = res.headers.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
          console.log(`Backend rate limited (429). Waiting ${waitTime/1000}s before retry...`);
          await new Promise(r => setTimeout(r, waitTime));
          retries--;
          delay *= 2;
        } else {
          console.log(`\u2192 Backend returned ${res.status}`);
          break; 
        }
      } catch (err) {
        console.log(`\u2192 Backend unavailable. Events will not be sent until the connection is restored.`);
        eventQueue.unshift(...batch);
        await new Promise(r => setTimeout(r, 5000));
        break; 
      }
    }
    
    isSending = false;
    if (eventQueue.length > 0) {
      setTimeout(processQueue, MIN_REQUEST_INTERVAL);
    }
  }

  function flushPendingEvents() {
    if (pendingEvents.size === 0) return;
    
    // 5. Deduplicate is implicitly handled by the Map (latest event overwrites)
    const files = Array.from(pendingEvents.entries()); // [filepath, eventType]
    pendingEvents.clear();
    
    const now = new Date();
    const uncommitted = gitCtx ? (runGitCommand('git status --porcelain').length > 0) : false;

    let relevantFileCount = 0;
    const changedFiles = [];
    const categories = {};

    for (const [filepath, eventType] of files) {
      let relativePath = filepath;
      if (gitCtx && gitCtx.root) {
        relativePath = path.relative(gitCtx.root, path.resolve(cwd, filepath)).replace(/\\/g, '/');
      }

      // 3. Classify
      const category = classifyFile(relativePath);
      categories[category] = (categories[category] || 0) + 1;

      // 6. Change significance
      const significance = determineSignificance(relativePath, category);

      if (significance === 'IGNORE') continue;

      if (significance === 'ANALYZE') {
        relevantFileCount++;
      }

      // Only push up to MAX_EVENTS_PER_BATCH full file details if we have too many
      // Otherwise we just send summarized metadata
      if (changedFiles.length < MAX_EVENTS_PER_BATCH) {
        const gitMeta = gitCtx ? getFileGitMetadata(filepath) : null;
        const fileObj = {
          path: relativePath,
          eventType,
          timestamp: now.getTime(),
          extension: path.extname(relativePath),
          category,
          significance
        };

        if (gitCtx && gitMeta) {
          fileObj.git_status = gitMeta.status;
          fileObj.lines_added = gitMeta.added;
          fileObj.lines_removed = gitMeta.removed;
        }
        
        changedFiles.push(fileObj);
      }
    }

    // 7. Batch limits: if we exceeded MAX_EVENTS_PER_BATCH, changedFiles will be truncated
    // but eventCount and categories reflect the total

    // 9. Token protection - construct ChangeBatch
    const changeBatch = {
      changedFiles,
      categories,
      eventCount: files.length,
      relevantFileCount
    };

    if (gitCtx) {
      changeBatch.branch = gitCtx.branch;
      changeBatch.repo_root = gitCtx.root;
      changeBatch.has_uncommitted_changes = uncommitted;
    }

    const { buildContext } = require('./contextBuilder');
    let envSnapshot = config.environment || {};
    
    // Build context
    const aiContext = buildContext(changeBatch, cwd, envSnapshot);

    // Send single AI Context event
    const eventPayload = {
      session_id: config.sessionId,
      event_type: 'custom',
      occurred_at: now.toISOString(),
      source: 'cli_watch_batch',
      summary: `AI Context: ${aiContext.files.length} files, max ${aiContext.constraints.maxTokens} tokens`,
      payload: aiContext
    };

    eventQueue.push(eventPayload);
    
    // 10. Logging
    const timeString = new Date().toTimeString().split(' ')[0];
    const batches = relevantFileCount > 0 ? 1 : 0;
    console.log(`[watch] ${timeString} | ${files.length} events \u2192 ${relevantFileCount} relevant files \u2192 ${batches} analysis batch`);
    
    processQueue();

    // PHASE 4: AI Analysis & PHASE 5: Finding Engine
    if (aiContext.files.length > 0) {
      aiEngine.analyzeContext(aiContext).then(result => {
        if (result.status === 'success') {
          // Process via FindingEngine
          const analyzedFiles = aiContext.files.map(f => f.path);
          const { newFindings, resolvedFindings } = findingEngine.processAnalysis(result.findings, analyzedFiles);
          
          const riskSummary = findingEngine.getRiskSummary();
          const grouped = findingEngine.groupFindings();

          // Send findings and risk summary to backend
          eventQueue.push({
            session_id: config.sessionId,
            event_type: 'custom',
            occurred_at: new Date().toISOString(),
            source: 'cli_ai_analysis',
            summary: `Risk Update: ${riskSummary.open} open, ${riskSummary.resolved} resolved`,
            payload: { 
              newFindings, 
              resolvedFindings,
              riskSummary,
              grouped,
              aiSummary: result.summary 
            }
          });
          
          console.log(`[risk] ${riskSummary.open} open issues (${newFindings.length} new, ${resolvedFindings.length} resolved in this batch)`);
          
          processQueue();
        } else if (result.status === 'unavailable') {
          console.log(`[ai] Analysis temporarily unavailable: ${result.reason}`);
        }
      }).catch(err => {
        console.error('[ai] Engine error:', err.message);
      });
    }
  }

  try {
    fs.watch(cwd, { recursive: true }, (eventType, filename) => {
      // 2. Ignore irrelevant files
      if (!filename || isIgnored(filename)) return;

      const normalizedPath = filename.replace(/\\/g, '/');
      
      // 5. Deduplicate
      // eventType from fs.watch is 'rename' or 'change'. Map it:
      let mappedEvent = eventType === 'rename' ? 'change' : 'change'; 
      // accurately detecting add/unlink from fs.watch 'rename' requires fs.stat, we default to change for now
      if (eventType === 'rename' && !fs.existsSync(path.join(cwd, filename))) {
        mappedEvent = 'unlink';
      } else if (eventType === 'rename') {
        mappedEvent = 'add';
      }
      
      pendingEvents.set(normalizedPath, mappedEvent);

      // 4. Debounce events
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(flushPendingEvents, DEBOUNCE_MS);
    });
  } catch (error) {
    console.error('Failed to start file watcher:', error.message);
    process.exit(1);
  }
}

module.exports = watchCommand;
