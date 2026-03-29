/**
 * Scroll utilities for the main content container.
 */

const DEFAULT_SCROLL_CONTAINER = '.main-scroll-container'

/**
 * Scrolls the main content container to the top with smooth animation.
 * Can be used directly as an onClick handler or called programmatically.
 */
export function scrollToTop() {
  const container = document.querySelector(DEFAULT_SCROLL_CONTAINER)
  container?.scrollTo({ top: 0, behavior: 'smooth' })
}

/**
 * Creates a scroll function for a specific container selector.
 * @param selector - CSS selector for the scroll container
 */
export function createScrollToTop(selector: string) {
  return () => {
    const container = document.querySelector(selector)
    container?.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
