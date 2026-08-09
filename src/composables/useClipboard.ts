/**
 * Copies text to the clipboard, falling back to a hidden-textarea +
 * execCommand approach when the async Clipboard API isn't available (e.g.
 * this admin UI served over plain HTTP on a LAN, which is not a "secure
 * context" and so browsers withhold navigator.clipboard).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through to legacy method
    }
  }
  const textarea = document.createElement('textarea')
  try {
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    // Guaranteed cleanup even if execCommand throws, so a failed copy never
    // leaves an orphaned off-screen textarea behind.
    textarea.remove()
  }
}
