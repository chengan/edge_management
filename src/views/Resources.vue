<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import api from '../api'
import { WebSocketService } from '../utils/websocket/service'
import { ElMessage } from 'element-plus'

interface ResourceData {
  cpu: number
  memory: number
  storage: number
  networkIo: [number, number]
}

// 图表实例
let cpuChart: echarts.ECharts | null = null
let memoryChart: echarts.ECharts | null = null
let networkChart: echarts.ECharts | null = null

const loading = ref(true)
const resourceData = ref<ResourceData>({
  cpu: 0,
  memory: 0,
  storage: 0,
  networkIo: [0, 0]
})

// 需要在 data 中添加数据存储
const timeData = ref<string[]>([])
const cpuData = ref<number[]>([])
const memoryData = ref<number[]>([])
const networkInData = ref<number[]>([])
const networkOutData = ref<number[]>([])

// 时间格式化函数
const formatTime = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 添加数值格式化函数
const formatValue = (value: number) => {
  return Number(value.toFixed(2))
}

// 获取图表基础配置
const getChartBaseOption = (title: string) => {
  return {
    title: {
      text: title,
      left: 'center',
      textStyle: {
        fontSize: 14
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        const time = params[0].name
        const value = formatValue(params[0].value)
        return `${time}<br/>${params[0].seriesName}: ${value}%`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: [],
      axisLabel: {
        interval: 4,
        formatter: function(value: string) {
          return value
        }
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      name: '使用率(%)',
      axisLabel: {},
      splitLine: {
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    series: [{
      name: '',
      type: 'line',
      smooth: true,
      areaStyle: {
        opacity: 0.3
      },
      itemStyle: {
        color: '#58D9F9'
      },
      emphasis: {
        focus: 'series'
      },
      data: [] as number[]
    }]
  }
}

// 初始化图表
const initCharts = () => {
  const cpuChartDom = document.getElementById('cpuChart')
  if (cpuChartDom) {
    cpuChart = echarts.init(cpuChartDom)
    const option = getChartBaseOption('CPU 使用趋势')
    option.series[0].name = 'CPU使用率'
    cpuChart.setOption(option)
  }

  const memoryChartDom = document.getElementById('memoryChart')
  if (memoryChartDom) {
    memoryChart = echarts.init(memoryChartDom)
    const option = getChartBaseOption('内存使用趋势')
    option.series[0].name = '内存使用率'
    option.series[0].itemStyle.color = '#36CFC9'
    memoryChart.setOption(option)
  }

  const networkChartDom = document.getElementById('networkChart')
  if (networkChartDom) {
    networkChart = echarts.init(networkChartDom)
    
    // 网络图表需要显示双线，使用完全自定义配置
    const option = {
      title: {
        text: '网络吞吐趋势',
        left: 'center',
        textStyle: {
          fontSize: 14
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params: any) {
          const time = params[0].name;
          const inValue = params[0].value;
          const outValue = params[1].value;
          
          // 格式化显示
          const formatBytes = (value: number) => {
            if (value >= 1024 * 1024 * 1024) {
              return (value / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
            } else if (value >= 1024 * 1024) {
              return (value / (1024 * 1024)).toFixed(2) + ' MB';
            } else if (value >= 1024) {
              return (value / 1024).toFixed(2) + ' KB';
            }
            return value + ' B';
          };
          
          return `${time}<br/>入网: ${formatBytes(inValue)}<br/>出网: ${formatBytes(outValue)}`;
        }
      },
      legend: {
        data: ['入网', '出网'],
        top: 25
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '60px',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: timeData.value,
        axisLabel: {
          interval: 4,
          formatter: function(value: string) {
            return value
          }
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1024 * 1024 * 1024,
        name: 'Bytes',
        axisLabel: {
          formatter: function(value: number) {
            if (value >= 1024 * 1024 * 1024) {
              return (value / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
            } else if (value >= 1024 * 1024) {
              return (value / (1024 * 1024)).toFixed(1) + 'MB';
            } else if (value >= 1024) {
              return (value / 1024).toFixed(1) + 'KB';
            }
            return value + 'B';
          }
        },
        splitLine: {
          lineStyle: {
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: '入网',
          type: 'line',
          smooth: true,
          areaStyle: {
            opacity: 0.3
          },
          itemStyle: {
            color: '#4e7ae7' // 蓝色表示入网
          },
          emphasis: {
            focus: 'series'
          },
          data: networkInData.value
        },
        {
          name: '出网',
          type: 'line',
          smooth: true,
          areaStyle: {
            opacity: 0.3
          },
          itemStyle: {
            color: '#73D13D' // 绿色表示出网
          },
          emphasis: {
            focus: 'series'
          },
          data: networkOutData.value
        }
      ]
    };
    
    networkChart.setOption(option);
  }
}

// 更新图表数据
const updateCharts = (data: ResourceData) => {
  const now = new Date()
  const timeStr = formatTime(now)
  
  // 更新数据数组，添加格式化处理
  timeData.value.push(timeStr)
  cpuData.value.push(formatValue(data.cpu))
  memoryData.value.push(formatValue(data.memory))
  
  // 分别存储入网和出网数据
  networkInData.value.push(formatValue(data.networkIo[0]))
  networkOutData.value.push(formatValue(data.networkIo[1]))

  // 保持最近12个数据点
  const maxDataPoints = 12
  if (timeData.value.length > maxDataPoints) {
    timeData.value.shift()
    cpuData.value.shift()
    memoryData.value.shift()
    networkInData.value.shift()
    networkOutData.value.shift()
  }

  // 更新所有图表
  const updateOption = {
    xAxis: {
      data: timeData.value
    },
    series: [{
      data: [] as number[]
    }]
  }

  if (cpuChart) {
    updateOption.series[0].data = cpuData.value
    cpuChart.setOption(updateOption)
  }

  if (memoryChart) {
    updateOption.series[0].data = memoryData.value
    memoryChart.setOption(updateOption)
  }

  // 网络图表更新
  if (networkChart) {
    networkChart.setOption({
      xAxis: {
        data: timeData.value
      },
      series: [
        { data: networkInData.value },
        { data: networkOutData.value }
      ]
    })
  }
}

// 初始化 WebSocket 连接
let ws: WebSocketService | null = null

// 添加阈值设置相关的响应式数据
const thresholdForm = ref({
  cpuThreshold: 80,
  memoryThreshold: 85
})

const optimizing = ref(false)

// 添加阈值设置处理方法
const handleThresholdSubmit = async () => {
  try {
    await api.updateResourceThreshold(thresholdForm.value)
    ElMessage.success('资源阈值设置已更新')
  } catch (error) {
    ElMessage.error('更新资源阈值设置失败')
    console.error('更新资源阈值设置失败:', error)
  }
}

// 添加资源优化处理方法
const handleOptimize = async () => {
  try {
    optimizing.value = true;
    
    // 确保 WebSocket 连接是活跃的
    if (ws) {
      console.log('检查 WebSocket 连接状态...');
      try {
        // 尝试重新连接，如果已连接 connect 方法会处理
        await ws.connect();
      } catch (err) {
        console.error('WebSocket 重连失败:', err);
        ElMessage.warning('WebSocket 连接已断开，可能会影响数据实时更新');
      }
    }
    
    // 添加重试机制
    let retries = 0;
    const maxRetries = 2;
    let success = false;
    let lastError;
    
    while (!success && retries <= maxRetries) {
      try {
        const response = await api.triggerResourceOptimize();
        ElMessage.success(response.message);
        success = true;
      } catch (error) {
        lastError = error;
        retries++;
        console.error(`触发资源优化失败 (尝试 ${retries}/${maxRetries}):`, error);
        
        if (retries <= maxRetries) {
          // 等待一段时间再重试
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!success) {
      ElMessage.error(`触发资源优化失败，请稍后再试`);
      console.error('所有重试都失败:', lastError);
    }
  } catch (error) {
    console.error('触发资源优化过程中出现意外错误:', error);
    ElMessage.error('触发资源优化失败');
  } finally {
    optimizing.value = false;
  }
}

onMounted(async () => {
  // 初始化图表
  initCharts()

  try {
    // 在挂载前确保没有活跃的 WebSocket 连接
    if (ws) {
      try {
        ws.disconnect();
        ws = null;
      } catch (err) {
        console.error('清理现有 WebSocket 连接失败:', err);
      }
    }
    
    // 从环境变量读取 WebSocket 基础 URL，改为连接到 dashboard 端点
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://127.0.0.1:8083/ws';
    const wsUrl = `${wsBaseUrl}/dashboard`; // 修改为 dashboard
    
    ws = new WebSocketService(wsUrl)

    // 处理 WebSocket 消息，使用与 Dashboard.vue 相同的消息类型
    const unsubscribe = ws.onMessage((message) => {
      // 监听与 Dashboard.vue 相同的消息类型
      if (message.type === 'DASHBOARD_STATS' || message.type === 'DASHBOARD_STATS_UPDATE') {
        console.log('Resources页面收到WebSocket消息:', message.type);
        
        if (!message.data) {
          console.error('收到的资源数据为空');
          return;
        }
        
        loading.value = false;
        
        // 从 Dashboard 数据中提取资源相关字段
        resourceData.value = {
          cpu: message.data.cpuUsage,
          memory: message.data.memoryUsage,
          storage: message.data.storageUsage,
          networkIo: message.data.networkIo
        };
        
        console.log('资源数据更新:', resourceData.value);
        updateCharts(resourceData.value);
      }
    })

    // 连接 WebSocket
    await ws.connect();
    console.log('资源监控WebSocket连接成功');
    
    // 使用与 Dashboard.vue 相同的请求类型
    ws.send({
      type: 'GET_DASHBOARD_STATS', // 修改为与 Dashboard 相同的请求类型
      data: null
    });

    // 如果连接成功但在一定时间内未收到数据，也应该关闭loading
    setTimeout(() => {
      if (loading.value) {
        loading.value = false;
      }
    }, 3000); // 3秒超时
  } catch (error) {
    console.error('WebSocket 连接错误:', error)
    loading.value = false
    ElMessage.error('无法连接到资源监控服务')
  }
})

onUnmounted(() => {
  // 清理图表实例
  if (cpuChart) {
    try {
      cpuChart.dispose()
    } catch (err) {
      console.error('清理 CPU 图表失败:', err)
    }
    cpuChart = null
  }
  
  if (memoryChart) {
    try {
      memoryChart.dispose()
    } catch (err) {
      console.error('清理内存图表失败:', err)
    }
    memoryChart = null
  }
  
  if (networkChart) {
    try {
      networkChart.dispose()
    } catch (err) {
      console.error('清理网络图表失败:', err)
    }
    networkChart = null
  }

  // 断开 WebSocket 连接
  if (ws) {
    try {
      ws.disconnect()
    } catch (error) {
      console.error('断开 WebSocket 连接失败:', error)
    } finally {
      ws = null
    }
  }
})
</script>

<template>
  <div class="resources-container">
    <el-card class="resource-charts">
      <template #header>
        <div class="card-header">
          <span>资源使用率</span>
        </div>
      </template>
      <div class="charts-container" v-loading="loading">
        <div id="cpuChart" class="chart"></div>
        <div id="memoryChart" class="chart"></div>
        <div id="networkChart" class="chart"></div>
      </div>
    </el-card>

    <el-card class="threshold-settings">
      <template #header>
        <div class="card-header">
          <span>资源阈值设置</span>
        </div>
      </template>
      <el-form :model="thresholdForm" label-width="120px">
        <el-form-item label="CPU 使用率阈值">
          <el-input-number
            v-model="thresholdForm.cpuThreshold"
            :min="0"
            :max="100"
            :step="5"
          >
            <template #suffix>%</template>
          </el-input-number>
        </el-form-item>
        <el-form-item label="内存使用率阈值">
          <el-input-number
            v-model="thresholdForm.memoryThreshold"
            :min="0"
            :max="100"
            :step="5"
          >
            <template #suffix>%</template>
          </el-input-number>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleThresholdSubmit">
            保存设置
          </el-button>
          <el-button 
            type="success" 
            @click="handleOptimize"
            :loading="optimizing"
            style="margin-left: 10px"
          >
            一键优化
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="optimization-suggestions">
      <template #header>
        <div class="card-header">
          <span>优化建议</span>
        </div>
      </template>
      <el-table :data="[
        { type: 'CPU', suggestion: 'CPU使用率较高，建议优化计算密集型任务或增加CPU核心数' },
        { type: '内存', suggestion: '内存使用接近阈值，建议清理未使用的缓存或增加内存容量' },
        { type: '网络', suggestion: '网络带宽使用率波动较大，建议优化数据传输策略' }
      ]">
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="suggestion" label="建议" />
      </el-table>
    </el-card>

    <el-card class="resource-distribution">
      <template #header>
        <div class="card-header">
          <span>设备组资源分布</span>
        </div>
      </template>
      <el-table :data="[
        { group: '生产环境', devices: 15, avgCpu: 65, avgMemory: 75, avgNetwork: 45 },
        { group: '测试环境', devices: 8, avgCpu: 45, avgMemory: 55, avgNetwork: 35 },
        { group: '开发环境', devices: 5, avgCpu: 35, avgMemory: 45, avgNetwork: 25 }
      ]">
        <el-table-column prop="group" label="设备组" />
        <el-table-column prop="devices" label="设备数量" />
        <el-table-column prop="avgCpu" label="平均CPU使用率(%)" />
        <el-table-column prop="avgMemory" label="平均内存使用率(%)" />
        <el-table-column prop="avgNetwork" label="平均网络使用率(%)" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.resources-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.charts-container {
  display: flex;
  flex-direction: row;
  gap: 20px;
  margin-top: 20px;
  height: 300px;
}

.chart {
  flex: 1;
  min-width: 0;
}

.optimization-suggestions,
.resource-distribution {
  margin-top: 20px;
}

:deep(.el-card__header) {
  padding: 15px 20px;
  border-bottom: 1px solid #e4e7ed;
  font-weight: bold;
}

:deep(.el-table) {
  margin-top: 10px;
}

.threshold-settings {
  margin-top: 20px;
}

.threshold-settings :deep(.el-input-number) {
  width: 180px;
}

.threshold-settings :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
}

.threshold-settings :deep(.el-input-number__suffix) {
  margin-left: 5px;
}

@media screen and (max-width: 1200px) {
  .charts-container {
    flex-direction: column;
    height: auto;
  }
  
  .chart {
    height: 300px;
  }
}
</style>