/**
 * Simple Logger for Pottercast
 *
 * Purpose: Track key metrics during high load (300 concurrent users)
 * Implementation: Console-based logging (visible in Vercel logs)
 *
 * Metrics tracked:
 * - Vote submissions
 * - Authentication events
 * - Errors and performance issues
 */

type LogLevel = 'info' | 'warn' | 'error'

type LogContext = {
  userId?: string
  action?: string
  duration?: number
  error?: any
  [key: string]: any
}

/**
 * Log a message with context
 * Only logs in production to Vercel logs
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  // Skip logging in development to reduce noise
  if (process.env.NODE_ENV === 'development') {
    return
  }

  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    level,
    message,
    ...context,
  }

  // Use console methods which are captured by Vercel
  switch (level) {
    case 'info':
      console.log(JSON.stringify(logData))
      break
    case 'warn':
      console.warn(JSON.stringify(logData))
      break
    case 'error':
      console.error(JSON.stringify(logData))
      break
  }
}

/**
 * Log vote submission
 */
export function logVoteSubmission(userId: string, isEdit: boolean): void {
  log('info', 'Vote submitted', {
    userId,
    action: isEdit ? 'vote_edit' : 'vote_create',
  })
}

/**
 * Log authentication event
 */
export function logAuth(userId: string, action: 'signup' | 'signin' | 'signout'): void {
  log('info', 'Authentication event', {
    userId,
    action,
  })
}

/**
 * Log API request with duration
 */
export function logApiRequest(
  endpoint: string,
  method: string,
  duration: number,
  status: number
): void {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

  log(level, 'API request', {
    action: 'api_request',
    endpoint,
    method,
    duration,
    status,
  })
}

/**
 * Log error with context
 */
export function logError(message: string, error: any, context?: LogContext): void {
  log('error', message, {
    ...context,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
  })
}

/**
 * Log database connection pool usage (for monitoring)
 */
export function logConnectionPoolUsage(activeConnections: number, waitingRequests: number): void {
  log('info', 'Connection pool usage', {
    action: 'pool_usage',
    activeConnections,
    waitingRequests,
  })
}

/**
 * Performance measurement utility
 */
export class PerformanceTimer {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * Get elapsed time in milliseconds
   */
  elapsed(): number {
    return Date.now() - this.startTime
  }

  /**
   * Log the duration and return it
   */
  logDuration(message: string, context?: LogContext): number {
    const duration = this.elapsed()
    log('info', message, {
      ...context,
      duration,
    })
    return duration
  }
}

/**
 * Create a performance timer for measuring API calls
 */
export function startTimer(): PerformanceTimer {
  return new PerformanceTimer()
}
