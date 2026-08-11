import { ref, reactive, type Ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { toast } from '@/composables/useToast'
import { useActivityStore } from '@/stores/activity'

interface Kickable {
  id: string
}

export interface KickableTable {
  clearSelection: () => void
}

const plural = (label: string, count: number) => (count === 1 ? label : `${label}s`)

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
    // Kicking several clients at once is destructive — confirm first so a
    // mis-click on the danger button can't take out a whole fleet.
    try {
      await ElMessageBox.confirm(
        `Kick ${rows.length} ${plural(label, rows.length)}? The clients will be disconnected immediately.`,
        `Kick ${rows.length} ${plural(label, rows.length)}?`,
        { confirmButtonText: 'Kick', cancelButtonText: 'Cancel', type: 'warning' }
      )
    } catch {
      return // cancelled
    }
    kicking.value = true
    try {
      // Fire all kicks at once — waiting for them in sequence makes large
      // selections feel sluggish. Individual failures don't abort the rest.
      const results = await Promise.allSettled(rows.map(row => store.kick(row.id)))
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = rows.length - succeeded
      if (succeeded > 0) {
        toast.success(`Kicked ${succeeded} ${plural(label, succeeded)}`)
        activityStore.log(`Kicked ${succeeded} ${plural(label, succeeded)}`, 'error')
      }
      if (failed > 0) {
        toast.error(`Failed to kick ${failed} of ${rows.length} ${plural(label, failed)}`)
      }
      selection.value = []
      table?.value?.clearSelection()
    } finally {
      kicking.value = false
    }
  }

  return reactive({ selection, kicking, onSelectionChange, kickSelected })
}
