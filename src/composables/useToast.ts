import { ElMessage } from 'element-plus'

// Central toast defaults so every call site shows the same modern, bottom-right
// toast instead of Element Plus's default top-of-screen banner. `customClass`
// is styled globally in style.css (.el-message.app-toast).
const TOAST_DEFAULTS = {
  placement: 'bottom-right' as const,
  offset: 24,
  grouping: true,
  duration: 3200,
  customClass: 'app-toast'
}

export const toast = {
  success(message: string) {
    ElMessage({ ...TOAST_DEFAULTS, type: 'success', message })
  },
  error(message: string) {
    ElMessage({ ...TOAST_DEFAULTS, type: 'error', message })
  },
  warning(message: string) {
    ElMessage({ ...TOAST_DEFAULTS, type: 'warning', message })
  },
  info(message: string) {
    ElMessage({ ...TOAST_DEFAULTS, type: 'info', message })
  }
}
