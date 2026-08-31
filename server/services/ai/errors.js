/**
 * AI Error Classification — Distinguish transient failures from application bugs.
 *
 * Transient errors → fallback to MockAIProvider is safe
 * Application errors → surface the error, do NOT silently fallback
 *
 * Categories:
 *   - transient: Provider-side temporary failures (rate limit, timeout, network, 5xx)
 *   - application: Bugs in our code (bad request data, missing fields, validation)
 *   - configuration: Misconfiguration that should be fixed
 */

// ═══════════════════════════════════════════════════════
// Error Categories
// ═══════════════════════════════════════════════════════

export const ErrorCategory = {
  TRANSIENT: 'transient',
  APPLICATION: 'application',
  CONFIGURATION: 'configuration',
};

// ═══════════════════════════════════════════════════════
// Transient Error Classifications
// ═══════════════════════════════════════════════════════

/**
 * HTTP status codes that indicate provider-side transient failures.
 * These are safe to fallback on.
 */
const TRANSIENT_HTTP_STATUSES = new Set([
  408,  // Request Timeout
  429,  // Rate Limit / Quota Exceeded
  500,  // Internal Server Error (provider side)
  502,  // Bad Gateway
  503,  // Service Unavailable
  504,  // Gateway Timeout
]);

/**
 * Error codes that indicate transient failures.
 */
const TRANSIENT_ERROR_CODES = new Set([
  'timeout',
  'rate_limit_exceeded',
  'insufficient_quota',
  'connection_error',
  'connection_refused',
  'connection_reset',
  'econnrefused',
  'econnreset',
  'enetunreach',
  'enotfound',
  'epipe',
  'etimedout',
  'network_error',
  'socket_closed',
  'body_timeout',
  'connect_timeout',
  'dns_error',
  'fetch_failed',
]);

/**
 * Error message patterns that indicate transient failures (case-insensitive).
 */
const TRANSIENT_MESSAGE_PATTERNS = [
  /rate\s*limit/i,
  /quota\s*exceeded/i,
  /insufficient\s*quota/i,
  /timeout/i,
  /timed?\s*out/i,
  /connection\s*(refused|reset|failed|error|closed)/i,
  /network\s*(error|failure|unavailable)/i,
  /econnrefused/i,
  /econnreset/i,
  /socket\s*(closed|hang\s*up)/i,
  /fetch\s*failed/i,
  /dns\s*(resolution|lookup)?\s*fail/i,
  /getaddrinfo\s*failed/i,
  /connect\s*error/i,
  /temporary/i,
  /service\s*unavailable/i,
  /bad\s*gateway/i,
  /gateway\s*time.?out/i,
  /internal\s*server\s*error/i,
  /503/i,
  /502/i,
  /504/i,
  /429/i,
];

/**
 * Application error message patterns — these indicate bugs, NOT provider issues.
 * These should NOT trigger fallback.
 */
const APPLICATION_MESSAGE_PATTERNS = [
  /invalid\s*(request|parameter|argument|input)/i,
  /missing\s*(required|parameter|field|argument)/i,
  /validation\s*error/i,
  /malformed/i,
  /type\s*error/i,
  /reference\s*error/i,
  /syntax\s*error/i,
  /cannot\s*read\s*propert/i,
  /is\s*not\s*a\s*function/i,
  /is\s*not\s*(an?\s*)?array/i,
  /unexpected\s*(token|keyword)/i,
  /unexpected\s*end/i,
  /json.*parse/i,
  /circular\s*reference/i,
  /stack\s*overflow/i,
];

// ═══════════════════════════════════════════════════════
// Classification Function
// ═══════════════════════════════════════════════════════

/**
 * Classify an error into a category and provide a sanitized reason.
 *
 * @param {Error} error - The error to classify
 * @returns {{ category: string, reason: string, isRetryable: boolean }}
 */
export function classifyError(error) {
  if (!error) {
    return {
      category: ErrorCategory.APPLICATION,
      reason: 'unknown_error',
      isRetryable: false,
    };
  }

  const message = error.message || String(error);
  const status = error.status || error.statusCode || error.httpStatus || null;
  const code = (error.code || error.errorCode || error.type || '').toLowerCase();

  // 1. Check HTTP status codes
  if (status && TRANSIENT_HTTP_STATUSES.has(status)) {
    return {
      category: ErrorCategory.TRANSIENT,
      reason: httpStatusToReason(status),
      isRetryable: status === 429, // Only rate limits are retryable
    };
  }

  // 2. Check error codes
  if (code && TRANSIENT_ERROR_CODES.has(code)) {
    return {
      category: ErrorCategory.TRANSIENT,
      reason: code,
      isRetryable: false,
    };
  }

  // 3. Check message patterns for transient errors
  for (const pattern of TRANSIENT_MESSAGE_PATTERNS) {
    if (pattern.test(message)) {
      return {
        category: ErrorCategory.TRANSIENT,
        reason: patternToReason(pattern),
        isRetryable: false,
      };
    }
  }

  // 4. Check message patterns for application errors
  for (const pattern of APPLICATION_MESSAGE_PATTERNS) {
    if (pattern.test(message)) {
      return {
        category: ErrorCategory.APPLICATION,
        reason: 'application_error',
        isRetryable: false,
      };
    }
  }

  // 5. Check for OpenAI-specific error structure
  if (error.error) {
    const innerError = error.error;
    const innerType = (innerError.type || '').toLowerCase();
    const innerCode = (innerError.code || '').toLowerCase();

    if (innerType === 'invalid_request_error' || innerCode === 'invalid_request_error') {
      return {
        category: ErrorCategory.APPLICATION,
        reason: 'invalid_request',
        isRetryable: false,
      };
    }

    if (innerType === 'authentication_error' || innerCode === 'invalid_api_key') {
      return {
        category: ErrorCategory.CONFIGURATION,
        reason: 'authentication_error',
        isRetryable: false,
      };
    }
  }

  // 6. Default: treat as application error (safer than silent fallback)
  return {
    category: ErrorCategory.APPLICATION,
    reason: 'unclassified_error',
    isRetryable: false,
  };
}

/**
 * Determine whether an error should trigger provider fallback.
 *
 * @param {Error} error - The error to check
 * @returns {boolean} true if fallback is safe
 */
export function shouldFallback(error) {
  const { category } = classifyError(error);
  return category === ErrorCategory.TRANSIENT;
}

// ═══════════════════════════════════════════════════════
// Reason Mapping
// ═══════════════════════════════════════════════════════

function httpStatusToReason(status) {
  switch (status) {
    case 408: return 'request_timeout';
    case 429: return 'rate_limit';
    case 500: return 'provider_error';
    case 502: return 'bad_gateway';
    case 503: return 'service_unavailable';
    case 504: return 'gateway_timeout';
    default: return `http_${status}`;
  }
}

function patternToReason(pattern) {
  const source = pattern.source.toLowerCase();
  if (source.includes('rate') || source.includes('quota')) return 'rate_limit';
  if (source.includes('timeout') || source.includes('timed')) return 'timeout';
  if (source.includes('connection') || source.includes('fetch')) return 'connection_error';
  if (source.includes('network')) return 'network_error';
  if (source.includes('dns')) return 'dns_error';
  if (source.includes('socket')) return 'connection_error';
  if (source.includes('503')) return 'service_unavailable';
  if (source.includes('502')) return 'bad_gateway';
  if (source.includes('504')) return 'gateway_timeout';
  if (source.includes('429')) return 'rate_limit';
  return 'transient_error';
}

export default {
  ErrorCategory,
  classifyError,
  shouldFallback,
};
