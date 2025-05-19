<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import api from '../api'
import { WebSocketService } from '../utils/websocket/service'

import type { DashboardStats } from '../types/api'

const router = useRouter()
const loading = ref(true)
const stats = ref<DashboardStats>({
  totalDevices: 0,
  onlineDevices: 0,
  offlineDevices: 0,
  alertsCount: 0,
  cpuUsage: 0,
  memoryUsage: 0,
  networkIo: [0, 0] as [number, number],
  storageUsage: 0
})

// 图表实例
let cpuChart: echarts.ECharts | null = null
let memoryChart: echarts.ECharts | null = null
let diskChart: echarts.ECharts | null = null
let statusChart: echarts.ECharts | null = null
let networkChart: echarts.ECharts | null = null

// 从环境变量读取 WebSocket 基础 URL
const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://127.0.0.1:8083/ws';
const wsUrl = `${wsBaseUrl}/dashboard`;

// 获取共享连接
let ws: WebSocketService | null = WebSocketService.getSharedConnection(wsUrl);

onMounted(async () => {
  try {
    // 1. 先加载初始数据
    stats.value = await api.getDashboardStats()
    console.log('仪表盘数据:', stats.value)
    
    // 先关闭loading，确保DOM已渲染
    loading.value = false
    
    // 等待DOM更新后再初始化图表
    await nextTick()
    initCharts()
    
    // 2. 确保WS连接前清理之前的连接
    try {
      ws.disconnect();
    } catch (error) {
      console.error('断开旧的WebSocket连接失败:', error);
    }
    
    // 3. 先注册消息处理器，再连接WebSocket
    const unsubscribe = ws.onMessage(handleStatsUpdate);
    
    // 4. 使用await等待连接完成
    await ws.connect();
    
    // 只有当首次注册此消息类型时才发送和设置定时器
    if (ws.registerPeriodicMessageType('GET_DASHBOARD_STATS')) {
      // 发送初始请求
      ws.send({
        type: 'GET_DASHBOARD_STATS',
        data: null
      });
      
      // 设置定时消息
      ws.setPeriodicMessage({
        type: 'GET_DASHBOARD_STATS',
        data: null
      }, 10000);
    }
    
    // 7. 组件卸载时取消订阅
    onUnmounted(() => {
      unsubscribe();
      // 清理图表实例
      cpuChart?.dispose();
      memoryChart?.dispose();
      networkChart?.dispose();
      diskChart?.dispose();
      statusChart?.dispose();
      
      // 断开 WebSocket 连接
      try {
        ws.disconnect();
      } catch (error) {
        console.error('断开WebSocket连接失败:', error);
      }
      
      // 释放共享连接
      WebSocketService.releaseSharedConnection(wsUrl);
    });
    
  } catch (error) {
    console.error('加载仪表盘数据失败:', error);
    // 确保出错时也关闭loading
    loading.value = false;
  }
});

const handleStatsUpdate = (data: any) => {
  try {
    console.log('收到WebSocket消息:', data.type);
    
    // 只处理仪表盘相关的消息
    if (data.type === 'DASHBOARD_STATS' || data.type === 'DASHBOARD_STATS_UPDATE') {
      if (!data.data) {
        console.error('收到的仪表盘数据为空');
        return;
      }
      
      // 更新数据，确保所有必要字段都存在
      stats.value = {
        ...stats.value,
        totalDevices: data.data.totalDevices ?? stats.value.totalDevices,
        onlineDevices: data.data.onlineDevices ?? stats.value.onlineDevices,
        offlineDevices: data.data.offlineDevices ?? stats.value.offlineDevices,
        alertsCount: data.data.alertsCount ?? stats.value.alertsCount,
        cpuUsage: data.data.cpuUsage ?? stats.value.cpuUsage,
        memoryUsage: data.data.memoryUsage ?? stats.value.memoryUsage,
        networkIo: data.data.networkIo ?? stats.value.networkIo,
        storageUsage: data.data.storageUsage ?? stats.value.storageUsage
      };
      
      console.log('仪表盘数据更新:', data.data);
      
      // 更新图表
      updateCharts();
    }
  } catch (error) {
    console.error('处理WebSocket消息时出错:', error);
  }
}

const initCharts = () => {
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
        formatter: '{value}%',
        color: 'auto'
      },
      data: [{ value: stats.value.cpuUsage }]
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
        formatter: '{value}%',
        color: 'auto'
      },
      data: [{ value: stats.value.memoryUsage }]
    }]
  })
  
  // 磁盘使用率图表
  diskChart = echarts.init(document.getElementById('disk-chart') as HTMLElement)
  diskChart.setOption({
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
              { offset: 0, color: '#fa8c16' },
              { offset: 1, color: '#d46b08' }
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
        formatter: '{value}%',
        color: 'auto'
      },
      data: [{ value: stats.value.storageUsage }]
    }]
  })
  
  // 设备状态图表
  statusChart = echarts.init(document.getElementById('status-chart') as HTMLElement)
  statusChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      data: ['在线', '离线']
    },
    series: [
      {
        name: '设备状态',
        type: 'pie',
        radius: ['50%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: stats.value.onlineDevices, name: '在线', itemStyle: { color: '#52c41a' } },
          { value: stats.value.offlineDevices, name: '离线', itemStyle: { color: '#f5222d' } }
        ]
      }
    ]
  })
  
  // 网络吞吐量图表
  networkChart = echarts.init(document.getElementById('network-chart') as HTMLElement)
  networkChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['入网', '出网'],
      top: 0,
      textStyle: { fontSize: 12 }
    },
    grid: {
      left: '3%',
      right: '4%', 
      bottom: '10%',
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
        formatter: function(value: number) {
          if (value >= 1024*1024*1024) {
            return (value/(1024*1024*1024)).toFixed(2) + ' GB';
          } else if (value >= 1024*1024) {
            return (value/(1024*1024)).toFixed(2) + ' MB';
          } else if (value >= 1024) {
            return (value/1024).toFixed(2) + ' KB';
          }
          return value + ' B';
        }
      }
    }],
    series: [
      {
        name: '入网',
        type: 'bar',
        data: [stats.value.networkIo[0]]
      },
      {
        name: '出网',
        type: 'bar',
        data: [stats.value.networkIo[1]]
      }
    ]
  })
  
  // 处理窗口大小变化
  window.addEventListener('resize', () => {
    cpuChart?.resize()
    memoryChart?.resize()
    networkChart?.resize()
    diskChart?.resize()
    statusChart?.resize()
  })
}

const updateCharts = () => {
  cpuChart?.setOption({
    series: [{ data: [{ value: stats.value.cpuUsage }] }]
  })
  
  memoryChart?.setOption({
    series: [{ data: [{ value: stats.value.memoryUsage }] }]
  })
  
  diskChart?.setOption({
    series: [{ data: [{ value: stats.value.storageUsage }] }]
  })
  
  statusChart?.setOption({
    series: [{
      data: [
        { value: stats.value.onlineDevices, name: '在线' },
        { value: stats.value.offlineDevices, name: '离线' }
      ]
    }]
  })
  
  networkChart?.setOption({
    series: [
      { data: [stats.value.networkIo[0]] },
      { data: [stats.value.networkIo[1]] }
    ]
  })
}

const navigateToDevices = () => {
  router.push('/devices')
}

const navigateToAlerts = () => {
  router.push('/alerts')
}
</script>

<template>
  <div class="dashboard-container" v-loading="loading">
    <!-- 概览卡片 -->
    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card" @click="navigateToDevices">
          <div class="stat-icon total">
            <i class="el-icon-monitor"></i>
          </div>
          <div class="stat-content">
            <div class="stat-title">设备总数</div>
            <div class="stat-value">{{ stats.totalDevices }}</div>
            <div class="stat-footer">
              <span>查看所有设备</span>
              <i class="el-icon-arrow-right"></i>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card">
          <div class="stat-icon online">
            <i class="el-icon-connection"></i>
          </div>
          <div class="stat-content">
            <div class="stat-title">在线设备</div>
            <div class="stat-value">{{ stats.onlineDevices }}</div>
            <div class="stat-footer">
              <span class="trend positive">
                <i class="el-icon-top"></i>
                {{ Math.round((stats.onlineDevices / stats.totalDevices) * 100) }}%
              </span>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card">
          <div class="stat-icon offline">
            <i class="el-icon-disconnect"></i>
          </div>
          <div class="stat-content">
            <div class="stat-title">离线设备</div>
            <div class="stat-value">{{ stats.offlineDevices }}</div>
            <div class="stat-footer">
              <span class="trend negative">
                <i class="el-icon-bottom"></i>
                {{ Math.round((stats.offlineDevices / stats.totalDevices) * 100) }}%
              </span>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card" @click="navigateToAlerts">
          <div class="stat-icon alerts">
            <i class="el-icon-warning"></i>
          </div>
          <div class="stat-content">
            <div class="stat-title">活动告警</div>
            <div class="stat-value">{{ stats.alertsCount }}</div>
            <div class="stat-footer">
              <span>查看所有告警</span>
              <i class="el-icon-arrow-right"></i>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 系统资源 -->
    <div class="section-title">系统资源</div>
    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="gauge-card">
          <div class="gauge-header">
            <span>CPU 使用率</span>
            <el-tag :type="stats.cpuUsage > 80 ? 'danger' : stats.cpuUsage > 60 ? 'warning' : 'success'" size="small">
              {{ stats.cpuUsage }}%
            </el-tag>
          </div>
          <div id="cpu-chart" class="gauge-chart"></div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="gauge-card">
          <div class="gauge-header">
            <span>内存使用率</span>
            <el-tag :type="stats.memoryUsage > 80 ? 'danger' : stats.memoryUsage > 60 ? 'warning' : 'success'" size="small">
              {{ stats.memoryUsage }}%
            </el-tag>
          </div>
          <div id="memory-chart" class="gauge-chart"></div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="gauge-card">
          <div class="gauge-header">
            <span>网络吞吐量</span>
            <el-tag type="info" size="small">
              实时
            </el-tag>
          </div>
          <div id="network-chart" class="gauge-chart"></div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="gauge-card">
          <div class="gauge-header">
            <span>磁盘使用率</span>
            <el-tag :type="stats.storageUsage > 80 ? 'danger' : stats.storageUsage > 60 ? 'warning' : 'success'" size="small">
              {{ stats.storageUsage }}%
            </el-tag>
          </div>
          <div id="disk-chart" class="gauge-chart"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 设备状态分布 -->
    <div class="section-title">设备状态分布</div>
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <div class="chart-card">
          <div id="status-chart" class="status-chart"></div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <div class="chart-card">
          <div class="status-summary">
            <div class="summary-item">
              <div class="summary-label">
                <div class="status-dot online"></div>
                <span>在线设备</span>
              </div>
              <div class="summary-value">{{ stats.onlineDevices }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">
                <div class="status-dot offline"></div>
                <span>离线设备</span>
              </div>
              <div class="summary-value">{{ stats.offlineDevices }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">
                <div class="status-dot total"></div>
                <span>设备总数</span>
              </div>
              <div class="summary-value">{{ stats.totalDevices }}</div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 64px);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 32px 0 20px;
}

/* 统计卡片 */
.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.stat-icon i {
  font-size: 24px;
  color: white;
}

.stat-icon.total {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.stat-icon.online {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.stat-icon.offline {
  background: linear-gradient(135deg, #f5222d 0%, #cf1322 100%);
}

.stat-icon.alerts {
  background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
}

.stat-content {
  flex: 1;
}

.stat-title {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.stat-footer {
  font-size: 14px;
  color: #1890ff;
  display: flex;
  align-items: center;
  gap: 4px;
}

.trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.trend.positive {
  color: #52c41a;
}

.trend.negative {
  color: #f5222d;
}

/* 仪表卡片 */
.gauge-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.gauge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.gauge-header span {
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
}

.gauge-chart {
  height: 200px;
}

/* 状态图表 */
.chart-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: 300px;
}

.status-chart {
  height: 100%;
}

.status-summary {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  color: #1f2937;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-dot.online {
  background-color: #52c41a;
}

.status-dot.offline {
  background-color: #f5222d;
}

.status-dot.total {
  background-color: #1890ff;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.network-total {
  text-align: center;
  margin-top: 10px;
  font-size: 14px;
  color: #666;
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }

  .stat-card {
    padding: 16px;
  }

  .gauge-chart {
    height: 160px;
  }

  .chart-card {
    height: 250px;
  }
}
</style>