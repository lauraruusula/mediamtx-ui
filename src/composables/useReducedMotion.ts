// One-shot read of the OS "reduce motion" preference for ECharts options.
// Charts render to <canvas>, so the global CSS `prefers-reduced-motion` override
// (which kills CSS animations/transitions) has no effect on them — animation
// must be switched off explicitly in each chart's options instead.
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
