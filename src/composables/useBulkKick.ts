import { ref, reactive, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useActivityStore } from '@/stores/activity'

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
      // Fire all kicks at once — waiting for them in sequence makes large
      // selections feel sluggish. Individual failures don't abort the rest.
      const results = await Promise.allSettled(rows.map(row => store.kick(row.id)))
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = rows.length - succeeded
      if (succeeded > 0) {
        ElMessage.success(`Kicked ${succeeded} ${label}${succeeded > 1 ? 's' : ''}`)
        activityStore.log(`Kicked ${succeeded} ${label}${succeeded > 1 ? 's' : ''}`, 'error')
      }
      if (failed > 0) {
        ElMessage.error(`Failed to kick ${failed} of ${rows.length} ${label}s`)
      }
      selection.value = []
      table?.value?.clearSelection()
    } finally {
      kicking.value = false
    }
  }

  return reactive({ selection, kicking, onSelectionChange, kickSelected })
}
