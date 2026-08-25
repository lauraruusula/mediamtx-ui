<template>
  <div class="json-editor" :class="{ 'is-invalid': invalid }">
    <!-- v-html is safe here: every token passes through escapeHtml() before
         being wrapped in spans controlled by this component. -->
    <!-- eslint-disable vue/no-v-html -->
    <pre
      ref="highlightEl"
      class="json-editor-highlight"
      aria-hidden="true"
      v-html="highlighted"
    />
    <!-- eslint-enable vue/no-v-html -->
    <textarea
      ref="inputEl"
      class="json-editor-input"
      :value="modelValue"
      :rows="rows"
      wrap="off"
      spellcheck="false"
      aria-label="Raw JSON"
      @input="onInput"
      @scroll="syncScroll"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{ modelValue: string; rows?: number; invalid?: boolean }>(),
  {
    rows: 14,
    invalid: false
  }
)
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const inputEl = ref<HTMLTextAreaElement | null>(null)
const highlightEl = ref<HTMLPreElement | null>(null)

const onInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}

const syncScroll = () => {
  const input = inputEl.value
  const highlight = highlightEl.value
  if (input && highlight) {
    highlight.scrollTop = input.scrollTop
    highlight.scrollLeft = input.scrollLeft
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Lightweight JSON tokenizer — enough to color keys, strings, numbers and
// literals without pulling in a full highlighting library. A string followed
// by a colon is treated as a key. The regex is created per call so the
// computed stays side-effect free.
const TOKEN_PATTERN =
  '("(?:\\\\.|[^"\\\\])*")(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?'

const highlighted = computed(() => {
  const text = props.modelValue
  let html = ''
  let lastIndex = 0
  const tokenRe = new RegExp(TOKEN_PATTERN, 'g')
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(text))) {
    html += escapeHtml(text.slice(lastIndex, m.index))
    if (m[1]) {
      const cls = m[2] !== undefined ? 'tok-key' : 'tok-string'
      html += `<span class="${cls}">${escapeHtml(m[0])}</span>`
    } else if (m[0] === 'true' || m[0] === 'false' || m[0] === 'null') {
      html += `<span class="tok-literal">${m[0]}</span>`
    } else {
      html += `<span class="tok-number">${m[0]}</span>`
    }
    lastIndex = m.index + m[0].length
  }
  html += escapeHtml(text.slice(lastIndex))
  return html
})

// The textarea's scroll must drive the highlight layer; re-align after
// external updates (Format/Apply/reset) and whenever the editor resizes.
watch(
  () => props.modelValue,
  () => nextTick(syncScroll)
)

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  nextTick(syncScroll)
  if (typeof ResizeObserver !== 'undefined' && inputEl.value) {
    resizeObserver = new ResizeObserver(() => syncScroll())
    resizeObserver.observe(inputEl.value)
  }
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<style scoped>
.json-editor {
  position: relative;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-input-border-radius, 4px);
  background: var(--el-input-bg-color, var(--el-fill-color-blank));
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  overflow: hidden;
  --je-key: var(--el-color-primary);
  --je-string: #0f8a4d;
  --je-number: #b45309;
  --je-literal: #7c3aed;
}

:root.dark .json-editor {
  --je-string: #4ade80;
  --je-number: #fbbf24;
  --je-literal: #a78bfa;
}

.json-editor:focus-within {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.json-editor.is-invalid {
  border-color: var(--el-color-danger);
}

.json-editor-highlight,
.json-editor-input {
  margin: 0;
  padding: 8px 12px;
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-mono, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace);
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre;
}

.json-editor-highlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  overflow: hidden;
  pointer-events: none;
  color: var(--el-text-color-primary);
}

.json-editor-input {
  position: relative;
  display: block;
  border: none;
  outline: none;
  background: transparent;
  color: transparent;
  caret-color: var(--el-text-color-primary);
  resize: vertical;
  overflow: auto;
  font: inherit;
}

.json-editor-input::selection {
  background: var(--el-color-primary-light-7);
}

.tok-key {
  color: var(--je-key);
  font-weight: 600;
}

.tok-string {
  color: var(--je-string);
}

.tok-number {
  color: var(--je-number);
}

.tok-literal {
  color: var(--je-literal);
}
</style>
