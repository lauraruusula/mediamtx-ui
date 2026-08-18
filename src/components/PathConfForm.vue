<!--
  eslint-disable vue/no-mutating-props

  This form is deliberately a "controlled form": the parent owns a reactive
  PathConfForm object and passes it down for two-way editing (the form never
  emits values back). Mutating the object's fields is the contract of this
  component — the rule is disabled for the whole file rather than per line.
-->
<template>
  <el-tabs v-model="activeTab">
    <el-tab-pane label="Source" name="source">
      <el-form label-width="170px">
        <el-form-item v-if="showName" label="Path Name" required>
          <el-input v-model="form.name" :disabled="nameDisabled" placeholder="e.g. mystream" />
        </el-form-item>
        <el-form-item label="Source">
          <el-input
            v-model="form.source"
            placeholder="e.g. rtsp://... (leave empty to publish directly)"
          />
        </el-form-item>
        <el-form-item label="Source Fingerprint">
          <el-input v-model="form.sourceFingerprint" placeholder="e.g. 01:23:45:..." />
          <span class="form-hint">Verify the source server's TLS fingerprint</span>
        </el-form-item>
        <el-form-item label="On demand">
          <el-switch v-model="form.sourceOnDemand" />
          <span class="form-hint"
            >Only connect to the source when a reader requests the stream</span
          >
        </el-form-item>
        <el-form-item label="Max Readers">
          <el-input-number v-model="form.maxReaders" :min="0" style="width: 100%" />
          <span class="form-hint">0 = unlimited</span>
        </el-form-item>
        <el-form-item label="Always Available">
          <el-switch v-model="form.alwaysAvailable" />
          <span class="form-hint">Serve the stream even when no publisher is connected</span>
        </el-form-item>
        <el-form-item v-if="form.alwaysAvailable" label="Always Available File">
          <el-input
            v-model="form.alwaysAvailableFile"
            placeholder="File that is published when no source is available"
          />
        </el-form-item>
        <el-form-item label="Source On Demand Start Timeout">
          <el-input v-model="form.sourceOnDemandStartTimeout" placeholder="e.g. 10s" />
        </el-form-item>
        <el-form-item label="Source On Demand Close After">
          <el-input v-model="form.sourceOnDemandCloseAfter" placeholder="e.g. 10s" />
        </el-form-item>
      </el-form>
    </el-tab-pane>

    <el-tab-pane label="Authentication" name="auth">
      <el-form label-width="170px">
        <el-form-item label="Publish User">
          <el-input
            v-model="form.publishUser"
            placeholder="Leave empty to allow anyone to publish"
          />
        </el-form-item>
        <el-form-item label="Publish Password">
          <el-input v-model="form.publishPass" type="password" show-password />
        </el-form-item>
        <el-form-item label="Read User">
          <el-input v-model="form.readUser" placeholder="Leave empty to allow anyone to read" />
        </el-form-item>
        <el-form-item label="Read Password">
          <el-input v-model="form.readPass" type="password" show-password />
        </el-form-item>
        <el-form-item label="Publish IPs">
          <el-input
            v-model="publishIPsText"
            placeholder="Comma-separated IPs, e.g. 192.168.1.0/24, 203.0.113.5"
          />
          <span class="form-hint">Restrict which IPs may publish. Leave empty to allow all.</span>
        </el-form-item>
        <el-form-item label="Read IPs">
          <el-input v-model="readIPsText" placeholder="Comma-separated IPs, e.g. 192.168.1.0/24" />
          <span class="form-hint">Restrict which IPs may read. Leave empty to allow all.</span>
        </el-form-item>
        <el-form-item label="Override Publish">
          <el-select v-model="form.overridePublish" style="width: 100%">
            <el-option label="Default (None)" value="none" />
            <el-option label="Allow" value="allow" />
            <el-option label="Deny" value="deny" />
          </el-select>
          <span class="form-hint">Overrides the global publish permission for this path</span>
        </el-form-item>
      </el-form>
    </el-tab-pane>

    <el-tab-pane label="Recording" name="record">
      <el-form label-width="170px">
        <el-form-item label="Enable Recording">
          <el-switch v-model="form.record" />
        </el-form-item>
        <template v-if="form.record">
          <el-form-item label="Recording Path">
            <el-input
              v-model="form.recordPath"
              placeholder="Leave empty to use the global default"
            />
          </el-form-item>
          <el-form-item label="Recording Format">
            <el-select v-model="form.recordFormat" style="width: 100%">
              <el-option label="FMP4" value="fmp4" />
              <el-option label="MPEGTS" value="mpegts" />
            </el-select>
          </el-form-item>
          <el-form-item label="Record Segment Duration">
            <el-input v-model="form.recordSegmentDuration" placeholder="e.g. 6s" />
          </el-form-item>
          <el-form-item label="Record Part Duration">
            <el-input v-model="form.recordPartDuration" placeholder="e.g. 1s" />
          </el-form-item>
          <el-form-item label="Record Delete After">
            <el-input
              v-model="form.recordDeleteAfter"
              placeholder="e.g. 24h (empty = never delete)"
            />
            <span class="form-hint">Automatically delete recordings older than this duration</span>
          </el-form-item>
        </template>
      </el-form>
    </el-tab-pane>

    <el-tab-pane label="Hooks" name="hooks">
      <el-form label-width="170px">
        <el-form-item label="Run on Init">
          <el-input
            v-model="form.runOnInit"
            type="textarea"
            :rows="2"
            placeholder="Shell command to run on server startup"
          />
        </el-form-item>
        <el-form-item label="Restart on Exit">
          <el-switch v-model="form.runOnInitRestart" />
          <span class="form-hint">Restart the hook if it exits with a non-zero code</span>
        </el-form-item>
        <el-form-item label="Run on Ready">
          <el-input
            v-model="form.runOnReady"
            type="textarea"
            :rows="2"
            placeholder="Shell command to run when the stream becomes ready"
          />
          <span class="form-hint"
            >Runs with the MediaMTX server's OS privileges — only use trusted commands</span
          >
        </el-form-item>
        <el-form-item label="Restart on Ready Hook Exit">
          <el-switch v-model="form.runOnReadyRestart" />
        </el-form-item>
        <el-form-item label="Run on Not Ready">
          <el-input
            v-model="form.runOnNotReady"
            type="textarea"
            :rows="2"
            placeholder="Shell command to run when the stream goes down"
          />
        </el-form-item>
        <el-form-item label="Run on Read">
          <el-input
            v-model="form.runOnRead"
            type="textarea"
            :rows="2"
            placeholder="Shell command to run when a reader starts"
          />
        </el-form-item>
        <el-form-item label="Restart on Read Hook Exit">
          <el-switch v-model="form.runOnReadRestart" />
        </el-form-item>
        <el-form-item label="Run on Unread">
          <el-input
            v-model="form.runOnUnread"
            type="textarea"
            :rows="2"
            placeholder="Shell command to run when the last reader disconnects"
          />
        </el-form-item>
        <el-form-item label="Run on Segment Created">
          <el-input
            v-model="form.runOnRecordSegmentCreate"
            type="textarea"
            :rows="2"
            placeholder="Shell command to run when a recording segment is created"
          />
        </el-form-item>
        <el-form-item label="Run on Segment Complete">
          <el-input
            v-model="form.runOnRecordSegmentComplete"
            type="textarea"
            :rows="2"
            placeholder="Shell command to run when a recording segment is completed"
          />
        </el-form-item>
      </el-form>
    </el-tab-pane>

    <el-tab-pane label="On Demand" name="demand">
      <el-form label-width="170px">
        <el-form-item label="Run on Demand">
          <el-input
            v-model="form.runOnDemand"
            type="textarea"
            :rows="2"
            placeholder="Shell command to run when a reader requests this path"
          />
          <span class="form-hint"
            >Runs with the MediaMTX server's OS privileges — only use trusted commands</span
          >
        </el-form-item>
        <el-form-item label="Restart on Demand Hook Exit">
          <el-switch v-model="form.runOnDemandRestart" />
        </el-form-item>
        <el-form-item label="On Demand Start Timeout">
          <el-input v-model="form.runOnDemandStartTimeout" placeholder="e.g. 10s" />
        </el-form-item>
        <el-form-item label="On Demand Close After">
          <el-input v-model="form.runOnDemandCloseAfter" placeholder="e.g. 10s" />
        </el-form-item>
        <el-form-item label="Run on UnDemand">
          <el-input
            v-model="form.runOnUnDemand"
            type="textarea"
            :rows="2"
            placeholder="Shell command to run when the last on-demand reader disconnects"
          />
        </el-form-item>
      </el-form>
    </el-tab-pane>

    <el-tab-pane label="Raw JSON" name="json">
      <el-form label-width="170px">
        <el-form-item label="Config JSON">
          <el-input
            v-model="jsonText"
            type="textarea"
            :rows="14"
            class="json-editor"
            spellcheck="false"
          />
          <span class="form-hint"
            >Edit the raw path configuration. Validate before applying — invalid JSON is
            rejected.</span
          >
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="applyJson">Validate &amp; Apply</el-button>
          <el-button @click="resetJson">Reset</el-button>
        </el-form-item>
      </el-form>
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
// The controlled-form contract (see comment at the top of the file) also
// covers the script block, where the computed setters mutate `props.form`.
/* eslint-disable vue/no-mutating-props */
import { ref, computed, watch } from 'vue'
import { toast } from '@/composables/useToast'
import { fillPathConfForm, type PathConfForm } from '@/composables/usePathConfForm'

const props = defineProps<{
  form: PathConfForm
  showName?: boolean
  nameDisabled?: boolean
}>()

const activeTab = ref('source')

// publishIPs / readIPs are arrays in the API config; the form edits them as
// comma-separated text.
const publishIPsText = computed({
  get: () => (props.form.publishIPs || []).join(', '),
  set: (v: string) => {
    props.form.publishIPs = v
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }
})

const readIPsText = computed({
  get: () => (props.form.readIPs || []).join(', '),
  set: (v: string) => {
    props.form.readIPs = v
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }
})

// Raw JSON tab — a snapshot of the form serialized for editing, kept in sync
// whenever the tab becomes active so edits from other tabs are preserved.
const jsonText = ref('')
const syncJson = () => {
  jsonText.value = JSON.stringify(props.form, null, 2)
}
watch(activeTab, tab => {
  if (tab === 'json') syncJson()
})

const applyJson = () => {
  try {
    const parsed = JSON.parse(jsonText.value)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      toast.error('Config must be a JSON object')
      return
    }
    fillPathConfForm(props.form, parsed)
    toast.success('Raw config applied to form')
  } catch {
    toast.error('Invalid JSON — fix the errors and try again')
  }
}

const resetJson = () => {
  syncJson()
}
</script>

<style scoped>
.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.json-editor :deep(.el-textarea__inner) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
}
</style>
