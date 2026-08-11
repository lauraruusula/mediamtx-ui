import { computed } from 'vue'
import { useConfigStore, type ProtocolKey } from '@/stores/config'

/**
 * Guards a protocol connection/session page against a disabled server.
 *
 * MediaMTX only registers a protocol's API routes when that protocol's server
 * is enabled — otherwise the page's list endpoint 404s. This resolves the
 * global config, reports whether the protocol is disabled, and provides a
 * `guard()` helper so views can skip the fetch entirely.
 */
export function useProtocolGuard(protocol: ProtocolKey) {
  const configStore = useConfigStore()

  const disabled = computed(() => !configStore.protocolEnabled(protocol))

  // Ensures the config is loaded, then resolves to true when the page should
  // still fetch data (protocol enabled or config unreachable).
  const guard = async (): Promise<boolean> => {
    await configStore.ensureLoaded().catch(() => {})
    return !disabled.value
  }

  return { disabled, guard }
}
