/**
 * Error Handler for Pottercast
 *
 * Purpose: Provide user-friendly error messages and retry logic
 * Critical for handling errors during high load (300 concurrent users)
 */

export type ErrorType =
  | 'network'
  | 'auth'
  | 'validation'
  | 'rate_limit'
  | 'server'
  | 'timeout'
  | 'queue_full'
  | 'unknown'

export type AppError = {
  type: ErrorType
  message: string
  userMessage: string
  retryable: boolean
  retryAfter?: number
}

/**
 * Parse error from API response or exception
 */
export function parseError(error: any): AppError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: error.message,
      userMessage: 'בעיית תקשורת. אנא בדוק את החיבור לאינטרנט.',
      retryable: true,
    }
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
    return {
      type: 'timeout',
      message: error.message || 'Request timeout',
      userMessage: 'הבקשה ארכה יותר מדי זמן. השרת כנראה עמוס - מנסה שוב...',
      retryable: true,
      retryAfter: 5,
    }
  }

  // Rate limit errors (429)
  if (error.status === 429 || error.message?.includes('rate limit')) {
    return {
      type: 'rate_limit',
      message: error.message || 'Rate limit exceeded',
      userMessage: 'השרת עמוס מאוד כרגע. ההצבעה שלך נשמרה והמערכת ממשיכה לנסות ברקע.',
      retryable: true,
      retryAfter: error.retryAfter || 30,
    }
  }

  // Authentication errors (401, 403)
  if (error.status === 401 || error.status === 403) {
    return {
      type: 'auth',
      message: error.message || 'Authentication error',
      userMessage: 'אנא התחבר מחדש.',
      retryable: false,
    }
  }

  // Validation errors (400)
  if (error.status === 400) {
    return {
      type: 'validation',
      message: error.message || 'Validation error',
      userMessage: error.message || 'אנא בדוק את הנתונים שהזנת.',
      retryable: false,
    }
  }

  // Server errors (500+)
  if (error.status >= 500) {
    return {
      type: 'server',
      message: error.message || 'Server error',
      userMessage: 'שגיאת שרת. אנא נסה שוב בעוד מספר רגעים.',
      retryable: true,
    }
  }

  // Database/Supabase errors
  if (error.code?.startsWith('PGRST') || error.code?.startsWith('08')) {
    return {
      type: 'server',
      message: error.message || 'Database error',
      userMessage: 'שגיאה בשמירת הנתונים. אנא נסה שוב.',
      retryable: true,
    }
  }

  // Unknown errors
  return {
    type: 'unknown',
    message: error.message || 'Unknown error',
    userMessage: 'אירעה שגיאה. אנא נסה שוב.',
    retryable: true,
  }
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in ms (default: 1000)
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const appError = parseError(error)

      // Don't retry non-retryable errors
      if (!appError.retryable) {
        throw error
      }

      // Don't retry on last attempt
      if (i === maxRetries) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, i)

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay

      await new Promise((resolve) => setTimeout(resolve, delay + jitter))
    }
  }

  throw lastError
}

/**
 * Save data to localStorage as backup
 */
export function saveToLocalStorage(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to save to localStorage:', error)
    }
  }
}

/**
 * Load data from localStorage
 */
export function loadFromLocalStorage<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load from localStorage:', error)
    }
    return null
  }
}

/**
 * Clear localStorage key
 */
export function clearFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to clear localStorage:', error)
    }
  }
}
