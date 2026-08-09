# MediaMTX 管理界面

中文 | [English](README.md)

基于 Vue 3 + TypeScript 开发的 [MediaMTX](https://github.com/bluenviron/mediamtx) 流媒体服务器管理后台。

## 功能特性

- **仪表盘** — 实时概览，统计卡片自动刷新并带数字滚动动画，包含源类型分布图、协议连接数图，以及滚动更新的带宽趋势图；API 不可达时会显示提示横幅
- **流管理** — 实时路径状态（支持搜索、排序、分页），详情抽屉中提供各协议（RTSP/RTMP/HLS/WebRTC/SRT）的可复制播放链接
- **路径配置** — 完整的编辑器，涵盖源地址、按需拉流、推流/拉流鉴权、按路径录制、以及 Run-on-Ready 钩子
- **连接管理** — 所有协议的连接/会话表格均支持排序与分页，API 支持踢出的地方均可一键操作：
  - RTSP 连接（只读）& 会话（可踢出）
  - RTMP 连接（可踢出）
  - WebRTC 会话（可踢出）
  - HLS Muxers（只读）
  - SRT 连接（可踢出）
- **录制管理** — 浏览录制列表，通过 MediaMTX 回放服务播放或下载录制段，删除录制段
- **系统配置** — 编辑所有 MediaMTX 服务器设置，支持未保存更改追踪、应用前二次确认，以及 JWT JWKS 刷新操作
- **最近操作** — 顶栏中记录本次会话内的管理操作（踢出、保存、删除）
- **主题切换** — 浅色 / 深色主题，配色系统统一（标签、提示、告警颜色均随主题切换）
- **响应式布局** — 可折叠侧边栏，移动端友好

## 技术栈

| 类别     | 技术                                       |
| -------- | ------------------------------------------ |
| 框架     | Vue 3（Composition API、`<script setup>`） |
| 语言     | TypeScript（严格模式）                     |
| 构建工具 | Vite                                       |
| UI 组件库 | Element Plus                              |
| 状态管理 | Pinia                                      |
| 图表     | ECharts + vue-echarts                      |
| HTTP 客户端 | Axios                                   |
| 路由     | Vue Router 4                               |

## 环境要求

- Node.js >= 16
- npm >= 7
- [MediaMTX](https://github.com/bluenviron/mediamtx) 服务器（需启用 API）

## 快速开始

### 1. 启动 MediaMTX（开启 API）

方式 A — 使用项目自带的开发配置（需要 Go 环境）：

```bash
npm run dev:api
```

方式 B — 手动启动 MediaMTX，在配置文件中设置 `api: true`：

```yaml
api: true
apiAddress: :9997
```

### 2. 启动前端开发服务器

```bash
npm install
npm run dev
```

### 3. 打开浏览器

```
http://localhost:3001
```

开发服务器会将 `/api/*` 请求代理到 `http://localhost:9997`（MediaMTX API），并将 `/webrtc/*` 代理到 `http://localhost:8889`（MediaMTX WebRTC 服务）。

## 构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。使用任意静态文件服务器托管，并将 `/api/*` 代理到 MediaMTX 实例即可。录制播放/下载功能还需要浏览器能访问 MediaMTX 的回放服务（`playback: yes`，默认端口 `9996`）。

## 项目结构

```
src/
├── api/            # Axios API 模块（每个资源一个文件）
├── components/     # 可复用组件（播放器、复制链接按钮、路径跳转链接）
├── composables/    # 共享组合式函数（格式化、分页、自动刷新、剪贴板等）
├── router/         # Vue Router 配置（懒加载）
├── stores/         # Pinia 状态管理（每个资源一个 store，另有一个会话级操作日志）
├── types/          # TypeScript 类型定义（匹配 MediaMTX API）
├── views/          # 页面组件
├── App.vue         # 布局（侧边栏 + 顶栏 + 主内容区）
├── main.ts         # 应用入口（Element Plus、ECharts、Router、Pinia）
└── style.css       # 全局样式（CSS 自定义属性实现主题）
```

## API 兼容性

所有 API 调用对接 **MediaMTX v3 REST API**（`/v3/...`）。`src/types/api.ts` 中的类型定义源自 MediaMTX Go 源码（`internal/defs/api*.go`）。

## 反馈

这是一个个人 fork 项目。欢迎通过 [GitHub Issues](https://github.com/lauraruusula/mediamtx-ui/issues) 提交问题反馈或功能建议。

## 许可证

MIT
