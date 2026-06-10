# DAEEE・同行集 - 情侣旅行记录平台

一路记账，一路写风，把朝夕与旅途都收好

## 项目简介

DAEEE・同行集是一个专为情侣打造的旅行记录平台，帮助情侣记录每一次旅行的美好瞬间。

## 功能特色

- **旅行日记** - 记录旅途中的点点滴滴
- **足迹地图** - 在地图上标记去过的城市和景点
- **情侣账本** - 共同记录旅行开销
- **行程规划** - 规划下一次旅行
- **心愿清单** - 记录想去的地方和想做的事
- **素材相册** - 珍藏旅行照片和视频
- **旅途印章集** - 收集每座城市的专属印章

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **后端**: Node.js, Express.js
- **数据库**: MySQL (支持内存数据后备)
- **地图**: 高德地图 API
- **认证**: JWT

## 快速开始

### 环境要求

- Node.js >= 14.0.0
- MySQL >= 5.7 (可选，未配置时使用内存数据)

### 安装依赖

```bash
npm install
```

### 配置数据库 (可选)

1. 创建 MySQL 数据库 `daeee_travel`
2. 导入数据库初始化脚本 `database/db_init.sql`
3. 修改 `server.js` 中的数据库连接配置

### 运行项目

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

访问 http://localhost:3000 即可查看应用

### 默认账号

- 用户名: `root`
- 密码: `123456`

## 项目结构

```
.
├── index.html          # 主页面
├── server.js           # 后端服务器
├── package.json        # 项目配置
├── .gitignore          # Git 忽略配置
├── styles/
│   └── global.css      # 全局样式
├── scripts/
│   └── main.js         # 前端脚本
├── database/
│   └── db_init.sql     # 数据库初始化脚本
└── public/
    └── uploads/        # 图片上传目录
```

## 部署指南

### 部署到 Vercel / Netlify

由于本项目包含 Node.js 后端，推荐使用支持 Node.js 的平台：

1. **Vercel**:
   - 连接 GitHub 仓库
   - 设置构建命令: `npm install`
   - 设置启动命令: `npm start`

2. **Heroku**:
   - 使用 Heroku CLI 部署
   - 配置环境变量

### 绑定域名 daeee.xyz

1. 在域名注册商处添加 A 记录或 CNAME 记录指向服务器
2. 在部署平台配置自定义域名
3. 配置 HTTPS (推荐使用 Let's Encrypt)

## API 接口

### 认证接口

- `POST /api/login` - 用户登录
- `POST /api/register` - 用户注册

### 城市接口

- `GET /api/cities` - 获取城市列表

### 足迹接口

- `GET /api/footprints/:cityId` - 获取城市足迹
- `POST /api/footprints` - 添加足迹点
- `DELETE /api/footprints/:id` - 删除足迹点

### 到访城市接口

- `GET /api/visited-cities` - 获取到访城市
- `DELETE /api/visited-cities/:cityId` - 删除到访城市

### 印章接口

- `GET /api/stamps` - 获取印章集

### 统计接口

- `GET /api/statistics/:userId` - 获取用户统计

## 开发说明

### 高德地图 API

需要在 `index.html` 中配置高德地图 API Key:

```html
<script src="https://webapi.amap.com/maps?v=1.4.15&key=您的APIKey"></script>
```

### 内存数据模式

当 MySQL 连接失败时，系统会自动切换到内存数据存储模式，适合开发和测试环境。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

---

**DAEEE・同行集** - 记录每一段美好的旅途时光 ❤️
