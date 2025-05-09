<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import type { Device } from '../types/device'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const loading = ref(true)
const devices = ref<Device[]>([])
const searchQuery = ref('')
const statusFilter = ref<'online' | 'offline' | 'warning' | ''>('')
const groupFilter = ref<'Production' | 'Testing' | 'Development' | ''>('')

onMounted(async () => {
  try {
    await fetchDevices()
  } catch (error) {
    console.error('加载设备列表失败:', error)
  } finally {
    loading.value = false
  }
})

const fetchDevices = async () => {
  try {
    loading.value = true
    const data = await api.getDevices()
    devices.value = data
  } catch (error) {
    console.error('加载设备列表失败:', error)
    ElMessage.error('加载设备列表失败')
  } finally {
    loading.value = false
  }
}

const handleRefresh = () => {
  fetchDevices()
}

const filteredDevices = computed(() => {
  return devices.value.filter(device => {
    // 搜索过滤
    if (searchQuery.value && !device.name.toLowerCase().includes(searchQuery.value.toLowerCase()) && 
        !device.ip.includes(searchQuery.value)) {
      return false
    }
    
    // 状态过滤
    if (statusFilter.value && device.status !== statusFilter.value) {
      return false
    }
    
    // 分组过滤
    if (groupFilter.value && device.group !== groupFilter.value) {
      return false
    }
    
    return true
  })
})

const viewDeviceDetails = (id: string) => {
  router.push(`/devices/${id}`)
}

const getStatusTag = (status: 'online' | 'offline' | 'warning') => {
  switch(status) {
    case 'online':
      return { type: 'success', label: '在线' }
    case 'offline':
      return { type: 'danger', label: '离线' }
    case 'warning':
      return { type: 'warning', label: '警告' }
    default:
      return { type: 'info', label: status }
  }
}

const getStatusClass = (value: number) => {
  if (value < 60) return 'normal'
  if (value < 80) return 'warning'
  return 'critical'
}

// 设备重启
const handleRestart = async (device: Device, event: Event) => {
  event.stopPropagation() // 阻止事件冒泡，避免触发行点击
  try {
    await ElMessageBox.confirm(
      `确定要重启设备 "${device.name}" 吗？`,
      '重启确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await api.restartDevice(device.id)
    ElMessage.success('重启指令已发送')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('设备重启失败:', error)
      ElMessage.error('设备重启失败')
    }
  }
}

// 配置弹窗控制
const configDialogVisible = ref(false)
const currentDevice = ref<Device | null>(null)
const configForm = ref({
  name: '',
  group: '',
  // 可以根据实际需求添加更多配置项
})

// 打开配置弹窗
const openConfigDialog = (device: Device, event: Event) => {
  event.stopPropagation()
  currentDevice.value = device
  configForm.value = {
    name: device.name,
    group: device.group
  }
  configDialogVisible.value = true
}

// 提交配置更新
const handleConfigSubmit = async () => {
  if (!currentDevice.value) return
  
  try {
    await api.updateDeviceConfig(currentDevice.value.id, configForm.value)
    ElMessage.success('配置已更新')
    configDialogVisible.value = false
    // 刷新设备列表
    await fetchDevices()
  } catch (error) {
    console.error('配置更新失败:', error)
    ElMessage.error('配置更新失败')
  }
}
</script>

<template>
  <div class="devices-container">
    <div class="devices-header">
      <h2>设备管理</h2>
      <div class="actions">
        <el-button type="primary" @click="handleRefresh" :loading="loading">
          <i class="el-icon-refresh"></i> 刷新
        </el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="filter-card">
      <div class="filter-container">
        <el-input
          v-model="searchQuery"
          placeholder="搜索设备名称或IP"
          prefix-icon="el-icon-search"
          clearable
          class="search-input"
        />
        
        <el-select
          v-model="statusFilter"
          placeholder="状态"
          clearable
          class="filter-select"
        >
          <el-option label="在线" value="online" />
          <el-option label="离线" value="offline" />
          <el-option label="警告" value="warning" />
        </el-select>
        
        <el-select
          v-model="groupFilter"
          placeholder="分组"
          clearable
          class="filter-select"
        >
          <el-option label="生产环境" value="Production" />
          <el-option label="测试环境" value="Testing" />
          <el-option label="开发环境" value="Development" />
        </el-select>
      </div>
    </el-card>
    
    <el-card shadow="hover" class="mt-24">
      <el-table
        :data="filteredDevices"
        border
        style="width: 100%"
        v-loading="loading"
        @row-click="(row: Device) => viewDeviceDetails(row.id)"
      >
        <el-table-column prop="name" label="设备名称" min-width="180" />
        
        <el-table-column prop="ip" label="IP地址" width="150" />
        
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }: { row: Device }">
            <el-tag :type="getStatusTag(row.status).type" size="small">
              {{ getStatusTag(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="cpu" label="CPU" width="120">
          <template #default="{ row }: { row: Device }">
            <div :class="['status-indicator', getStatusClass(row.cpu)]">
              {{ row.cpu }}%
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="memory" label="内存" width="120">
          <template #default="{ row }: { row: Device }">
            <div :class="['status-indicator', getStatusClass(row.memory)]">
              {{ row.memory }}%
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="disk" label="磁盘" width="120">
          <template #default="scope">
            <el-progress 
              :percentage="scope.row.disk" 
              :status="getStatusClass(scope.row.disk)"
            />
          </template>
        </el-table-column>
        
        <el-table-column prop="group" label="分组" width="150">
          <template #default="scope">
            {{ 
              scope.row.group === 'Production' ? '生产环境' :
              scope.row.group === 'Testing' ? '测试环境' :
              scope.row.group === 'Development' ? '开发环境' :
              scope.row.group 
            }}
          </template>
        </el-table-column>
        
        <el-table-column prop="lastSeen" label="最后在线" width="180" />
        
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }: { row: Device }">
            <el-button 
              type="text" 
              size="small"
              @click.stop="viewDeviceDetails(row.id)"
            >
              详情
            </el-button>
            <el-button 
              type="text" 
              size="small"
              :disabled="row.status === 'offline'"
              @click="openConfigDialog(row, $event)"
            >
              配置
            </el-button>
            <el-button 
              type="text" 
              size="small"
              :disabled="row.status === 'offline'"
              @click="handleRestart(row, $event)"
            >
              重启
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="table-footer">
        <div class="total-devices">
          总计: {{ filteredDevices.length }} 台设备
        </div>
      </div>
    </el-card>
    
    <!-- 配置弹窗 -->
    <el-dialog
      v-model="configDialogVisible"
      title="设备配置"
      width="500px"
    >
      <el-form :model="configForm" label-width="100px">
        <el-form-item label="设备名称">
          <el-input v-model="configForm.name" />
        </el-form-item>
        <el-form-item label="设备分组">
          <el-select v-model="configForm.group" style="width: 100%">
            <el-option label="生产环境" value="Production" />
            <el-option label="测试环境" value="Testing" />
            <el-option label="开发环境" value="Development" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="configDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleConfigSubmit">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.devices-container {
  padding: 24px;
}

.devices-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.devices-header h2 {
  margin: 0;
  font-size: 20px;
  color: rgba(0, 0, 0, 0.85);
}

.filter-card {
  margin-bottom: 24px;
}

.filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.search-input {
  width: 300px;
}

.filter-select {
  width: 200px;
}

.mt-24 {
  margin-top: 24px;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding: 0 8px;
}

.total-devices {
  color: rgba(0, 0, 0, 0.45);
}

@media (max-width: 768px) {
  .filter-container {
    flex-direction: column;
  }
  
  .search-input,
  .filter-select {
    width: 100%;
  }
}

.el-button + .el-button {
  margin-left: 8px;
}

.dialog-footer {
  text-align: right;
}
</style>