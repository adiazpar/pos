/**
 * Deduplicated fetch wrapper
 *
 * Prevents duplicate concurrent requests to the same URL.
 * If a request to the same URL is already in-flight, returns the same promise.
 */

// Track in-flight GET requests by URL
const inFlightRequests = new Map<string, Promise<Response>>()

/**
 * Fetch with automatic deduplication for GET requests.
 * POST/PUT/DELETE requests are never deduplicated.
 */
export async function fetchDeduped(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString()
  const method = init?.method?.toUpperCase() || 'GET'

  // Only dedupe GET requests
  if (method !== 'GET') {
    return fetch(input, init)
  }

  // Check if request is already in-flight
  const existing = inFlightRequests.get(url)
  if (existing) {
    // Return clone of the response (Response can only be read once)
    return existing.then(res => res.clone())
  }

  // Create new request and track it
  const request = fetch(input, init).then(response => {
    // Remove from tracking after a small delay to catch rapid duplicate calls
    setTimeout(() => inFlightRequests.delete(url), 100)
    return response
  }).catch(error => {
    inFlightRequests.delete(url)
    throw error
  })

  inFlightRequests.set(url, request)
  return request
}

/**
 * Clear all in-flight request tracking.
 * Useful for testing or when user logs out.
 */
export function clearInFlightRequests(): void {
  inFlightRequests.clear()
}
