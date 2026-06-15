# GitHub Pages 部署说明：以哆啦A梦时光机为例

这份文档用当前项目 `doraemon-time-machine` 做例子，说明一个网页项目如何从本地文件夹变成任何网络下都能访问的公网网站。

当前项目的公网地址：

```text
https://sidzz0.github.io/doraemon-time-machine/
```

当前项目的 GitHub 仓库：

```text
https://github.com/sidzz0/doraemon-time-machine
```

## 1. 先理解整个链路

这个项目本质上是一个静态网页应用。它最后会被构建成一堆静态文件：

```text
dist/
  index.html
  assets/*.js
  assets/*.css
  assets/*.png
  assets/*.mp3
```

浏览器访问网站时，不需要服务器运行 Node.js，也不需要 VSCode。浏览器只需要下载这些静态文件，然后在用户设备上运行 JavaScript。

完整链路是：

```text
本地代码
  -> git commit
  -> git push 到 GitHub 仓库
  -> GitHub Actions 自动运行 npm run build
  -> 生成 dist 静态文件
  -> GitHub Pages 托管 dist
  -> 用户访问 https://sidzz0.github.io/doraemon-time-machine/
```

为什么不同网络下的人都能打开？

因为最终网站不是运行在你的电脑上，而是托管在 GitHub 的服务器上。别人访问的是 `sidzz0.github.io` 这个公网域名，浏览器会通过 DNS 找到 GitHub Pages 的服务器，再从 GitHub 下载网页文件。你的电脑可以关机，网站仍然能访问。

## 2. 本地预览和公网访问的区别

开发时我们会用本地地址：

```text
http://127.0.0.1:5173/
```

或者局域网地址：

```text
http://192.168.5.92:5173/
```

它们和公网地址完全不是一回事。

`127.0.0.1` 只代表当前设备自己。你电脑打开时，它指的是电脑自己；手机打开时，它指的是手机自己。所以手机访问电脑上的 `127.0.0.1` 会失败。

`192.168.x.x` 是局域网地址。手机和电脑在同一个 Wi-Fi 下时可能能访问，但换一个网络就不行。

`https://sidzz0.github.io/doraemon-time-machine/` 是公网地址。它由 GitHub Pages 提供，任何能访问 GitHub Pages 的网络都可以打开。

## 3. 项目中和部署有关的文件

### `package.json`

这个文件定义了开发和构建命令：

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc && vite build",
    "preview": "vite preview --host 0.0.0.0"
  }
}
```

关键命令是：

```bash
npm run build
```

它会把源码构建成 `dist/` 目录。GitHub Pages 最终托管的就是这个构建结果。

### `vite.config.ts`

当前配置是：

```ts
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
});
```

`base: "./"` 的作用是让构建后的资源使用相对路径。

这个项目发布在：

```text
https://sidzz0.github.io/doraemon-time-machine/
```

它不是域名根目录，而是 `/doraemon-time-machine/` 这个子路径。使用相对路径可以避免 CSS、JS、图片、音乐文件在 GitHub Pages 上找不到。

### `.github/workflows/deploy.yml`

这是自动部署配置：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

它做了两件事：

1. `build`：下载代码、安装依赖、运行 `npm run build`、把 `dist/` 打包成 Pages artifact。
2. `deploy`：把 artifact 发布到 GitHub Pages。

## 4. 第一次配置 GitHub Pages 的全过程

下面是用这个项目实际走过的流程。

### 第一步：本地准备代码

在项目目录里确认能构建：

```bash
npm install
npm run build
```

如果构建成功，会生成：

```text
dist/
```

### 第二步：创建 GitHub 仓库

在 GitHub 新建一个仓库：

```text
doraemon-time-machine
```

本项目仓库是：

```text
https://github.com/sidzz0/doraemon-time-machine
```

### 第三步：提交并推送代码

本地执行：

```bash
git add .
git commit -m "Build Doraemon time machine web app"
git branch -M main
git remote add origin https://github.com/sidzz0/doraemon-time-machine.git
git push -u origin main
```

以后改完代码后，一般只需要：

```bash
git add .
git commit -m "你的修改说明"
git push
```

### 第四步：启用 GitHub Pages

进入 GitHub 仓库页面：

```text
https://github.com/sidzz0/doraemon-time-machine
```

依次进入：

```text
Settings -> Pages
```

在 `Build and deployment` 里，把 `Source` 设置为：

```text
GitHub Actions
```

这一步很重要。如果 Pages 没启用，workflow 可能会构建成功，但部署失败，并提示类似：

```text
Ensure GitHub Pages has been enabled
```

### 第五步：等待 Actions 部署完成

进入：

```text
Actions
```

可以看到 `Deploy to GitHub Pages` 这个 workflow。

成功时会显示：

```text
completed successfully
```

失败时点进去看红色日志，常见原因包括：

- Pages 没切到 GitHub Actions
- `npm run build` 失败
- `dist/` 不存在
- 资源路径配置不对

### 第六步：打开公网地址

项目页面地址格式是：

```text
https://用户名.github.io/仓库名/
```

所以这个项目是：

```text
https://sidzz0.github.io/doraemon-time-machine/
```

## 5. 为什么不用“Deploy from a branch”

GitHub Pages 有两种常见发布方式：

1. 从分支发布，比如直接发布 `main` 分支里的 `/docs` 文件夹。
2. 用 GitHub Actions 构建后发布。

这个项目使用 Vite 和 TypeScript，源码不能直接丢给浏览器完整运行。它需要先执行：

```bash
npm run build
```

构建后的 `dist/` 才是最终网页。

所以更适合使用 GitHub Actions：

```text
源码在 main 分支
Actions 自动构建 dist
Pages 发布 dist
```

这样仓库里不用提交 `dist/`，每次更新源码后，GitHub 会自动重新构建和部署。

## 6. 以后怎么更新网站

改完代码后，按这个流程：

```bash
npm run build
git status
git add .
git commit -m "说明这次改了什么"
git push
```

然后去 GitHub 仓库的 `Actions` 页面等待部署完成。

部署完成后，刷新公网地址：

```text
https://sidzz0.github.io/doraemon-time-machine/
```

如果浏览器缓存了旧版本，可以加一个临时参数强制刷新：

```text
https://sidzz0.github.io/doraemon-time-machine/?v=2
```

这个 `?v=2` 不改变网站功能，只是让浏览器把它当成一个新 URL，减少缓存影响。

## 7. 为什么别人不需要 VSCode

VSCode、Node.js、npm、Vite 都只是开发工具。

开发时需要它们：

```text
写代码 -> 安装依赖 -> 构建 dist
```

别人访问网站时不需要它们，因为 GitHub Pages 已经托管了构建好的文件：

```text
index.html
CSS
JavaScript
图片
音乐
```

用户浏览器只负责下载和运行这些静态文件。

## 8. 这个项目里的音乐和图片为什么也能访问

素材放在：

```text
public/assets/
```

比如：

```text
public/assets/doraemon-song.mp3
public/assets/doraemon.png
public/assets/time-machine.png
```

Vite 构建时会把 `public/` 里的资源复制到最终网站根目录。

所以公网中可以访问：

```text
https://sidzz0.github.io/doraemon-time-machine/assets/doraemon-song.mp3
```

只要资源被提交到 GitHub，并且 Pages 部署成功，别人打开网站时也能加载这些资源。

## 9. 常见问题

### 手机上打不开 `127.0.0.1`

正常。`127.0.0.1` 只代表当前设备自己。

手机要访问本地电脑预览，需要电脑和手机在同一个 Wi-Fi，并访问电脑的局域网 IP，例如：

```text
http://192.168.5.92:5173/
```

但真正分享给别人，应该用 GitHub Pages 公网地址。

### GitHub Pages 显示 404

可能原因：

- Actions 还没部署完成
- Pages 没启用
- 仓库名或 URL 拼错
- 刚部署完，GitHub Pages 还没完全刷新

先看：

```text
Actions -> Deploy to GitHub Pages
```

确认最新一次是绿色成功。

### 图片、CSS、JS 或音乐丢失

Vite 项目发布到 GitHub Pages 子路径时，资源路径很容易出问题。

本项目用：

```ts
base: "./"
```

来避免资源路径指向域名根目录。

### 手机 BGM 不能自动播放

这是移动浏览器限制，不是 GitHub Pages 问题。手机浏览器通常不允许网页在用户没有点击的情况下直接播放有声音的音乐。

本项目的处理方式是：

- 尝试自动播放
- 点击页面或点击“开始穿越”时启动 BGM
- 右下角提供 `BGM` 按钮手动播放/暂停

按钮音效能响，是因为它发生在用户点击按钮之后；BGM 也要借助用户点击才能在手机上稳定播放。

## 10. 参考资料

- GitHub Docs：配置 GitHub Pages 发布源  
  https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- GitHub Docs：创建 GitHub Pages 站点  
  https://docs.github.com/articles/creating-project-pages-manually
- GitHub Docs：使用自定义 GitHub Actions workflow 发布 Pages  
  https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- `actions/upload-pages-artifact`  
  https://github.com/actions/upload-pages-artifact
- `actions/deploy-pages`  
  https://github.com/actions/deploy-pages
