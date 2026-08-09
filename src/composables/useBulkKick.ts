import { ref, reactive, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useActivityStore } from '@/stores/activity'
import { getErrorMessage } from './useErrorMessage'

interface Kickable {
  id: string
}

export interface KickableTable {
  clearSelection: () => void
}

/**
 * Multi-select kick support for connection/session tables. Bind
 * `@selection-change` on the table and render a "Kick N selected" button from
 * `selection`. `label` is the resource name used in toasts/logs (e.g. "RTSP session").
 * Returns a reactive object, so templates can use `bulk.selection.length` directly.
 */
export function useBulkKick(store: { kick: (id: string) => Promise<void> }, label: string) {
  const selection = ref<Kickable[]>([])
  const kicking = ref(false)
  const activityStore = useActivityStore()

  const onSelectionChange = (rows: Kickable[]) => {
    selection.value = rows
  }

  const kickSelected = async (table?: Ref<KickableTable | null>) => {
    const rows = [...selection.value]
    if (!rows.length) return
    kicking.value = true
    try {
      for (const row of rows) {
        await store.kick(row.id)
        activityStore.log(`Kicked a ${label} (${row.id.slice(0, 8)}…)`, 'error')
      }
      ElMessage.success(`Kicked ${rows.length} ${label}${rows.length > 1 ? 's' : ''}`)
      selection.value = []
      table?.value?.clearSelection()
    } catch (err) {
      ElMessage.error(getErrorMessage(err, `Failed to kick ${label}`))
    } finally {
      kicking.value = false
    }
  }

  return reactive({ selection, kicking, onSelectionChange, kickSelected })
}
