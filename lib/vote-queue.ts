/**
 * Vote Queue System for Pottercast
 *
 * Purpose: Handle vote submissions with intelligent retry logic and queue management
 * Critical for handling high load scenarios (300 concurrent users)
 *
 * Features:
 * - Persistent queue in localStorage (survives page refresh)
 * - Exponential backoff with jitter (1s → 2s → 5s → 10s → 30s)
 * - Concurrent request management (max 3 parallel requests)
 * - Real-time status updates via event listeners
 * - Hebrew user-friendly status messages
 */

export type QueueStatus = 'pending' | 'sending' | 'success' | 'failed' | 'retrying'

export type VoteQueueItem = {
  id: string
  userId: string
  predictions: Record<string, number>
  clientTimestamp: string
  isEdit: boolean
  status: QueueStatus
  attempts: number
  maxAttempts: number
  nextRetryAt?: number
  createdAt: number
  error?: string
}

export type QueueStatusEvent = {
  id: string
  status: QueueStatus
  attempts: number
  maxAttempts: number
  position?: number
  totalInQueue?: number
  message: string
}

const QUEUE_STORAGE_KEY = 'vote_queue'
const MAX_CONCURRENT_REQUESTS = 3
const MAX_ATTEMPTS = 5
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000] // ms

// Event listeners for status updates
type QueueEventListener = (event: QueueStatusEvent) => void
const eventListeners: QueueEventListener[] = []

/**
 * Subscribe to queue status updates
 */
export function subscribeToQueueUpdates(listener: QueueEventListener): () => void {
  eventListeners.push(listener)

  // Return unsubscribe function
  return () => {
    const index = eventListeners.indexOf(listener)
    if (index > -1) {
      eventListeners.splice(index, 1)
    }
  }
}

/**
 * Emit queue status event to all listeners
 */
function emitQueueEvent(event: QueueStatusEvent): void {
  eventListeners.forEach(listener => {
    try {
      listener(event)
    } catch (error) {
      console.error('Error in queue event listener:', error)
    }
  })
}

/**
 * Load queue from localStorage
 */
function loadQueue(): VoteQueueItem[] {
  try {
    const data = localStorage.getItem(QUEUE_STORAGE_KEY)
    if (!data) return []

    const queue = JSON.parse(data) as VoteQueueItem[]

    // Clean up old completed/failed items (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    return queue.filter(item => {
      if (item.status === 'success' && item.createdAt < oneHourAgo) return false
      if (item.status === 'failed' && item.attempts >= item.maxAttempts && item.createdAt < oneHourAgo) return false
      return true
    })
  } catch (error) {
    console.error('Failed to load queue:', error)
    return []
  }
}

/**
 * Save queue to localStorage
 */
function saveQueue(queue: VoteQueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
  } catch (error) {
    console.error('Failed to save queue:', error)
  }
}

/**
 * Get Hebrew status message
 */
function getStatusMessage(item: VoteQueueItem, position?: number, totalInQueue?: number): string {
  const timestamp = new Date(item.clientTimestamp).toLocaleTimeString('he-IL')

  switch (item.status) {
    case 'pending':
      if (totalInQueue && totalInQueue > 1) {
        return `כולם שולחים עכשיו! הרגע המדויק שלך נשמר (${timestamp}) - ממתין בתור (${position}/${totalInQueue})`
      }
      return `מכין לשליחה... הרגע המדויק: ${timestamp}`

    case 'sending':
      return `שולח את ההצבעה שלך... (ניסיון ${item.attempts}/${item.maxAttempts})`

    case 'retrying':
      if (item.attempts >= 3) {
        return `השרת עמוס מאוד - ממשיך לנסות ברקע. אתה יכול לסגור את הדף, זה ימשיך לפעול. הרגע שלך: ${timestamp}`
      }
      return `השרת עמוס - מנסה שוב... (ניסיון ${item.attempts}/${item.maxAttempts})`

    case 'success':
      return `ההצבעה נשמרה בהצלחה! הרגע המדויק: ${timestamp} ✓`

    case 'failed':
      return `שגיאה בשמירת ההצבעה. הנתונים נשמרו במחשב שלך. אנא נסה שוב מאוחר יותר.`

    default:
      return ''
  }
}

/**
 * Add vote to queue
 */
export function addVoteToQueue(
  userId: string,
  predictions: Record<string, number>,
  clientTimestamp: string,
  isEdit: boolean = false
): string {
  const queue = loadQueue()

  // Generate unique ID
  const id = `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const item: VoteQueueItem = {
    id,
    userId,
    predictions,
    clientTimestamp,
    isEdit,
    status: 'pending',
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    createdAt: Date.now(),
  }

  queue.push(item)
  saveQueue(queue)

  // Emit initial event
  emitQueueEvent({
    id,
    status: 'pending',
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    position: queue.length,
    totalInQueue: queue.length,
    message: getStatusMessage(item, queue.length, queue.length),
  })

  // Start processing queue
  processQueue()

  return id
}

/**
 * Get current queue status for a specific vote
 */
export function getQueueStatus(id: string): QueueStatusEvent | null {
  const queue = loadQueue()
  const item = queue.find(q => q.id === id)

  if (!item) return null

  const pendingItems = queue.filter(q => q.status === 'pending' || q.status === 'sending' || q.status === 'retrying')
  const position = pendingItems.findIndex(q => q.id === id) + 1

  return {
    id: item.id,
    status: item.status,
    attempts: item.attempts,
    maxAttempts: item.maxAttempts,
    position: position > 0 ? position : undefined,
    totalInQueue: pendingItems.length,
    message: getStatusMessage(item, position > 0 ? position : undefined, pendingItems.length),
  }
}

/**
 * Submit a single vote to the API
 */
async function submitVote(item: VoteQueueItem): Promise<boolean> {
  try {
    const endpoint = '/api/votes'
    const method = item.isEdit ? 'PUT' : 'POST'

    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: item.userId,
        predictions: item.predictions,
        clientTimestamp: item.clientTimestamp,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return true
  } catch (error: any) {
    console.error(`Vote submission failed for ${item.id}:`, error)
    throw error
  }
}

/**
 * Process the queue (main processing loop)
 */
let isProcessing = false
let processingTimeout: NodeJS.Timeout | null = null

async function processQueue(): Promise<void> {
  // Prevent multiple concurrent processing loops
  if (isProcessing) return

  isProcessing = true

  try {
    const queue = loadQueue()
    const now = Date.now()

    // Get items ready to process
    const readyItems = queue.filter(item => {
      if (item.status === 'success' || item.status === 'failed') return false
      if (item.status === 'sending') return false // Already being processed
      if (item.nextRetryAt && item.nextRetryAt > now) return false
      return true
    })

    // Get currently sending items
    const sendingItems = queue.filter(item => item.status === 'sending')

    // Limit concurrent requests
    const availableSlots = MAX_CONCURRENT_REQUESTS - sendingItems.length
    const itemsToProcess = readyItems.slice(0, availableSlots)

    // Process each item
    const promises = itemsToProcess.map(item => processQueueItem(item))
    await Promise.all(promises)

    // Check if there are more items to process
    const updatedQueue = loadQueue()
    const hasMoreWork = updatedQueue.some(item =>
      (item.status === 'pending' || item.status === 'retrying' || item.status === 'sending') &&
      item.attempts < item.maxAttempts
    )

    if (hasMoreWork) {
      // Schedule next processing cycle
      processingTimeout = setTimeout(() => {
        isProcessing = false
        processQueue()
      }, 1000)
    } else {
      isProcessing = false
    }
  } catch (error) {
    console.error('Error in queue processing:', error)
    isProcessing = false

    // Retry after error
    processingTimeout = setTimeout(() => processQueue(), 2000)
  }
}

/**
 * Process a single queue item
 */
async function processQueueItem(item: VoteQueueItem): Promise<void> {
  const queue = loadQueue()
  const itemIndex = queue.findIndex(q => q.id === item.id)

  if (itemIndex === -1) return

  // Update status to sending
  queue[itemIndex].status = 'sending'
  queue[itemIndex].attempts++
  saveQueue(queue)

  // Emit status update
  const pendingCount = queue.filter(q => q.status !== 'success' && q.status !== 'failed').length
  emitQueueEvent({
    id: item.id,
    status: 'sending',
    attempts: queue[itemIndex].attempts,
    maxAttempts: queue[itemIndex].maxAttempts,
    totalInQueue: pendingCount,
    message: getStatusMessage(queue[itemIndex]),
  })

  try {
    // Try to submit
    await submitVote(queue[itemIndex])

    // Success!
    const updatedQueue = loadQueue()
    const updatedIndex = updatedQueue.findIndex(q => q.id === item.id)
    if (updatedIndex !== -1) {
      updatedQueue[updatedIndex].status = 'success'
      saveQueue(updatedQueue)

      emitQueueEvent({
        id: item.id,
        status: 'success',
        attempts: updatedQueue[updatedIndex].attempts,
        maxAttempts: updatedQueue[updatedIndex].maxAttempts,
        message: getStatusMessage(updatedQueue[updatedIndex]),
      })
    }
  } catch (error: any) {
    // Failed - schedule retry
    const updatedQueue = loadQueue()
    const updatedIndex = updatedQueue.findIndex(q => q.id === item.id)

    if (updatedIndex === -1) return

    const currentItem = updatedQueue[updatedIndex]

    if (currentItem.attempts >= currentItem.maxAttempts) {
      // Max attempts reached
      currentItem.status = 'failed'
      currentItem.error = error.message
      saveQueue(updatedQueue)

      emitQueueEvent({
        id: item.id,
        status: 'failed',
        attempts: currentItem.attempts,
        maxAttempts: currentItem.maxAttempts,
        message: getStatusMessage(currentItem),
      })
    } else {
      // Schedule retry
      const attemptIndex = Math.min(currentItem.attempts - 1, RETRY_DELAYS.length - 1)
      const baseDelay = RETRY_DELAYS[attemptIndex]
      const jitter = Math.random() * 0.3 * baseDelay
      const delay = baseDelay + jitter

      currentItem.status = 'retrying'
      currentItem.nextRetryAt = Date.now() + delay
      currentItem.error = error.message
      saveQueue(updatedQueue)

      const pendingCount = updatedQueue.filter(q => q.status !== 'success' && q.status !== 'failed').length
      emitQueueEvent({
        id: item.id,
        status: 'retrying',
        attempts: currentItem.attempts,
        maxAttempts: currentItem.maxAttempts,
        totalInQueue: pendingCount,
        message: getStatusMessage(currentItem),
      })
    }
  }
}

/**
 * Get all pending votes count
 */
export function getPendingVotesCount(): number {
  const queue = loadQueue()
  return queue.filter(item =>
    item.status !== 'success' && item.status !== 'failed'
  ).length
}

/**
 * Clear completed votes from queue
 */
export function clearCompletedVotes(): void {
  const queue = loadQueue()
  const filtered = queue.filter(item => item.status !== 'success')
  saveQueue(filtered)
}

/**
 * Retry failed vote
 */
export function retryFailedVote(id: string): void {
  const queue = loadQueue()
  const item = queue.find(q => q.id === id)

  if (item && item.status === 'failed') {
    item.status = 'pending'
    item.attempts = 0
    item.nextRetryAt = undefined
    item.error = undefined
    saveQueue(queue)

    processQueue()
  }
}

// Auto-start processing on load (for page refresh scenario)
if (typeof window !== 'undefined') {
  // Check if there are pending items and start processing
  setTimeout(() => {
    const queue = loadQueue()
    const hasPending = queue.some(item =>
      item.status !== 'success' && item.status !== 'failed'
    )

    if (hasPending) {
      processQueue()
    }
  }, 1000)
}
