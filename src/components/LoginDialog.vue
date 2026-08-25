<template>
  <el-dialog
    v-model="visible"
    :title="hasAuth ? 'API authentication' : 'Sign in to MediaMTX API'"
    width="400px"
    align-center
    :close-on-click-modal="false"
  >
    <p v-if="!hasAuth" class="login-hint">
      MediaMTX requested API credentials. Sign in with an internal user that has the
      <code>api</code> permission, or paste a JWT for JWT-based auth.
    </p>

    <el-form v-if="!hasAuth" label-position="top" @submit.prevent="submit">
      <el-radio-group v-model="mode" size="small" class="login-mode-switch">
        <el-radio-button value="basic">Username &amp; password</el-radio-button>
        <el-radio-button value="bearer">Token</el-radio-button>
      </el-radio-group>

      <template v-if="mode === 'basic'">
        <el-form-item label="Username">
          <el-input v-model="user" autocomplete="username" @keyup.enter="submit" />
        </el-form-item>
        <el-form-item label="Password">
          <el-input
            v-model="pass"
            type="password"
            show-password
            autocomplete="current-password"
            @keyup.enter="submit"
          />
        </el-form-item>
      </template>
      <template v-else>
        <el-form-item label="Bearer token">
          <el-input
            v-model="token"
            type="password"
            show-password
            autocomplete="off"
            placeholder="Paste the JWT here"
            @keyup.enter="submit"
          />
        </el-form-item>
      </template>

      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        :closable="false"
        class="login-error"
      />
      <p class="login-note">
        Credentials are stored in this browser only and sent to the API on every request. Sign out
        clears them.
      </p>
    </el-form>

    <div v-else class="login-signed-in">
      <el-icon class="login-check"><CircleCheckFilled /></el-icon>
      <div>
        <div class="login-signed-in-title">
          Signed in as
          <strong>{{ authLabel }}</strong>
        </div>
        <div class="login-signed-in-sub">The API is reachable with these credentials.</div>
      </div>
    </div>

    <template #footer>
      <template v-if="hasAuth">
        <el-button @click="visible = false">Close</el-button>
        <el-button type="danger" plain :loading="signingOut" @click="signOut">Sign out</el-button>
      </template>
      <template v-else>
        <el-button @click="visible = false">Cancel</el-button>
        <el-button type="primary" :loading="loading" @click="submit">Sign in</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getInfo } from '@/api/system'
import { getApiAuth, setApiAuth, clearApiAuth } from '@/api'
import { toast } from '@/composables/useToast'
import { CircleCheckFilled } from '@element-plus/icons-vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

const visible = computed({
  get: () => props.visible,
  set: v => emit('update:visible', v)
})

const mode = ref<'basic' | 'bearer'>('basic')
const user = ref('')
const pass = ref('')
const token = ref('')
const error = ref('')
const loading = ref(false)
const signingOut = ref(false)

// Reflect stored auth live (e.g. after a successful sign-in elsewhere).
const auth = ref(getApiAuth())
const hasAuth = computed(() => auth.value !== null)
const authLabel = computed(() =>
  auth.value?.kind === 'basic' ? auth.value.user : auth.value?.kind === 'bearer' ? 'token' : ''
)

watch(
  () => props.visible,
  open => {
    if (!open) return
    error.value = ''
    // Pick up auth state in case it changed since the dialog last opened.
    auth.value = getApiAuth()
    if (!auth.value && mode.value === 'basic' && user.value) return
  }
)

const submit = async () => {
  error.value = ''
  const next =
    mode.value === 'basic'
      ? { kind: 'basic' as const, user: user.value.trim(), pass: pass.value }
      : { kind: 'bearer' as const, token: token.value.trim() }
  if (next.kind === 'basic' && (!next.user || !next.pass)) {
    error.value = 'Enter both a username and a password.'
    return
  }
  if (next.kind === 'bearer' && !next.token) {
    error.value = 'Paste a token to continue.'
    return
  }

  // Store the credentials first so the request interceptor sends them, then
  // probe a lightweight endpoint to confirm they're accepted.
  setApiAuth(next)
  loading.value = true
  try {
    await getInfo()
    auth.value = next
    toast.success('Signed in')
    // Reload so every view refetches with the credentials attached — without
    // it, pages that already showed a 401 error would stay stale until their
    // next manual refresh.
    window.location.reload()
  } catch (err: any) {
    clearApiAuth()
    auth.value = null
    const status = err?.response?.status
    error.value =
      status === 401
        ? 'The API rejected these credentials. Check the username and password, or the token.'
        : status
          ? `The API answered with ${status} — is authentication even enabled?`
          : 'Could not reach the MediaMTX API.'
  } finally {
    loading.value = false
  }
}

const signOut = async () => {
  signingOut.value = true
  try {
    clearApiAuth()
    auth.value = null
    toast.info('Signed out')
    window.location.reload()
  } finally {
    signingOut.value = false
  }
}
</script>

<style scoped>
.login-hint {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.login-hint code {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--el-fill-color-light);
  padding: 1px 5px;
  border-radius: 4px;
}

.login-mode-switch {
  margin-bottom: 16px;
}

.login-error {
  margin-bottom: 12px;
}

.login-note {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.login-signed-in {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0 6px;
}

.login-check {
  font-size: 26px;
  color: var(--el-color-success);
  flex-shrink: 0;
}

.login-signed-in-title {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.login-signed-in-sub {
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}
</style>
