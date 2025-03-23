# CSS自定义器

![版本](https://img.shields.io/badge/版本-3.0-brightgreen.svg)
![许可证](https://img.shields.io/badge/许可证-MIT-blue.svg)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-v4.13+-blue.svg)

CSS自定义器是一个功能强大的油猴脚本，允许用户在任何网站上自定义CSS样式，提供直观的用户界面和丰富的功能，让网页浏览体验更加个性化和舒适。

## ✨ 特性

- 🎨 **实时CSS编辑**：即时预览和应用CSS更改
- 🌓 **暗黑模式支持**：内置暗黑模式界面，适应不同环境
- 📱 **响应式设计**：在桌面和移动设备上都能完美运行
- 💾 **预设管理**：创建、编辑、删除和应用CSS预设
- 📝 **代码高亮**：CSS语法高亮，提升编辑体验
- 🔍 **选择器范围限定**：精确控制CSS应用范围
- ⏱️ **历史记录**：支持撤销和重做，浏览历史版本
- 🔄 **导入/导出**：备份和恢复您的配置
- 🌐 **网站特定配置**：为不同网站保存不同的CSS设置
- ⌨️ **快捷键支持**：提高操作效率

## 📸 截图

![主界面](screenshots/main-interface.png)
![暗黑模式](screenshots/dark-mode.png)
![预设管理](screenshots/presets-management.png)
![历史记录](screenshots/history.png)

## 🚀 安装

1. 确保您已安装 [Tampermonkey](https://www.tampermonkey.net/) 或其他兼容的用户脚本管理器
2. [点击此处](https://github.com/ABUQWQ/Customize-CSS/blob/main/enhanced_script.js/) 安装脚本
3. 在弹出的Tampermonkey安装页面中点击"安装"

## 🔧 使用方法

### 基本使用

1. 在任意网页上按下 `Alt+C` 快捷键或点击Tampermonkey菜单中的"CSS自定义器"
2. 在编辑器中输入您想要的CSS样式
3. 点击"预览"按钮查看效果
4. 满意后点击"保存"按钮应用样式

### 预设管理

1. 切换到"预设管理"标签页
2. 输入预设名称和CSS内容
3. 点击"添加预设"按钮保存
4. 在预设列表中可以应用、编辑或删除预设

### 历史记录

1. 切换到"历史记录"标签页
2. 浏览之前应用过的CSS样式
3. 点击任意历史记录恢复该样式
4. 使用"上一个"和"下一个"按钮在历史记录中导航

### 导入/导出

1. 切换到"设置"标签页
2. 点击"导出配置"按钮保存当前配置
3. 复制生成的JSON或下载配置文件
4. 在其他设备上粘贴JSON到导入框并点击"导入配置"

## ⌨️ 快捷键

- `Alt+C` - 打开CSS自定义器
- `Ctrl+S` - 保存CSS（在对话框内）
- `Ctrl+P` - 预览CSS（在对话框内）
- `Ctrl+Z` - 撤销（在对话框内）
- `Ctrl+Y` - 重做（在对话框内）
- `Esc` - 关闭对话框

## 🛠️ 高级功能

### CSS选择器范围限定

默认情况下，CSS会应用到页面上的所有元素（使用 `*` 选择器）。您可以通过更改"CSS选择器范围"字段来限制CSS应用的范围，例如：

- `body` - 仅应用到body元素及其子元素
- `.article-content` - 仅应用到具有article-content类的元素
- `#main-container` - 仅应用到ID为main-container的元素

### 网站特定配置

启用此功能后，CSS自定义器会为每个网站保存不同的CSS设置。这意味着您可以为不同的网站应用不同的样式，而不会相互干扰。

## 🤝 贡献

欢迎贡献代码、报告问题或提出新功能建议！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 📄 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- 感谢所有贡献者和用户的支持
- 使用了 [highlight.js](https://highlightjs.org/) 提供代码高亮功能
