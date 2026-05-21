# HiTodo — 打工人专属 Windows 桌面待办

轻量、强制提醒、后台常驻的 Windows 待办应用。基于 Tauri v2 构建，内存占用极低（<50MB），适合打工人日常使用。

## ✨ 功能

- **待办管理** — 添加、编辑、删除任务，支持拖拽排序
- **强制提醒弹窗** — 任务到期时右下角弹出置顶窗口，必须手动点击才能关闭（不可 Alt+F4、不可划掉）
- **稍后提醒** — 支持 5 分钟 / 15 分钟 / 30 分钟延迟
- **完成任务洒金粉** — 点击"已完成"触发金色 confetti 动画
- **专注模式** — 25 分钟番茄钟，全屏遮罩 + SVG 环形进度条
- **系统托盘** — 关闭窗口最小化到托盘，后台常驻，左键切换显隐
- **开机自启** — 基于 tauri-plugin-autostart
- **定时扫描** — 每 10 秒检查到期任务，启动时立刻检查
- **任务导出** — 一键导出全部任务为 JSON 文件
- **便携化** — 数据库保存在 exe 同目录，拷贝即用

## 🖥 界面

Windows 11 风格设计，玻璃拟态卡片，圆角边框，细腻阴影。

- 主窗口 400×700，支持缩放
- 到期徽标：蓝色正常 / 红色脉冲过期
- 暗色模式自适应

## 🛠 技术栈

| 层 | 技术 |
|---|------|
| 桌面框架 | Tauri v2 |
| 前端 | React 18 + Vite + TypeScript |
| UI | Tailwind CSS + Radix 组件 |
| 状态管理 | Zustand |
| 拖拽 | @dnd-kit |
| 本地存储 | SQLite (rusqlite, bundled) |
| 定时任务 | Tokio (Rust) |
| 打包 | Tauri bundler → 单文件 .exe |

## 📦 直接使用

从 [Releases](../../releases) 下载 `hitodo.exe`，双击运行。

> 需要 Windows 10 1809+ 或 Windows 11。系统自带 WebView2，无需额外安装。

## 🔧 从源码构建

### 环境要求

- [Rust](https://rustup.rs) stable-x86_64-pc-windows-msvc
- [Node.js](https://nodejs.org) 18+
- Visual Studio 2022 Build Tools（C++ 工具链）或 Windows SDK
- `link.exe` 需在 PATH 中

### 构建步骤

```bash
# 克隆仓库
git clone git@github.com:c19y9x/ToDoList.git
cd ToDoList

# 安装前端依赖
npm install

# 开发模式（热更新）
npx tauri dev

# 生产构建
npx tauri build
```

构建产物在 `src-tauri/target/release/hitodo.exe`。

### MSVC 环境配置

如果 `cargo build` 报链接错误，需要设置 MSVC 环境变量：

```powershell
$msvcBin = "C:\BuildTools\VC\Tools\MSVC\<version>\bin\Hostx64\x64"
$sdkBin = "C:\Program Files (x86)\Windows Kits\10\bin\<sdk_version>\x64"
$env:Path = "$env:USERPROFILE\.cargo\bin;$msvcBin;$sdkBin;$env:Path"
$env:LIB = "<msvc_lib>;<sdk_lib>\um;<sdk_lib>\ucrt"
$env:INCLUDE = "<msvc_include>;<sdk_include>\ucrt;<sdk_include>\um;<sdk_include>\shared"
```

具体路径因机器而异，可用 `vswhere` 查找。

## 📁 项目结构

```
ToDoList/
├── src/                      # React 前端
│   ├── components/           # UI 组件
│   │   ├── TaskCard.tsx      # 任务卡片（毛玻璃、拖拽、到期徽标）
│   │   ├── TaskList.tsx      # 拖拽排序列表
│   │   ├── TaskForm.tsx      # 添加任务表单
│   │   ├── TaskPopup.tsx     # 强制交互提醒弹窗
│   │   ├── FocusMode.tsx     # 番茄钟专注模式
│   │   ├── ConfettiEffect.tsx# 金色 confetti 动画
│   │   └── ui/               # Radix 基础组件
│   ├── stores/todoStore.ts   # Zustand 状态管理
│   └── lib/utils.ts          # 工具函数
├── src-tauri/                # Rust 后端
│   └── src/
│       ├── main.rs           # 入口（Tokio runtime）
│       ├── lib.rs            # Tauri 命令 + setup
│       ├── db.rs             # SQLite CRUD
│       ├── tray.rs           # 系统托盘
│       └── popup.rs          # 强制弹窗窗口管理
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tauri.conf.json
```

## 🗄 数据库

SQLite 文件 `hitodo.db` 保存在 exe 同目录下。体积极小（1000 条任务约 50KB），无需清理。

表结构：

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TEXT,           -- ISO 8601 格式
  completed INTEGER DEFAULT 0,
  snooze_until TEXT,       -- 稍后提醒截止时间
  sort_order INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
```

## ⚙️ 关键设计

### 强制提醒弹窗

独立 Tauri webview 窗口：
- `always_on_top: true` — 始终置顶
- `closable: false` — 无关闭按钮
- `decorations: false` — 无标题栏
- Rust 层拦截 `CloseRequested` 事件防止 Alt+F4

### 心跳检测

Tokio 定时器每 10 秒查询 SQLite，对比 `due_date` 与当前时间。日期比较使用 `REPLACE(due_date, 'T', ' ')` 统一 ISO 8601 与 SQLite datetime 格式。

### 托盘生命周期

TrayIcon 必须通过 `app.manage(tray)` 存储在应用状态中，否则作用域结束时被释放导致图标消失。

## 📄 License

MIT
