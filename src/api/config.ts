import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

// 创建 axios 实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 10000),
  headers: {
    'Content-Type': 'application/json'
  }
})

console.log('Axios实例创建完成，baseURL:', import.meta.env.VITE_API_BASE_URL)

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log('发起请求，完整配置:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      headers: config.headers
    })
    return config
  },
  (error) => {
    console.error('请求错误：', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response
    console.log('收到响应:', {
      status: response.status,
      data: data,
      config: {
        url: response.config.url,
        method: response.config.method
      }
    })

    // 统一处理响应数据
    if (data.code === 200) {
      return data.data
    }
    
    // 统一处理业务错误
    const error = new Error(data.message || '请求失败')
    ElMessage.error(data.message || '请求失败')
    return Promise.reject(error)
  },
  (error) => {
    // 统一处理 HTTP 错误
    console.error('响应错误，详细信息：', {
      message: error.message,
      config: error.config,
      response: error.response
    })
    
    let message = '请求失败'
    if (error.response) {
      switch (error.response.status) {
        case 401:
          message = '未授权，请重新登录'
          // 可以在这里处理登录过期逻辑
          break
        case 403:
          message = '拒绝访问'
          break
        case 404:
          message = '请求错误，未找到该资源'
          break
        case 500:
          message = '服务器错误'
          break
        default:
          message = `连接错误${error.response.status}`
      }
    } else {
      message = '网络异常，请检查网络连接'
    }
    
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default service 