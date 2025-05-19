<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import type { Device } from '../types/device'
import { ElMessage, ElMessageBox } from 'element-plus'
import CryptoJS from 'crypto-js'

const router = useRouter()
const loading = ref(true)
const devices = ref<Device[]>([])
const searchQuery = ref('')
const statusFilter = ref<'online' | 'offline' | 'warning' | ''>('')
const groupFilter = ref<'Production' | 'Testing' | 'Development' | ''>('')

// 添加分页相关数据
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

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
    
    // 构建查询参数
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      status: statusFilter.value,
      group: groupFilter.value,
      keyword: searchQuery.value
    }
    
    console.log('发送查询参数:', params);
    
    // 调用API获取设备列表
    const response = await api.getDevices(params)
    
    console.log('获取到的设备列表响应:', response);
    
    // 检查响应结构
    if (!response || !response.devices) {
      console.error('设备列表响应结构异常:', response);
      ElMessage.error('设备列表数据格式异常');
      return;
    }
    
    // 更新设备列表和分页信息
    devices.value = response.devices;
    pagination.value.total = response.total;
  } catch (error) {
    console.error('加载设备列表失败:', error)
    ElMessage.error('加载设备列表失败')
  } finally {
    loading.value = false
  }
}

// 页码变化处理
const handlePageChange = (page: number) => {
  pagination.value.page = page
  fetchDevices()
}

// 每页条数变化处理
const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.page = 1
  fetchDevices()
}

// 筛选条件变化处理
const handleFilterChange = () => {
  pagination.value.page = 1
  fetchDevices()
}

const handleRefresh = () => {
  fetchDevices()
}

const viewDeviceDetails = (id: number) => {
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
  cpu: 0,
  memory: 0,
  bandwidth: 0,
  environment: ''
})

const configRules = {
  name: [
    { required: true, message: '请输入设备名称', trigger: 'blur' }
  ],
  cpu: [
    { required: true, type: 'number', min: 1, message: '请输入有效的CPU核心数', trigger: 'blur' }
  ],
  memory: [
    { required: true, type: 'number', min: 1, message: '请输入有效的内存大小', trigger: 'blur' }
  ],
  bandwidth: [
    { required: true, type: 'number', min: 1, message: '请输入有效的带宽大小', trigger: 'blur' }
  ],
  environment: [
    { required: true, message: '请选择运行环境', trigger: 'change' }
  ]
}

const configFormRef = ref()

const handleConfigSubmit = async () => {
  if (!currentDevice.value || !configFormRef.value) return
  
  try {
    // 表单验证
    await configFormRef.value.validate()
    
    // 确保数值类型正确
    const config = {
      ...configForm.value,
      cpu: Number(configForm.value.cpu),
      memory: Number(configForm.value.memory),
      bandwidth: Number(configForm.value.bandwidth)
    }
    
    await api.updateDeviceConfig(currentDevice.value.id, config)
    ElMessage.success('配置已更新')
    configDialogVisible.value = false
    await fetchDevices()
  } catch (error: any) {
    if (error.message) {
      console.error('配置更新失败:', error)
      ElMessage.error(`配置更新失败: ${error.message}`)
    }
  }
}

// 打开配置弹窗
const openConfigDialog = (device: Device, event: Event) => {
  event.stopPropagation()
  currentDevice.value = device
  configForm.value = {
    name: device.name || '',
    group: device.group || '',
    cpu: Number(device.cpu) || 0,
    memory: Number(device.memory) || 0,
    bandwidth: Number(device.bandwidth) || 0,
    environment: device.environment || ''
  }
  configDialogVisible.value = true
}

// 新增设备相关
const addDeviceDialogVisible = ref(false)
const addDeviceFormRef = ref()
const addDeviceForm = ref({
  ip: '',
  name: '',
  username: '',
  password: '',
  cpu: 1,
  memory: 1,
  bandwidth: 100,
  environment: '',
  config: '{}'
})

// 表单验证规则
const addDeviceRules = {
  ip: [
    { required: true, message: '请输入服务器IP', trigger: 'blur' },
    { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: '请输入正确的IP地址', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入设备名称', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ],
  environment: [
    { required: true, message: '请选择运行环境', trigger: 'change' }
  ],
  config: [
    { 
      validator: (rule: any, value: string) => {
        try {
          if (value) {
            JSON.parse(value)
          }
          return Promise.resolve()
        } catch (error) {
          return Promise.reject('请输入有效的JSON格式')
        }
      },
      trigger: 'blur'
    }
  ]
}

// 打开新增设备弹窗
const openAddDeviceDialog = () => {
  addDeviceDialogVisible.value = true
  addDeviceForm.value = {
    ip: '',
    name: '',
    username: '',
    password: '',
    cpu: 1,
    memory: 1,
    bandwidth: 100,
    environment: '',
    config: '{}'
  }
}

// 提交新增设备
const handleAddDeviceSubmit = async () => {
  if (!addDeviceFormRef.value) return
  
  try {
    await addDeviceFormRef.value.validate()
    
    //密码加密
    const encryptedPassword = CryptoJS.MD5(addDeviceForm.value.password).toString()
    addDeviceForm.value.password = encryptedPassword
    // 调用API添加设备
    await api.addDevice({
      ...addDeviceForm.value,
      config: JSON.parse(addDeviceForm.value.config)
    })
    
    ElMessage.success('设备添加成功')
    addDeviceDialogVisible.value = false
    
    // 刷新设备列表
    await fetchDevices()
  } catch (error) {
    console.error('添加设备失败:', error)
    ElMessage.error('添加设备失败')
  }
}
</script>

<template>
  <div class="devices-container">
    <div class="devices-header">
      <h2>设备管理</h2>
      <div class="actions">
        <el-button type="primary" @click="openAddDeviceDialog">
          <i class="el-icon-plus"></i> 新增设备
        </el-button>
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
          @clear="handleFilterChange"
          @input="handleFilterChange"
        />
        
        <el-select
          v-model="statusFilter"
          placeholder="状态"
          clearable
          class="filter-select"
          @change="handleFilterChange"
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
          @change="handleFilterChange"
        >
          <el-option label="生产环境" value="Production" />
          <el-option label="测试环境" value="Testing" />
          <el-option label="开发环境" value="Development" />
        </el-select>
      </div>
    </el-card>
    
    <el-card shadow="hover" class="mt-24">
      <el-table
        :data="devices"
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
          总计: {{ pagination.total }} 台设备
        </div>
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
    
    <!-- 配置弹窗 -->
    <el-dialog
      v-model="configDialogVisible"
      title="设备配置"
      width="600px"
    >
      <el-form 
        :model="configForm" 
        :rules="configRules"
        ref="configFormRef"
        label-width="120px"
      >
        <el-form-item label="设备名称" required>
          <el-input v-model="configForm.name" placeholder="请输入设备名称"/>
        </el-form-item>
        
        <el-form-item label="CPU(核)" required>
          <el-input-number 
            v-model="configForm.cpu" 
            :min="1" 
            :max="128"
            :precision="0"
            :step="1"
            placeholder="请输入CPU核心数"
          />
        </el-form-item>
        
        <el-form-item label="内存(GB)" required>
          <el-input-number 
            v-model="configForm.memory" 
            :min="1" 
            :max="1024"
            :precision="0"
            :step="1"
            placeholder="请输入内存大小"
          />
        </el-form-item>
        
        <el-form-item label="带宽(Mbps)" required>
          <el-input-number 
            v-model="configForm.bandwidth" 
            :min="1" 
            :max="10000"
            :precision="0"
            :step="1"
            placeholder="请输入带宽大小"
          />
        </el-form-item>
        
        <el-form-item label="运行环境" required>
          <el-select v-model="configForm.environment" style="width: 100%">
            <el-option label="生产环境" value="Production" />
            <el-option label="测试环境" value="Testing" />
            <el-option label="开发环境" value="Development" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="configDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleConfigSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新增设备弹窗 -->
    <el-dialog
      v-model="addDeviceDialogVisible"
      title="新增设备"
      width="600px"
    >
      <el-form :model="addDeviceForm" :rules="addDeviceRules" ref="addDeviceFormRef" label-width="120px">
        <el-form-item label="服务器IP" prop="ip" required>
          <el-input v-model="addDeviceForm.ip" placeholder="请输入服务器IP"/>
        </el-form-item>
        
        <el-form-item label="设备名称" prop="name" required>
          <el-input v-model="addDeviceForm.name" placeholder="请输入设备名称"/>
        </el-form-item>
        
        <el-form-item label="用户名" prop="username" required>
          <el-input v-model="addDeviceForm.username" placeholder="请输入设备用户名"/>
        </el-form-item>
        
        <el-form-item label="密码" prop="password" required>
          <el-input 
            v-model="addDeviceForm.password" 
            type="password"
            placeholder="请输入设备密码"
          />
        </el-form-item>
        
        <el-form-item label="CPU限制(核)" prop="cpu" required>
          <el-input-number 
            v-model="addDeviceForm.cpu" 
            :min="1" 
            :max="128"
            placeholder="请输入CPU核心数"
          />
        </el-form-item>
        
        <el-form-item label="内存限制(GB)" prop="memory" required>
          <el-input-number 
            v-model="addDeviceForm.memory" 
            :min="1" 
            :max="1024"
            placeholder="请输入内存大小"
          />
        </el-form-item>
        
        <el-form-item label="带宽(Mbps)" prop="bandwidth" required>
          <el-input-number 
            v-model="addDeviceForm.bandwidth" 
            :min="1" 
            :max="10000"
            placeholder="请输入带宽大小"
          />
        </el-form-item>
        
        <el-form-item label="运行环境" prop="environment" required>
          <el-select v-model="addDeviceForm.environment" style="width: 100%">
            <el-option label="生产环境" value="Production" />
            <el-option label="测试环境" value="Testing" />
            <el-option label="开发环境" value="Development" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="设备配置" prop="config">
          <el-input
            type="textarea"
            v-model="addDeviceForm.config"
            :rows="4"
            placeholder="请输入JSON格式的设备配置"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDeviceDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAddDeviceSubmit">确定</el-button>
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