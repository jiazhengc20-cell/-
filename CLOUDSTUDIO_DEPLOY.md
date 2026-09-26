# 咕噜咕噜的愿望箱：Cloud Studio 发布说明

这个项目是纯静态网站，入口文件是 `index.html`，数据默认保存在浏览器本地 `localStorage`。愿望箱里已经内置“导出进度 / 导入进度”，可以把 JSON 备份文件保存到网盘或同步盘。

## 在 Cloud Studio 里预览

1. 把整个项目文件夹上传或提交到仓库。
2. 在 Cloud Studio 打开项目。
3. 运行：

   ```bash
   python3 -m http.server 8080
   ```

4. 打开 Cloud Studio 的 8080 预览地址。
5. 用安卓或 iPhone 扫描/打开这个预览地址即可测试手机效果。

Cloud Studio 的预览地址更适合开发测试；如果希望长期稳定给她访问，建议继续发布到正式静态托管。

## 发布成长期公网网站

推荐路线：

1. 把本项目推到 Git 仓库。
2. 使用腾讯云 EdgeOne Pages、CloudBase 静态网站托管，或其他静态托管服务。
3. 构建命令留空。
4. 发布目录填写项目根目录：`.`
5. 入口文件保持 `index.html`。

## 手机访问注意

- 网站已经包含响应式布局，安卓和 iPhone 浏览器都可以访问。
- 字体文件已放在 `assets/fonts/ZCOOL-KuaiLe.ttf`，不用依赖 Google Fonts。
- 如果要两个人真正共享同一份愿望数据，后续需要接数据库/登录；当前版本是“每个浏览器一份本地数据 + 可导入导出备份”。
