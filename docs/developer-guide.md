# 开发者文档

## 目录

1. [项目概述](#项目概述)
2. [技术架构](#技术架构)
3. [代码结构](#代码结构)
4. [核心功能实现](#核心功能实现)
5. [扩展指南](#扩展指南)
6. [贡献指南](#贡献指南)
7. [发布流程](#发布流程)

## 项目概述

CSS自定义器是一个用户脚本，允许用户自定义网页的CSS样式。它使用Tampermonkey API实现配置的存储和管理，并提供了丰富的功能，包括预设管理、历史记录、代码高亮等。

### 主要功能

- CSS样式自定义和应用
- 预设管理（添加、编辑、删除预设）
- CSS历史记录
- CSS选择器范围限定
- 代码高亮和格式化
- 导入/导出配置
- 网站特定配置
- 暗黑模式支持
- 快捷键支持

## 技术架构

CSS自定义器采用模块化设计，主要包括以下模块：

1. **配置管理**：处理脚本配置的存储和读取
2. **UI界面**：创建和管理用户界面
3. **CSS处理**：处理CSS的验证、过滤和应用
4. **预设管理**：管理CSS预设
5. **历史记录**：记录和恢复CSS历史
6. **事件处理**：处理用户交互事件

### 技术栈

- JavaScript (ES6+)
- Tampermonkey API
- highlight.js (用于代码高亮)

### 依赖项

- Tampermonkey浏览器扩展
- highlight.js库（通过CDN加载）

## 代码结构

脚本采用IIFE（立即调用函数表达式）模式组织代码，主要结构如下：

```javascript
(function() {
    'use strict';

    // 配置常量
    const CONFIG = { ... };

    // 默认CSS预设模板
    const DEFAULT_PRESETS = { ... };

    // 状态管理
    let state = { ... };

    // 工具函数
    const utils = { ... };

    // 核心CSS处理函数
    function applyCustomCSS() { ... }
    function removeStyleElements() { ... }
    function handleIFrames() { ... }
    function isSameOrigin() { ... }

    // 历史记录管理
    function addToHistory() { ... }
    function navigateHistory() { ... }

    // 预设管理
    function savePreset() { ... }
    function deletePreset() { ... }

    // UI创建函数
    function createDialog() { ... }
    function initializeDialog() { ... }
    function closeDialog() { ... }
    function toggleTheme() { ... }
    function switchTab() { ... }

    // 初始化函数
    function initialize() { ... }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
```

## 核心功能实现

### CSS应用机制

CSS应用是通过创建和插入`<style>`元素实现的：

```javascript
function applyCustomCSS(css, selector = state.cssSelector) {
    if (!css || typeof css !== 'string') {
        console.warn('Invalid CSS input');
        return;
    }

    try {
        const sanitizedCSS = utils.sanitizeCSS(css);
        
        removeStyleElements();

        const styleElement = document.createElement('style');
        styleElement.id = CONFIG.STYLE_ID;
        styleElement.textContent = `${selector} { ${sanitizedCSS} !important; }`;
        document.head?.appendChild(styleElement) || document.documentElement.appendChild(styleElement);

        handleIFrames(sanitizedCSS, selector);

        // 更新状态和保存配置
        // ...
    } catch (error) {
        console.error('应用CSS时发生错误:', error);
        utils.showNotification('应用CSS失败', 'error');
    }
}
```

### CSS安全过滤

为了防止潜在的安全风险，脚本会过滤掉可能有害的CSS属性：

```javascript
sanitizeCSS(css) {
    if (typeof css !== 'string') return '';
    return css.replace(
        /(position:\s*fixed|position:\s*absolute|content:|behavior:|expression|javascript:)/gi,
        ''
    );
}
```

### 存储机制

脚本使用Tampermonkey的存储API保存配置：

```javascript
// 保存CSS
GM_setValue(CONFIG.STORAGE_KEYS.CURRENT_CSS, sanitizedCSS);

// 读取CSS
const savedCSS = GM_getValue(CONFIG.STORAGE_KEYS.CURRENT_CSS, '');
```

### 历史记录实现

历史记录功能通过数组实现，记录每次CSS变更：

```javascript
function addToHistory(css) {
    // 获取当前历史记录
    let history = GM_getValue(CONFIG.STORAGE_KEYS.HISTORY, []);
    
    // 如果当前CSS与最新历史记录相同，则不添加
    if (history.length > 0 && history[history.length - 1].css === css) {
        return;
    }
    
    // 添加新记录
    history.push({
        css: css,
        selector: state.cssSelector,
        timestamp: Date.now()
    });
    
    // 限制历史记录数量
    if (history.length > CONFIG.MAX_HISTORY) {
        history = history.slice(history.length - CONFIG.MAX_HISTORY);
    }
    
    // 保存历史记录
    GM_setValue(CONFIG.STORAGE_KEYS.HISTORY, history);
    state.cssHistory = history;
    state.historyPosition = history.length - 1;
}
```

### 代码高亮实现

代码高亮使用highlight.js库实现：

```javascript
function applyCodeHighlighting(textarea) {
    // 创建高亮容器
    const highlightContainer = document.createElement('div');
    // ...

    // 更新高亮
    function updateHighlight() {
        const code = textarea.value;
        highlightContainer.innerHTML = `<pre><code class="language-css">${code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
        hljs.highlightElement(highlightContainer.querySelector('code'));
        
        // 设置前景色
        const foregroundColor = currentTheme === 'light' ? '#333' : '#e0e0e0';
        highlightContainer.querySelectorAll('code *:not(.hljs-comment):not(.hljs-keyword):not(.hljs-string):not(.hljs-number)').forEach(el => {
            el.style.color = foregroundColor;
        });
    }
    
    // 初始更新
    updateHighlight();
    
    // 监听输入
    textarea.addEventListener('input', updateHighlight);
}
```

## 扩展指南

### 添加新功能

要添加新功能，请按照以下步骤操作：

1. 在适当的模块中添加新函数
2. 更新状态管理对象（如需要）
3. 更新UI界面（如需要）
4. 添加事件处理程序
5. 更新配置常量（如需要）

例如，添加新的CSS效果预览功能：

```javascript
// 添加预览函数
function previewCSSEffect(css, selector) {
    // 实现预览逻辑
}

// 更新UI
function createDialog() {
    // ...
    const previewEffectBtn = document.createElement('button');
    previewEffectBtn.textContent = '预览效果';
    // ...
}

// 添加事件处理
previewEffectBtn.addEventListener('click', () => {
    previewCSSEffect(cssInput.value, selectorInput.value);
});
```

### 修改现有功能

修改现有功能时，请确保：

1. 保持向后兼容性
2. 更新相关文档
3. 添加适当的注释
4. 测试修改后的功能

### 添加新的预设模板

要添加新的预设模板，只需更新`DEFAULT_PRESETS`对象：

```javascript
const DEFAULT_PRESETS = {
    '默认': 'font-family: "Microsoft YaHei", sans-serif; font-size: 16px;',
    '阅读模式': 'font-family: "Noto Serif SC", serif; font-size: 18px; line-height: 1.8; color: #333; background-color: #f8f5f0;',
    // 添加新预设
    '新预设': 'font-family: "Your Font", sans-serif; font-size: 17px; color: #444;'
};
```

## 贡献指南

详细的贡献指南请参阅[CONTRIBUTING.md](../CONTRIBUTING.md)文件。

### 代码风格

- 使用2个空格进行缩进
- 使用单引号而非双引号（除非必要）
- 变量和函数名使用驼峰命名法
- 添加适当的注释，特别是对于复杂的逻辑

### 提交PR流程

1. Fork仓库
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

### 测试指南

在提交PR之前，请确保：

1. 在多个浏览器中测试您的更改
2. 在不同类型的网站上测试
3. 验证所有现有功能仍然正常工作
4. 检查是否有控制台错误

## 发布流程

### 版本号规范

CSS自定义器使用语义化版本号（[SemVer](https://semver.org/)）：

- 主版本号：不兼容的API变更
- 次版本号：向后兼容的功能性新增
- 修订号：向后兼容的问题修正

### 发布步骤

1. 更新版本号（在脚本头部的`@version`标签）
2. 更新CHANGELOG.md
3. 创建新的发布标签
4. 更新README.md中的安装链接（如需要）

### 发布检查清单

- [ ] 版本号已更新
- [ ] 更新日志已更新
- [ ] 所有测试已通过
- [ ] 文档已更新
- [ ] 代码已审查

---

如有任何问题或建议，请通过GitHub Issues或发送邮件至example@example.com联系我们。
