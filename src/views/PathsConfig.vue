<template>
  <div>
    <div class="page-header">
      <h1>Path Config</h1>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="showAddDialog">Add Path</el-button>
        <el-button :icon="Refresh" @click="loadData" :loading="store.loading">Refresh</el-button>
      </div>
    </div>

    <el-card shadow="hover">
      <el-table :data="store.list" v-loading="store.loading" style="width: 100%">
        <el-table-column prop="name" label="Path Name" min-width="200" show-overflow-tooltip />
        <el-table-column label="Source" min-width="250">
          <template #default="{ row }">
            <span>{{ row.source || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="150" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showEditDialog(row)">Edit</el-button>
            <el-popconfirm title="Delete this path config?" @confirm="handleDelete(row.name)">
              <template #reference>
                <el-button text type="danger" size="small">Delete</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!store.loading && store.list.length === 0" description="No path configs" />
    </el-card>

    <!-- Add/Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? 'Edit Path Config' : 'Add Path Config'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="Path Name" required>
          <el-input v-model="form.name" :disabled="isEdit" placeholder="e.g. mystream" />
        </el-form-item>
        <el-form-item label="Source">
          <el-input v-model="form.source" placeholder="e.g. rtsp://..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleSave">Save</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { usePathsConfigStore } from '@/stores/pathsConfig'
import { ElMessage } from 'element-plus'
import { Refresh, Plus } from '@element-plus/icons-vue'

const store = usePathsConfigStore()
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = reactive({ name: '', source: '' })

const showAddDialog = () => {
  isEdit.value = false
  form.name = ''
  form.source = ''
  dialogVisible.value = true
}

const showEditDialog = (row: any) => {
  isEdit.value = true
  form.name = row.name
  form.source = row.source || ''
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.name) {
    ElMessage.warning('Please enter a path name')
    return
  }
  try {
    const data: any = {}
    if (form.source) data.source = form.source
    if (isEdit.value) {
      await store.patch(form.name, data)
    } else {
      await store.add(form.name, data)
    }
    ElMessage.success('Saved successfully')
    dialogVisible.value = false
  } catch {
    ElMessage.error('Failed to save')
  }
}

const handleDelete = async (name: string) => {
  try {
    await store.remove(name)
    ElMessage.success('Deleted')
  } catch {
    ElMessage.error('Failed to delete')
  }
}

const loadData = () => store.fetchList()
onMounted(loadData)
</script>
