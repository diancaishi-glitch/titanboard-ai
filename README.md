# TitanBoard AI 投资导师

这是一个基于 React + Vite + Google Gemini API 的 AI 投资辅助应用。

## 本地部署指南

### 1. 环境准备
确保您的电脑已安装 [Node.js](https://nodejs.org/) (建议 v18 或更高版本)。

### 2. 安装依赖
在项目根目录下打开终端，运行：
```bash
npm install
```

### 3. 配置 API Key
1. 将 `.env.example` 文件复制并重命名为 `.env`。
2. 编辑 `.env` 文件，填入您的 Google Gemini API Key：
   ```
   API_KEY=your_actual_api_key_here
   ```
   *注意：请确保从 [Google AI Studio](https://aistudio.google.com/) 获取有效的 API Key。*

### 4. 启动项目
运行开发服务器：
```bash
npm run dev
```
启动后，访问终端显示的地址（通常是 `http://localhost:3000` 或 `http://localhost:5173`）。

## 故障排除
- 如果遇到模块导入错误，请尝试删除 `node_modules` 文件夹和 `package-lock.json` 文件，然后重新运行 `npm install`。
- 确保端口未被占用。
