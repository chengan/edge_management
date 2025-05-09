<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts/core'
import { GraphChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import api from '../api'
import { ElMessage } from 'element-plus'

// 注册必需的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  GraphChart,
  CanvasRenderer,
  UniversalTransition
])

const loading = ref(true)
const topology = ref<{ nodes: any[], edges: any[] }>({ nodes: [], edges: [] })
let chart: echarts.ECharts | null = null

const fetchTopology = async () => {
  try {
    loading.value = true
    const response = await api.getTopology()
    topology.value = response
    await nextTick()
    initChart()
  } catch (error) {
    console.error('加载网络拓扑失败:', error)
    ElMessage.error('加载网络拓扑失败')
  } finally {
    loading.value = false
  }
}

const getChartOption = () => {
  const nodes = topology.value.nodes.map(node => ({
    name: node.name,
    id: node.id,
    symbolSize: node.type === 'gateway' ? 60 : 
               node.type === 'edge' ? 45 : 
               30,  // sensor类型最小
    itemStyle: {
      color: node.status === 'online' ? '#52c41a' :   // 在线-绿色
             node.status === 'warning' ? '#faad14' :   // 警告-黄色
             '#f5222d',                                // 离线-红色
      borderColor: '#fff',                            // 白色边框
      borderWidth: 2                                  // 边框宽度
    },
    fixed: false,
    draggable: true
  }))

  const links = topology.value.edges.map(edge => ({
    source: edge.source,
    target: edge.target,
    value: edge.bandwidth,  // 用于tooltip显示
    lineStyle: {
      width: 2,
      color: '#bbb',
      curveness: 0.1
    },
    symbol: ['circle', 'arrow'],
    symbolSize: [4, 8]
  }))

  return {
    title: {
      text: '网络拓扑图'
    },
    tooltip: {
      show: true,
      formatter: function(params: any) {
        if (params.dataType === 'edge') {
          return `带宽: ${params.data.value} Mbps`;
        }
        return params.data.name;
      }
    },
    series: [{
      type: 'graph',
      layout: 'force',
      data: nodes,
      links: links,
      roam: true,
      draggable: true,
      label: {
        show: true,
        position: 'right',
        fontSize: 12,
        color: '#333'  // 标签文字颜色
      },
      lineStyle: {
        opacity: 0.9,
        width: 2,
        curveness: 0.1
      },
      edgeLabel: {
        show: false
      },
      force: {
        repulsion: 2000,
        edgeLength: 300,
        gravity: 0.1,
        layoutAnimation: true,
        friction: 0.6,
        initLayout: 'circular'
      },
      zoom: 0.5,
      center: ['50%', '50%'],
      left: '5%',
      right: '5%',
      top: '10%',
      bottom: '10%'
    }]
  }
}

const initChart = () => {
  if (chart) {
    chart.dispose()
    chart = null
  }

  const chartDom = document.getElementById('topology-chart')
  if (!chartDom) {
    console.error('找不到图表容器元素')
    return
  }

  console.log('初始化图表，容器尺寸:', {
    width: chartDom.clientWidth,
    height: chartDom.clientHeight
  })

  chart = echarts.init(chartDom)
  const option = getChartOption()
  chart.setOption(option)
  
  window.addEventListener('resize', () => {
    chart?.resize()
  })

  chart.on('graphNodeDragged', function(...args: any[]) {
    console.log('节点拖拽结束:', args)
  })
}

// 组件销毁时清理图表实例
onBeforeUnmount(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
})

onMounted(() => {
  fetchTopology()
})
</script>

<template>
  <div class="topology-container">
    <div class="header">
      <h2 class="title">网络拓扑</h2>
      <el-button 
        type="primary"
        :loading="loading"
        @click="fetchTopology"
      >
        刷新
      </el-button>
    </div>

    <el-card shadow="hover" class="topology-card">
      <div v-loading="loading" class="topology-content">
        <div id="topology-chart" class="topology-chart" style="width: 100%; height: 100%;"></div>
        
        <div class="legend">
          <div class="legend-item">
            <div class="status-dot online"></div>
            <span>在线</span>
          </div>
          <div class="legend-item">
            <div class="status-dot warning"></div>
            <span>警告</span>
          </div>
          <div class="legend-item">
            <div class="status-dot offline"></div>
            <span>离线</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.topology-container {
  padding: 24px;
  height: 100%;
  min-height: 800px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.title {
  margin: 0;
  font-size: 20px;
  color: rgba(0, 0, 0, 0.85);
}

.topology-card {
  height: calc(100vh - 180px);
  min-height: 700px;
  display: flex;
  flex-direction: column;
}

.topology-content {
  height: 100%;
  position: relative;
  flex: 1;
  min-height: 600px;
  display: flex;
  flex-direction: column;
}

.topology-chart {
  height: 100%;
  width: 100%;
  min-height: 600px;
  flex: 1;
}

.legend {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 12px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.legend-item:last-child {
  margin-bottom: 0;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-dot.online {
  background-color: #52c41a;
}

.status-dot.warning {
  background-color: #faad14;
}

.status-dot.offline {
  background-color: #f5222d;
}

@media (max-width: 768px) {
  .topology-container {
    padding: 16px;
  }
  
  .topology-card {
    height: calc(100vh - 140px);
  }
}
</style>