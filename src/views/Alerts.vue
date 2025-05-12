<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import api from '../api'
import type { Alert } from '../types/alert'
import { ElMessage, ElMessageBox } from 'element-plus'

const alerts = ref<Alert[]>([])
const loading = ref(true)
const selectedStatus = ref('all')

// 过滤器
const searchQuery = ref('')
const levelFilter = ref('')

const fetchAlerts = async () => {
  try {
    loading.value = true
    const data = await api.getAlerts()
    alerts.value = data
  } catch (error) {
    console.error('获取告警列表失败:', error)
    ElMessage.error('加载告警列表失败')
  } finally {
    loading.value = false
  }
}

const filteredAlerts = computed(() => {
  return alerts.value.filter(alert => {
    // 搜索过滤
    if (searchQuery.value && !alert.deviceName.toLowerCase().includes(searchQuery.value.toLowerCase()) &&
        !alert.message.toLowerCase().includes(searchQuery.value.toLowerCase())) {
      return false
    }
    
    // 级别过滤
    if (levelFilter.value && alert.level !== levelFilter.value) {
      return false
    }
    
    // 状态过滤
    if (selectedStatus.value === 'acknowledged' && !alert.acknowledged) {
      return false
    }
    if (selectedStatus.value === 'unacknowledged' && alert.acknowledged) {
      return false
    }
    
    return true
  })
})

const acknowledgeAlert = async (alertId: number) => {
  try {
    await api.acknowledgeAlert(alertId)
    const alertIndex = alerts.value.findIndex(a => a.id === alertId)
    if (alertIndex !== -1) {
      alerts.value[alertIndex].acknowledged = true
      ElMessage.success('告警已确认')
    }
  } catch (error) {
    console.error('确认告警失败:', error)
    ElMessage.error('确认告警失败')
  }
}

const processAlert = async (alert: Alert) => {
  try {
    const { value: remark } = await ElMessageBox.prompt('请输入处理备注', '处理告警', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '请输入处理说明（选填）',
      inputValidator: (value) => {
        if (value.length > 200) {
          return '备注不能超过200个字符'
        }
        return true
      }
    })

    await api.processAlert(alert.id, {
      status: 'processed',
      remark: remark || undefined
    })

    // 更新本地数据
    const alertIndex = alerts.value.findIndex(a => a.id === alert.id)
    if (alertIndex !== -1) {
      alerts.value[alertIndex].status = 'processed'
      alerts.value[alertIndex].remark = remark
      ElMessage.success('告警已处理')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('处理告警失败:', error)
      ElMessage.error('处理告警失败')
    }
  }
}

const handleRefresh = () => {
  fetchAlerts()
}

const getLevelType = (level: string) => {
  switch (level) {
    case 'critical':
      return 'danger'
    case 'error':
      return 'danger'
    case 'warning':
      return 'warning'
    default:
      return 'info'
  }
}

const getLevelLabel = (level: string) => {
  switch (level) {
    case 'critical':
      return '严重'
    case 'error':
      return '错误'
    case 'warning':
      return '警告'
    case 'info':
      return '信息'
    default:
      return level
  }
}

const getAlertType = (type: string) => {
  switch (type) {
    case 'cpu':
      return 'CPU'
    case 'memory':
      return '内存'
    case 'disk':
      return '磁盘'
    case 'temperature':
      return '温度'
    case 'offline':
      return '离线'
    case 'network':
      return '网络'
    default:
      return type
  }
}

const getStatusType = (status: string) => {
  switch (status) {
    case 'processed':
      return 'success'
    case 'processing':
      return 'warning'
    default:
      return 'info'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'processed':
      return '已处理'
    case 'processing':
      return '处理中'
    default:
      return '未处理'
  }
}

onMounted(() => {
  fetchAlerts()
})
</script>

<template>
  <div class="alerts-container">
    <!-- 头部 -->
    <div class="alerts-header">
      <div class="header-left">
        <h2 class="title">告警中心</h2>
        <el-button type="primary" :icon="Refresh" @click="handleRefresh" :loading="loading">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 过滤器 -->
    <el-card class="filter-card" shadow="hover">
      <div class="filter-container">
        <el-input
          v-model="searchQuery"
          placeholder="搜索设备或告警信息"
          prefix-icon="el-icon-search"
          clearable
          class="search-input"
        />
        
        <el-select
          v-model="levelFilter"
          placeholder="告警级别"
          clearable
          class="filter-select"
        >
          <el-option label="严重" value="critical" />
          <el-option label="错误" value="error" />
          <el-option label="警告" value="warning" />
          <el-option label="信息" value="info" />
        </el-select>
        
        <el-radio-group v-model="selectedStatus" class="status-filter">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="unacknowledged">未确认</el-radio-button>
          <el-radio-button label="acknowledged">已确认</el-radio-button>
        </el-radio-group>
      </div>
    </el-card>

    <!-- 告警表格 -->
    <el-card shadow="hover" class="alerts-table">
      <el-table
        :data="filteredAlerts"
        style="width: 100%"
        v-loading="loading"
        border
      >
        <el-table-column prop="timestamp" label="时间" width="180" sortable />
        
        <el-table-column prop="deviceName" label="设备" width="180">
          <template #default="{ row }">
            <router-link :to="`/devices/${row.deviceId}`" class="device-link">
              {{ row.deviceName }}
            </router-link>
          </template>
        </el-table-column>
        
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getAlertType(row.type) }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="level" label="级别" width="120">
          <template #default="{ row }">
            <el-tag
              :type="getLevelType(row.level)"
              size="small"
              effect="dark"
            >
              {{ getLevelLabel(row.level) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="message" label="告警信息" min-width="300" />
        
        <el-table-column prop="acknowledged" label="状态" width="120">
          <template #default="{ row }">
            <el-tag
              :type="row.acknowledged ? 'success' : 'warning'"
              size="small"
            >
              {{ row.acknowledged ? '已确认' : '未确认' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="处理状态" width="120">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.remark"
              :content="row.remark"
              placement="top"
              effect="light"
            >
              <el-tag
                :type="getStatusType(row.status)"
                size="small"
              >
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </el-tooltip>
            <el-tag
              v-else
              :type="getStatusType(row.status)"
              size="small"
            >
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="operation-buttons">
              <el-button
                v-if="!row.acknowledged"
                type="primary"
                size="small"
                @click="acknowledgeAlert(row.id)"
              >
                确认
              </el-button>
              <el-button
                v-if="row.status !== 'processed'"
                type="success"
                size="small"
                @click="processAlert(row)"
              >
                处理
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <div class="total-alerts">
          总计: {{ filteredAlerts.length }} 条告警
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.alerts-container {
  padding: 24px;
}

.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title {
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
  align-items: center;
}

.search-input {
  width: 300px;
}

.filter-select {
  width: 200px;
}

.status-filter {
  margin-left: auto;
}

.alerts-table {
  margin-top: 24px;
}

.device-link {
  color: #1890ff;
  text-decoration: none;
}

.device-link:hover {
  color: #40a9ff;
  text-decoration: underline;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding: 0 8px;
}

.total-alerts {
  color: rgba(0, 0, 0, 0.45);
}

.operation-buttons {
  display: flex;
  gap: 8px;
}

:deep(.el-tooltip__trigger) {
  display: inline-flex;
}

@media (max-width: 768px) {
  .alerts-container {
    padding: 16px;
  }

  .filter-container {
    flex-direction: column;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }

  .status-filter {
    margin-left: 0;
    width: 100%;
    display: flex;
    justify-content: space-between;
  }
}
</style>