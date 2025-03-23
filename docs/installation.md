# 安装指南

## 安装方法

### 方法一：通过Tampermonkey安装（推荐）

1. 首先，确保您已经安装了Tampermonkey浏览器扩展：
   - [Chrome版Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox版Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Edge版Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
   - [Safari版Tampermonkey](https://apps.apple.com/app/tampermonkey/id1482490089)
   - [Opera版Tampermonkey](https://addons.opera.com/en/extensions/details/tampermonkey-beta/)

2. 安装CSS自定义器脚本：
   - 点击以下链接安装脚本：[安装CSS自定义器](https://github.com/username/css-customizer/raw/main/src/css-customizer.user.js)
   - 在打开的Tampermonkey安装页面中，点击"安装"按钮
   - 安装完成后，您将看到一条确认消息

### 方法二：手动安装

1. 首先，确保您已经安装了Tampermonkey浏览器扩展（参见上方链接）

2. 下载脚本文件：
   - 访问[GitHub仓库](https://github.com/username/css-customizer)
   - 下载`src/css-customizer.user.js`文件到本地

3. 在Tampermonkey中安装：
   - 打开Tampermonkey扩展
   - 点击"添加新脚本"选项卡
   - 删除编辑器中的默认代码
   - 将下载的脚本内容复制粘贴到编辑器中
   - 点击"文件" > "保存"

## 验证安装

安装完成后，您可以通过以下步骤验证脚本是否正确安装：

1. 访问任意网页
2. 按下`Alt+C`快捷键或点击Tampermonkey菜单中的"CSS自定义器"选项
3. 如果CSS自定义器对话框成功打开，则表示安装成功

## 更新说明

CSS自定义器支持自动更新。当有新版本发布时，Tampermonkey会自动检测并提示您更新。

您也可以手动检查更新：
1. 打开Tampermonkey扩展
2. 进入"已安装的脚本"选项卡
3. 点击"检查更新"按钮

## 卸载方法

如果您需要卸载CSS自定义器，请按照以下步骤操作：

1. 打开Tampermonkey扩展
2. 进入"已安装的脚本"选项卡
3. 找到"CSS自定义器"脚本
4. 点击垃圾桶图标删除脚本

## 常见问题

### 脚本安装后没有反应

- 确保Tampermonkey扩展已启用
- 尝试刷新页面
- 检查浏览器控制台是否有错误信息

### 脚本与其他用户脚本冲突

- 尝试暂时禁用其他可能冲突的用户脚本
- 检查是否有其他CSS修改脚本正在运行

### 无法在某些网站上使用

某些网站可能使用内容安全策略(CSP)限制用户脚本的运行。在这些网站上，CSS自定义器可能无法正常工作。

## 支持与反馈

如果您在安装或使用过程中遇到任何问题，请通过以下方式获取支持：

- 在[GitHub Issues](https://github.com/username/css-customizer/issues)提交问题
- 发送邮件至：example@example.com

---

感谢您安装CSS自定义器！希望它能帮助您创建更舒适的网页浏览体验。
