<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import api from '../api'
import { ElMessage } from 'element-plus'
import type { DeviceDetail } from '../types/device'
import { WebSocketService } from '../utils/websocket/service'
import type { WebSocketMessage } from '../utils/websocket/types'

const route = useRoute()
const router = useRouter()
const deviceId = Number(route.params.id)
const device = ref<DeviceDetail | null>(null)
const loading = ref(true)

// 图表实例
let cpuChart: echarts.ECharts | null = null
let memoryChart: echarts.ECharts | null = null
let networkChart: echarts.ECharts | null = null

// WebSocket 实时更新
// 从环境变量读取 WebSocket 基础 URL
const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://127.0.0.1:8083/ws';
const wsUrl = `${wsBaseUrl}/device/${deviceId}`;

let ws: WebSocketService | null = null;
let unsubscribe: (() => void) | null = null;

// 添加数值格式化函数
const formatValue = (value: number) => {
  return Number(value.toFixed(2))
}

// 添加处理网络数据的函数
const parseNetworkData = (device: DeviceDetail | null) => {
  if (!device) return;
  
  // 检查 network 是否为字符串，如果是则解析
  if (typeof device.network === 'string') {
    try {
      const networkData = JSON.parse(device.network);
      device.networkIo = [networkData.in || 0, networkData.out || 0];
    } catch (error) {
      console.error('解析网络数据失败:', error);
      device.networkIo = [0, 0]; // 设置默认值
    }
  } else if (!device.networkIo) {
    // 如果 networkIo 不存在，创建默认值
    device.networkIo = [0, 0];
  }
}

// 添加处理任务数据的函数
const parseTasks = (device: DeviceDetail | null) => {
  if (!device) return;
  
  // 检查 tasks 是否为字符串，如果是则解析
  if (typeof device.tasks === 'string') {
    try {
      device.parsedTasks = JSON.parse(device.tasks);
    } catch (error) {
      console.error('解析任务数据失败:', error);
      device.parsedTasks = []; // 设置默认值
    }
  } else if (!device.parsedTasks) {
    // 如果 parsedTasks 不存在，创建默认空数组
    device.parsedTasks = [];
  }
}

const fetchDeviceDetails = async () => {
  try {
    const data = await api.getDeviceDetail(deviceId)
    device.value = data
    
    // 处理网络数据
    parseNetworkData(device.value);
    
    // 处理任务数据
    parseTasks(device.value);
    
    initCharts()
  } catch (error) {
    console.error('获取设备详情失败:', error)
    ElMessage.error('加载设备详情失败')
  } finally {
    loading.value = false
  }
}

const initCharts = () => {
  if (!device.value) return

  // CPU 使用率图表
  cpuChart = echarts.init(document.getElementById('cpu-chart') as HTMLElement)
  cpuChart.setOption({
    series: [{
      type: 'gauge',
      startAngle: 90,
      endAngle: -270,
      pointer: { show: false },
      progress: {
        show: true,
        overlap: false,
        roundCap: true,
        clip: false,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#1890ff' },
              { offset: 1, color: '#096dd9' }
            ]
          }
        }
      },
      axisLine: {
        lineStyle: {
          width: 20,
          color: [[1, '#f5f5f5']]
        }
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        fontSize: 24,
        offsetCenter: [0, 0],
        formatter: function(value: number) {
          return formatValue(value) + '%'
        },
        color: 'auto'
      },
      data: [{ value: formatValue(device.value.cpu) }]
    }]
  })

  // 内存使用率图表
  memoryChart = echarts.init(document.getElementById('memory-chart') as HTMLElement)
  memoryChart.setOption({
    series: [{
      type: 'gauge',
      startAngle: 90,
      endAngle: -270,
      pointer: { show: false },
      progress: {
        show: true,
        overlap: false,
        roundCap: true,
        clip: false,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#52c41a' },
              { offset: 1, color: '#389e0d' }
            ]
          }
        }
      },
      axisLine: {
        lineStyle: {
          width: 20,
          color: [[1, '#f5f5f5']]
        }
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        fontSize: 24,
        offsetCenter: [0, 0],
        formatter: function(value: number) {
          return formatValue(value) + '%'
        },
        color: 'auto'
      },
      data: [{ value: formatValue(device.value.memory) }]
    }]
  })

  // 网络流量图表
  networkChart = echarts.init(document.getElementById('network-chart') as HTMLElement)
  
  // 确保 networkIo 存在
  const networkInValue = device.value.networkIo ? formatValue(device.value.networkIo[0]) : 0;
  const networkOutValue = device.value.networkIo ? formatValue(device.value.networkIo[1]) : 0;
  
  networkChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['入站', '出站'],
      top: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: [{
      type: 'category',
      data: ['网络吞吐量'],
      axisTick: { show: false }
    }],
    yAxis: [{
      type: 'value',
      name: 'Bytes',
      axisLabel: {
        formatter: function (value: number) {
          if (value >= 1024 * 1024 * 1024) { return (value / (1024 * 1024 * 1024)).toFixed(2) + ' GB'; }
          if (value >= 1024 * 1024) { return (value / (1024 * 1024)).toFixed(2) + ' MB'; }
          if (value >= 1024) { return (value / 1024).toFixed(2) + ' KB'; }
          return value + ' B';
        }
      }
    }],
    series: [
      {
        name: '入站',
        type: 'bar',
        data: [networkInValue]
      },
      {
        name: '出站',
        type: 'bar',
        data: [networkOutValue]
      }
    ]
  })

  // 处理窗口大小变化
  window.addEventListener('resize', handleResize)
}

const handleResize = () => {
  cpuChart?.resize()
  memoryChart?.resize()
  networkChart?.resize()
}

const updateCharts = () => {
  if (!device.value) return

  cpuChart?.setOption({
    series: [{ data: [{ value: formatValue(device.value.cpu) }] }]
  })

  memoryChart?.setOption({
    series: [{ data: [{ value: formatValue(device.value.memory) }] }]
  })

  // 确保 networkIo 存在
  if (device.value.networkIo) {
    networkChart?.setOption({
      series: [
        { data: [formatValue(device.value.networkIo[0])] },
        { data: [formatValue(device.value.networkIo[1])] }
      ]
    })
  }
}

const handleDeviceUpdate = (message: WebSocketMessage) => {
  // 验证消息类型
  if (!message || (message.type !== 'DEVICE_UPDATE' && message.type !== 'DEVICE_STATUS')) {
    return;
  }
  
  console.log('接收到消息:', message.type, '消息数据结构:', JSON.stringify(message));
  
  // 尝试从不同可能的位置获取设备ID
  const messageId = message.data?.id
  
  // 将两者都转为字符串进行比较，避免类型不匹配问题
  if (String(messageId) !== String(deviceId)) {
    console.log('跳过不相关设备的消息，期望ID:', deviceId, '收到ID:', messageId);
    return;
  }
  
  // 验证数据有效性
  if (!device.value || !message.data) {
    console.warn('设备数据或消息数据为空');
    return;
  }
  
  // 更新设备数据
  device.value = { 
    ...device.value, 
    ...message.data
  };

  console.log('更新后的设备数据:', device.value);
  // 处理网络数据
  parseNetworkData(device.value);
  
  // 处理任务数据
  parseTasks(device.value);
  
  // 更新图表
  updateCharts();
}

// 连接WebSocket的函数
const connectWebSocket = async () => {
  try {
    // 确保之前的连接已关闭
    if (ws) {
      try {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        ws.disconnect();
      } catch (err) {
        console.error('关闭之前的WebSocket连接失败:', err);
      }
    }
    
    // 创建新的WebSocket服务
    ws = new WebSocketService(wsUrl);
    
    // 先注册消息处理器，再连接
    unsubscribe = ws.onMessage(handleDeviceUpdate);
    
    // 等待连接完成
    await ws.connect();
    console.log('设备详情WebSocket连接成功:', wsUrl);
    
    // 请求设备数据
    ws.send({
      type: 'GET_DEVICE_INFO',
      data: { deviceId }
    });

    // 设置定时消息，每10秒请求一次设备数据
    ws.setPeriodicMessage({
      type: 'GET_DEVICE_INFO',
      data: { deviceId }
    }, 10000);
  } catch (error) {
    console.error('WebSocket连接失败:', error);
    ElMessage.error('实时数据连接失败，将尝试重连');
    
    // 稍后重试
    setTimeout(connectWebSocket, 3000);
  }
};

onMounted(() => {
  fetchDeviceDetails();
  connectWebSocket();
});

onUnmounted(() => {
  // 清理图表实例
  cpuChart?.dispose();
  memoryChart?.dispose();
  networkChart?.dispose();
  
  // 移除事件监听
  window.removeEventListener('resize', handleResize);
  
  // 断开WebSocket连接
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  
  if (ws) {
    try {
      ws.disconnect();
      ws = null;
    } catch (error) {
      console.error('断开WebSocket连接失败:', error);
    }
  }
});

const getStatusType = (status: string) => {
  switch (status) {
    case 'online':
      return 'success'
    case 'offline':
      return 'danger'
    case 'warning':
      return 'warning'
    default:
      return 'info'
  }
}

const getTaskStatusType = (status: string) => {
  switch (status) {
    case 'running':
      return 'success'
    case 'paused':
      return 'warning'
    case 'stopped':
      return 'danger'
    default:
      return 'info'
  }
}

const getTaskStatusLabel = (status: string) => {
  switch (status) {
    case 'running':
      return '运行中'
    case 'paused':
      return '已暂停'
    case 'stopped':
      return '已停止'
    default:
      return status
  }
}

const getDeviceStatus = (status: string) => {
  switch (status) {
    case 'online':
      return '在线'
    case 'offline':
      return '离线'
    case 'warning':
      return '警告'
    default:
      return status
  }
}

const getGroupLabel = (group: string) => {
  switch (group) {
    case 'Production':
      return '生产环境'
    case 'Testing':
      return '测试环境'
    case 'Development':
      return '开发环境'
    default:
      return group
  }
}
</script>

<template>
  <div class="device-detail-container">
    <div class="header">
      <div class="back-button">
        <el-button @click="router.push('/devices')" icon="el-icon-arrow-left">
          返回设备列表
        </el-button>
      </div>
      <h2 class="title">设备详情</h2>
    </div>

    <el-row v-loading="loading" :gutter="20">
      <!-- 设备概览 -->
      <el-col :span="24">
        <el-card shadow="hover" class="mb-4">
          <template #header>
            <div class="card-header">
              <span class="font-bold">设备概览</span>
              <el-tag :type="getStatusType(device?.status || '')" size="small">
                {{ getDeviceStatus(device?.status || '') }}
              </el-tag>
            </div>
          </template>
          
          <el-descriptions :column="3" border>
            <el-descriptions-item label="设备名称">
              {{ device?.name }}
            </el-descriptions-item>
            <el-descriptions-item label="IP地址">
              {{ device?.ip }}
            </el-descriptions-item>
            <el-descriptions-item label="型号">
              {{ device?.model }}
            </el-descriptions-item>
            <el-descriptions-item label="固件版本">
              {{ device?.firmwareVersion }}
            </el-descriptions-item>
            <el-descriptions-item label="分组">
              {{ getGroupLabel(device?.group || '') }}
            </el-descriptions-item>
            <el-descriptions-item label="运行时间">
              {{ device?.uptime }}
            </el-descriptions-item>
            <el-descriptions-item label="最后在线">
              {{ device?.lastSeen }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <!-- 资源使用 -->
      <el-col :xs="24" :sm="24" :md="8">
        <el-card shadow="hover" class="mb-4">
          <template #header>
            <div class="card-header">
              <span>CPU 使用率</span>
              <el-tag 
                :type="device?.cpu && device.cpu > 80 ? 'danger' : device?.cpu && device.cpu > 60 ? 'warning' : 'success'" 
                size="small"
              >
                {{ device?.cpu ? formatValue(device.cpu) : 0 }}%
              </el-tag>
            </div>
          </template>
          <div id="cpu-chart" class="chart"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :md="8">
        <el-card shadow="hover" class="mb-4">
          <template #header>
            <div class="card-header">
              <span>内存使用率</span>
              <el-tag 
                :type="device?.memory && device.memory > 80 ? 'danger' : device?.memory && device.memory > 60 ? 'warning' : 'success'" 
                size="small"
              >
                {{ device?.memory ? formatValue(device.memory) : 0 }}%
              </el-tag>
            </div>
          </template>
          <div id="memory-chart" class="chart"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :md="8">
        <el-card shadow="hover" class="mb-4">
          <template #header>
            <div class="card-header">
              <span>网络吞吐量</span>
              <el-tag size="small" type="info">
                实时
              </el-tag>
            </div>
          </template>
          <div id="network-chart" class="chart"></div>
        </el-card>
      </el-col>

      <!-- 运行任务 -->
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>运行任务</span>
              <span class="task-count">{{ device?.parsedTasks?.length || 0 }} 个任务</span>
            </div>
          </template>
          
          <el-table :data="device?.parsedTasks || []" style="width: 100%">
            <el-table-column label="任务名称">
              <template #default="{ row }">
                {{ row }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.device-detail-container {
  padding: 24px;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.back-button {
  margin-right: 16px;
}

.title {
  margin: 0;
  font-size: 20px;
  color: rgba(0, 0, 0, 0.85);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mb-4 {
  margin-bottom: 16px;
}

.chart {
  height: 300px;
  width: 100%;
}

.task-count {
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
}

@media (max-width: 768px) {
  .device-detail-container {
    padding: 16px;
  }
  
  .chart {
    height: 250px;
  }
}
</style>