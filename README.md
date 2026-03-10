# JavaDock

> **轻量级 Docker 容器与 Java 服务管理工具**  
> 作者：蔡国宇  
> 技术栈：TypeScript · Node.js · Express · React · Vite · Tailwind CSS

---

## 功能概览

| 模块 | 功能 |
|------|------|
| **Docker 容器** | 查看容器列表/详情、启动/停止/重启、实时日志流、修改参数并重建 |
| **Java 服务** | 启动/停止/重启本机 Java 进程、Maven 编译（实时输出）、查看日志、内存/端口监控 |
| **Java 扫描** | 一键扫描本机 Java/SpringBoot 进程、识别端口与目录、勾选后一键导入为服务 |
| **配置文件管理** | 读取/编辑 SpringBoot application.properties/yml，写入前自动备份 .bak |
| **服务快速编辑** | 在 Java 服务页直接编辑服务配置（名称/目录/端口/命令），支持删除 |
| **自定义脚本** | 保存常用命令，一键执行并实时查看输出 |
| **设置中心** | 管理服务配置、环境变量、默认命令模板 |

---

## 快速开始

### 环境要求

- Node.js 20+
- npm 9+
- Docker CLI（管理容器时需要）
- Maven / Java（管理 Java 服务时需要）

### 安装依赖

```bash
cd JavaDock
npm install
```

### 开发模式

```bash
npm run dev
```

- 单进程启动，访问：http://localhost:7091
- Vite 以 middleware 模式内嵌，支持完整 HMR 热更新

### 生产构建与启动

```bash
npm run build   # 先构建前端，再编译服务端 TS
npm start       # 启动单进程，访问 http://localhost:7091
```

---

## 目录结构

```
src/
├── shared/          # 前后端共享类型与默认配置
├── server/          # Express 服务端
│   ├── index.ts     # 入口
│   ├── docker/      # Docker 容器管理
│   ├── java/        # Java 服务管理
│   ├── scripts/     # 自定义脚本执行
│   └── settings/    # 配置读写
└── client/          # React 前端
    ├── api/         # API 请求封装
    ├── components/  # 公共组件
    ├── pages/       # 页面
    └── styles/      # 全局样式
```

---

## 配置文件

应用配置存储于 `~/.javadock/config.json`，首次启动自动创建默认配置。

可通过环境变量 `JAVADOCK_HOME` 自定义路径：

```bash
JAVADOCK_HOME=/custom/path npm start
```

---

## 进度

| 状态 | 功能模块 |
|------|----------|
| ✅ 完成 | 项目脚手架（TS + Vite + Tailwind） |
| ✅ 完成 | 设置模块（~/.javadock/config.json 读写） |
| ✅ 完成 | Docker 容器管理（列表/详情/启停/重建/日志流） |
| ✅ 完成 | Java 服务管理（启停/编译/日志/内存监控） |
| ✅ 完成 | 自定义脚本执行（SSE 实时输出） |
| ✅ 完成 | 卡片式现代 UI（深色主题、响应式布局） |
| ✅ 完成 | UI 支持切换黑夜/白天模式（侧栏切换、localStorage 持久化） |
| ✅ 完成 | 一键扫描本机 Java/SpringBoot 进程并导入（ps + lsof） |
| ✅ 完成 | SpringBoot 配置文件读写（application.properties/yml，写前备份） |
| ✅ 完成 | Java 服务单条 CRUD（新增/更新/删除，无需整体保存配置） |
| ✅ 完成 | JavaPage 快速编辑/删除服务 + 配置文件编辑入口 |
| ✅ 完成 | 设置中维护管理员密码，扫描时可选使用 sudo 提升权限（ps/lsof） |

---

## 安全说明

本工具会执行用户配置的任意 shell 命令，仅适合**本地可信环境**使用，请勿将服务端口暴露到公网。  
若在「设置 → 权限」中填写管理员密码，将用于扫描时通过 sudo 执行 ps/lsof，密码仅存于本地 `config.json`，接口返回时已脱敏，请勿将配置目录暴露到公网。
