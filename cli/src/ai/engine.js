const crypto = require('crypto');
const { validateFindings } = require('./validator');

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 50;
const MIN_REQUEST_DELAY = 1000;

class AIAnalysisEngine {
  constructor(provider) {
    this.provider = provider;
    this.cache = new Map();
    this.queue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.inFlight = new Set();
    
    this.telemetry = {
      requestCount: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitErrors: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLatencyMs: 0,
      totalLatencyMs: 0
    };
  }

  generateFingerprint(context) {
    const hash = crypto.createHash('sha256');
    const parts = [
      JSON.stringify(context.environment || {}),
      context.files.map(f => `${f.path}:${f.content.length}`).join(',')
    ];
    hash.update(parts.join('|'));
    return hash.digest('hex');
  }

  async analyzeContext(context) {
    if (!context || !context.files || context.files.length === 0) {
      return { status: 'skipped', reason: 'empty_context' };
    }

    const fingerprint = this.generateFingerprint(context);

    // 14. Result caching
    const cached = this.cache.get(fingerprint);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      this.telemetry.cacheHits++;
      return cached.result;
    }

    // 13. Request deduplication
    if (this.inFlight.has(fingerprint)) {
      return { status: 'skipped', reason: 'already_in_flight' };
    }

    this.telemetry.cacheMisses++;

    return new Promise((resolve) => {
      this.queue.push({ context, fingerprint, resolve });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    if (timeSinceLast < MIN_REQUEST_DELAY) {
      setTimeout(() => this.processQueue(), MIN_REQUEST_DELAY - timeSinceLast);
      return;
    }

    this.isProcessing = true;
    const { context, fingerprint, resolve } = this.queue.shift();
    this.inFlight.add(fingerprint);

    const result = await this.executeWithRetry(context);
    
    this.inFlight.delete(fingerprint);

    if (result.status === 'success') {
      if (this.cache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(fingerprint, { timestamp: Date.now(), result });
    }

    resolve(result);

    this.lastRequestTime = Date.now();
    this.isProcessing = false;
    this.processQueue();
  }

  async executeWithRetry(context) {
    let attempts = 0;
    const maxAttempts = 2;
    let delay = 1000;

    const requestPayload = {
      environment: context.environment,
      changeSummary: context.changeSummary,
      files: context.files,
      task: "Analyze the provided code changes for bugs, security issues, reliability problems, and configuration problems. Identify concrete problems supported by evidence. Do not invent files or behavior. Provide actionable findings."
    };

    while (attempts < maxAttempts) {
      attempts++;
      this.telemetry.requestCount++;
      const startTime = Date.now();

      try {
        const response = await this.provider.analyze(requestPayload);
        const latency = Date.now() - startTime;
        
        this.telemetry.successfulRequests++;
        this.telemetry.estimatedInputTokens += response.inputTokens || 0;
        this.telemetry.estimatedOutputTokens += response.outputTokens || 0;
        this.telemetry.totalLatencyMs += latency;
        this.telemetry.averageLatencyMs = this.telemetry.totalLatencyMs / this.telemetry.successfulRequests;

        const validation = validateFindings(response.raw);
        if (!validation.valid) {
          return { status: 'error', reason: 'invalid_output' };
        }

        const timeString = new Date().toTimeString().split(' ')[0];
        console.log(`[ai] 1 request | ~${(response.inputTokens || 0).toLocaleString()} input tokens | ${(response.outputTokens || 0).toLocaleString()} output tokens | ${(latency / 1000).toFixed(1)}s`);

        if (validation.findings.length > 0) {
          for (const f of validation.findings) {
            console.log(`[finding] [${f.severity.toUpperCase()}] ${f.title} (${f.file})`);
          }
        }

        return {
          status: 'success',
          findings: validation.findings,
          summary: validation.summary
        };

      } catch (err) {
        this.telemetry.failedRequests++;
        const isRateLimit = err.status === 429;
        
        if (isRateLimit) this.telemetry.rateLimitErrors++;

        const isRetryable = isRateLimit || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';
        
        if (isRetryable && attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          continue;
        }

        return {
          status: 'unavailable',
          reason: isRateLimit ? 'rate_limit' : 'provider_timeout'
        };
      }
    }
  }
}

module.exports = { AIAnalysisEngine };
