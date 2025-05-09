# 边缘监控系统 (Edge Monitoring System)

## 项目概述

这是一个基于 Vue 3 + TypeScript + Vite 构建的边缘设备监控系统前端项目。该系统用于监控、管理和优化边缘计算设备的运行状态，提供实时数据可视化、资源管理和告警监控等功能。

## 技术栈

- **前端框架**：Vue 3 (使用组合式 API 和 `<script setup>` 语法)
- **开发语言**：TypeScript
- **构建工具**：Vite
- **状态管理**：Pinia
- **路由管理**：Vue Router
- **UI 组件库**：Element Plus
- **数据可视化**：ECharts
- **CSS 框架**：TailwindCSS
- **网络请求**：Axios
- **实时通信**：WebSocket
- **开发测试**：MSW (Mock Service Worker)、Mock.js

## 项目结构

```
src/
├── api/            # API 接口定义
├── assets/         # 静态资源文件
├── components/     # 公共组件
├── layouts/        # 布局组件
├── mock/           # 数据模拟
├── router/         # 路由配置
├── stores/         # Pinia 状态管理
├── types/          # TypeScript 类型定义
├── utils/          # 工具函数
│   └── websocket/  # WebSocket 通信模块
└── views/          # 页面视图组件
    ├── Dashboard.vue       # 仪表盘/概览页面
    ├── Devices.vue         # 设备列表页面
    ├── DeviceDetail.vue    # 设备详情页面
    ├── Resources.vue       # 资源管理页面
    ├── Topology.vue        # 网络拓扑可视化页面
    ├── Alerts.vue          # 告警管理页面
    ├── Login.vue           # 登录页面
    ├── UserProfile.vue     # 用户个人信息页面
    └── NotFound.vue        # 404页面
```

## 主要功能模块

1. **登录/认证模块** (已完成)
   - 用户凭证登录系统

2. **概览/仪表盘模块** (已完成)
   - 核心指标展示：在线设备总数、离线设备数、资源利用率、告警总数等
   - 关键数据可视化：设备状态分布图、资源使用趋势图等

3. **设备管理模块**
   - 设备列表：展示已接入的边缘设备及其状态 (已完成)
   - 设备详情：展示设备详细信息、实时数据和历史数据 (已完成)
   - 设备控制：重启、配置下发等操作 (待完成)

4. **网络拓扑可视化模块** (已完成)
   - 2D拓扑图：展示边缘设备之间的连接关系和网络结构
   - 交互功能：节点点击跳转、缩放、平移等

5. **资源调度优化模块**
   - 资源概览：可视化展示资源分配和利用率 (已完成)
   - 调度操作：资源阈值设置、优化算法调用 (待完成)

6. **实时数据采集与告警模块**
   - 实时数据推送：通过WebSocket接收设备状态和参数 (已完成)
   - 告警管理：告警确认和处理状态记录 (待完成)

7. **用户管理模块** (已完成)
   - 用户个人信息修改

## 开发指南

### 环境配置

项目使用不同环境变量文件区分开发和生产环境：
- `.env.development`：开发环境配置
- `.env.production`：生产环境配置

### 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 本地预览生产构建
npm run preview

# 代码检查
npm run lint
```

## 系统设计特点

1. 实时数据监控：采用WebSocket技术实现设备数据的实时推送和更新
2. 可视化图表：使用ECharts提供丰富的数据可视化效果
3. 响应式设计：适配不同尺寸的屏幕和设备
4. 模拟数据支持：集成Mock系统，便于前端独立开发和测试
