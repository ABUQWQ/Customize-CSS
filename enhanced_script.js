// ==UserScript==
// @name         CSS自定义器
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  强大的CSS自定义工具，支持预设管理、暗黑模式、代码高亮和多种高级功能
// @author       Abu_Sensei
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_setClipboard
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// @resource     HIGHLIGHT_CSS https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/default.min.css
// @resource     HIGHLIGHT_DARK_CSS https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css
// @require      https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/languages/css.min.js
// ==/UserScript==

(function() {
    'use strict';

    // 配置常量
    const CONFIG = {
        STYLE_ID: 'custom-css-style',
        DEFAULT_CSS: '',
        ANIMATION_DURATION: 300,
        OBSERVER_THROTTLE: 100,
        MAX_HISTORY: 20,
        STORAGE_KEYS: {
            CURRENT_CSS: 'customCSS',
            PRESETS: 'cssPresets',
            HISTORY: 'cssHistory',
            SITE_SPECIFIC: 'siteCssConfig',
            THEME: 'uiTheme',
            SELECTOR: 'cssSelector'
        }
    };

    // 默认CSS预设模板
    const DEFAULT_PRESETS = {
        '默认': 'font-family: "Microsoft YaHei", sans-serif; font-size: 16px;',
        '阅读模式': 'font-family: "Noto Serif SC", serif; font-size: 18px; line-height: 1.8; color: #333; background-color: #f8f5f0;',
        '代码模式': 'font-family: "Fira Code", monospace; font-size: 14px; line-height: 1.5;',
        '舒适模式': 'font-family: "Open Sans", sans-serif; font-size: 16px; line-height: 1.6; letter-spacing: 0.5px; color: #444;',
        '护眼模式': 'background-color: #f0f5e5 !important; color: #333 !important; font-size: 16px; line-height: 1.6;',
        '暗黑模式': 'background-color: #222 !important; color: #e0e0e0 !important; font-family: system-ui, -apple-system, sans-serif;'
    };

    // 状态管理
    let state = {
        cssApplied: false,
        currentCSS: null,
        cssHistory: [],
        historyPosition: -1,
        presets: {},
        theme: 'light',
        cssSelector: '*',
        isDialogOpen: false
    };

    // 工具函数
    const utils = {
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        sanitizeCSS(css) {
            if (typeof css !== 'string') return '';
            return css.replace(
                /(position:\s*fixed|position:\s*absolute|content:|behavior:|expression|javascript:)/gi,
                ''
            );
        },

        validateCSS(css) {
            try {
                const testElement = document.createElement('style');
                testElement.textContent = css;
                document.head.appendChild(testElement);
                document.head.removeChild(testElement);
                return true;
            } catch (error) {
                console.error('CSS验证失败:', error);
                return false;
            }
        },

        getCurrentDomain() {
            return window.location.hostname;
        },

        formatDate(date) {
            return new Intl.DateTimeFormat('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).format(date);
        },

        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `css-customizer-notification ${type}`;
            notification.textContent = message;
            
            const style = document.createElement('style');
            style.textContent = `
                .css-customizer-notification {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 8px;
                    color: white;
                    font-family: system-ui, -apple-system, sans-serif;
                    font-size: 14px;
                    z-index: 10001;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.3s, transform 0.3s;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                .css-customizer-notification.info {
                    background-color: #2196F3;
                }
                .css-customizer-notification.success {
                    background-color: #4CAF50;
                }
                .css-customizer-notification.error {
                    background-color: #F44336;
                }
                .css-customizer-notification.warning {
                    background-color: #FF9800;
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(notification);
            
            // 触发重排以应用动画
            void notification.offsetWidth;
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
            
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    document.body.removeChild(notification);
                    document.head.removeChild(style);
                }, 300);
            }, 3000);
        },

        copyToClipboard(text) {
            GM_setClipboard(text);
            utils.showNotification('已复制到剪贴板', 'success');
        },

        // 导出配置为JSON
        exportConfig() {
            const config = {
                currentCSS: GM_getValue(CONFIG.STORAGE_KEYS.CURRENT_CSS, ''),
                presets: GM_getValue(CONFIG.STORAGE_KEYS.PRESETS, {}),
                history: GM_getValue(CONFIG.STORAGE_KEYS.HISTORY, []),
                siteSpecific: GM_getValue(CONFIG.STORAGE_KEYS.SITE_SPECIFIC, {}),
                theme: GM_getValue(CONFIG.STORAGE_KEYS.THEME, 'light'),
                selector: GM_getValue(CONFIG.STORAGE_KEYS.SELECTOR, '*')
            };
            
            const jsonString = JSON.stringify(config, null, 2);
            utils.copyToClipboard(jsonString);
            
            // 创建下载链接
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'css-customizer-config.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        // 导入配置
        importConfig(jsonString) {
            try {
                const config = JSON.parse(jsonString);
                
                if (config.currentCSS !== undefined) {
                    GM_setValue(CONFIG.STORAGE_KEYS.CURRENT_CSS, config.currentCSS);
                }
                
                if (config.presets !== undefined) {
                    GM_setValue(CONFIG.STORAGE_KEYS.PRESETS, config.presets);
                }
                
                if (config.history !== undefined) {
                    GM_setValue(CONFIG.STORAGE_KEYS.HISTORY, config.history);
                }
                
                if (config.siteSpecific !== undefined) {
                    GM_setValue(CONFIG.STORAGE_KEYS.SITE_SPECIFIC, config.siteSpecific);
                }
                
                if (config.theme !== undefined) {
                    GM_setValue(CONFIG.STORAGE_KEYS.THEME, config.theme);
                }
                
                if (config.selector !== undefined) {
                    GM_setValue(CONFIG.STORAGE_KEYS.SELECTOR, config.selector);
                }
                
                utils.showNotification('配置导入成功，刷新页面以应用更改', 'success');
                return true;
            } catch (error) {
                console.error('配置导入失败:', error);
                utils.showNotification('配置导入失败，请检查JSON格式', 'error');
                return false;
            }
        }
    };

    // 核心CSS处理函数
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

            if (!state.cssApplied) {
                state.cssApplied = true;
            }

            state.currentCSS = sanitizedCSS;
            
            // 保存到历史记录
            addToHistory(sanitizedCSS);
            
            // 保存当前CSS
            GM_setValue(CONFIG.STORAGE_KEYS.CURRENT_CSS, sanitizedCSS);
            
            // 保存当前选择器
            GM_setValue(CONFIG.STORAGE_KEYS.SELECTOR, selector);
            state.cssSelector = selector;
            
            // 如果启用了网站特定配置，则保存
            const siteConfig = GM_getValue(CONFIG.STORAGE_KEYS.SITE_SPECIFIC, {});
            const currentDomain = utils.getCurrentDomain();
            siteConfig[currentDomain] = { css: sanitizedCSS, selector: selector };
            GM_setValue(CONFIG.STORAGE_KEYS.SITE_SPECIFIC, siteConfig);
        } catch (error) {
            console.error('应用CSS时发生错误:', error);
            utils.showNotification('应用CSS失败', 'error');
        }
    }

    function removeStyleElements() {
        const styleElements = document.querySelectorAll(`#${CONFIG.STYLE_ID}`);
        styleElements.forEach(element => element.remove());
    }

    function handleIFrames(css, selector) {
        try {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                // 跳过跨域iframe
                if (!isSameOrigin(iframe)) {
                    return;
                }
                
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (iframeDoc) {
                        const existingStyle = iframeDoc.querySelector(`#${CONFIG.STYLE_ID}`);
                        if (existingStyle) {
                            existingStyle.remove();
                        }
                        const styleElement = iframeDoc.createElement('style');
                        styleElement.id = CONFIG.STYLE_ID;
                        styleElement.textContent = `${selector} { ${css} !important; }`;
                        iframeDoc.head.appendChild(styleElement);
                    }
                } catch (e) {
                    // 静默处理单个iframe的错误
                    return;
                }
            });
        } catch (e) {
            // 静默处理整体错误
            return;
        }
    }

    // 检查iframe是否同源
    function isSameOrigin(iframe) {
        try {
            // 尝试访问iframe的window对象
            const test = !!iframe.contentWindow.location.href;
            return true;
        } catch (e) {
            return false;
        }
    }

    // 历史记录管理
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

    function navigateHistory(direction) {
        // 获取历史记录
        const history = GM_getValue(CONFIG.STORAGE_KEYS.HISTORY, []);
        
        if (history.length === 0) {
            return;
        }
        
        // 计算新位置
        let newPosition = state.historyPosition + direction;
        
        // 边界检查
        if (newPosition < 0) {
            newPosition = 0;
            utils.showNotification('已经是最早的记录', 'info');
            return;
        }
        
        if (newPosition >= history.length) {
            newPosition = history.length - 1;
            utils.showNotification('已经是最新的记录', 'info');
            return;
        }
        
        // 更新位置
        state.historyPosition = newPosition;
        
        // 应用历史记录
        const historyItem = history[newPosition];
        applyCustomCSS(historyItem.css, historyItem.selector);
        
        // 显示通知
        const timeString = utils.formatDate(new Date(historyItem.timestamp));
        utils.showNotification(`已恢复到 ${timeString} 的样式`, 'info');
    }

    // 预设管理
    function savePreset(name, css) {
        if (!name || !css) {
            utils.showNotification('预设名称和CSS不能为空', 'error');
            return false;
        }
        
        // 获取当前预设
        let presets = GM_getValue(CONFIG.STORAGE_KEYS.PRESETS, {});
        
        // 添加或更新预设
        presets[name] = css;
        
        // 保存预设
        GM_setValue(CONFIG.STORAGE_KEYS.PRESETS, presets);
        state.presets = presets;
        
        utils.showNotification(`预设 "${name}" 已保存`, 'success');
        return true;
    }

    function deletePreset(name) {
        // 获取当前预设
        let presets = GM_getValue(CONFIG.STORAGE_KEYS.PRESETS, {});
        
        // 检查预设是否存在
        if (!presets[name]) {
            utils.showNotification(`预设 "${name}" 不存在`, 'error');
            return false;
        }
        
        // 删除预设
        delete presets[name];
        
        // 保存预设
        GM_setValue(CONFIG.STORAGE_KEYS.PRESETS, presets);
        state.presets = presets;
        
        utils.showNotification(`预设 "${name}" 已删除`, 'success');
        return true;
    }

    // UI创建函数
    function createDialog() {
        // 如果对话框已经打开，则返回
        if (state.isDialogOpen) {
            return;
        }
        
        state.isDialogOpen = true;
        
        // 获取当前主题
        const currentTheme = GM_getValue(CONFIG.STORAGE_KEYS.THEME, 'light');
        state.theme = currentTheme;
        
        // 创建对话框容器
        const dialog = document.createElement('div');
        dialog.id = 'css-customizer-dialog';
        dialog.className = `css-customizer-dialog theme-${currentTheme}`;
        
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'css-customizer-overlay';
        document.body.appendChild(overlay);
        
        // 设置对话框HTML内容
        dialog.innerHTML = `
            <style>
                /* 基础样式 */
                .css-customizer-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 9999;
                    animation: fadeIn 0.3s ease-out;
                }
                
                .css-customizer-dialog {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    border-radius: 12px;
                    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
                    z-index: 10000;
                    animation: dialogEnter 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                
                /* 亮色主题 */
                .css-customizer-dialog.theme-light {
                    background-color: #ffffff;
                    color: #333333;
                }
                
                /* 暗色主题 */
                .css-customizer-dialog.theme-dark {
                    background-color: #2d2d2d;
                    color: #e0e0e0;
                }
                
                /* 动画 */
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes dialogEnter {
                    from { 
                        opacity: 0; 
                        transform: translate(-50%, -60%) scale(0.95);
                    }
                    to { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
                
                /* 对话框头部 */
                .dialog-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    border-bottom: 1px solid;
                }
                
                .theme-light .dialog-header {
                    border-color: #e0e0e0;
                    background-color: #f9f9f9;
                }
                
                .theme-dark .dialog-header {
                    border-color: #444;
                    background-color: #333;
                }
                
                .dialog-title {
                    font-size: 20px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .theme-light .dialog-title {
                    color: #6200ea;
                }
                
                .theme-dark .dialog-title {
                    color: #bb86fc;
                }
                
                .dialog-controls {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }
                
                .theme-toggle {
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 50%;
                    transition: background-color 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .theme-light .theme-toggle:hover {
                    background-color: rgba(0, 0, 0, 0.05);
                }
                
                .theme-dark .theme-toggle:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }
                
                .close-btn {
                    cursor: pointer;
                    font-size: 24px;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.2s;
                }
                
                .theme-light .close-btn {
                    color: #666;
                }
                
                .theme-light .close-btn:hover {
                    background-color: rgba(0, 0, 0, 0.05);
                    color: #333;
                }
                
                .theme-dark .close-btn {
                    color: #aaa;
                }
                
                .theme-dark .close-btn:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: #fff;
                }
                
                /* 对话框内容 */
                .dialog-content {
                    display: flex;
                    flex-direction: column;
                    padding: 20px;
                    overflow-y: auto;
                    flex: 1;
                }
                
                /* 标签页 */
                .tabs {
                    display: flex;
                    border-bottom: 1px solid;
                    margin-bottom: 20px;
                }
                
                .theme-light .tabs {
                    border-color: #e0e0e0;
                }
                
                .theme-dark .tabs {
                    border-color: #444;
                }
                
                .tab {
                    padding: 10px 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border-bottom: 2px solid transparent;
                    font-weight: 500;
                }
                
                .theme-light .tab {
                    color: #666;
                }
                
                .theme-light .tab:hover {
                    color: #6200ea;
                    background-color: rgba(98, 0, 234, 0.05);
                }
                
                .theme-light .tab.active {
                    color: #6200ea;
                    border-color: #6200ea;
                }
                
                .theme-dark .tab {
                    color: #aaa;
                }
                
                .theme-dark .tab:hover {
                    color: #bb86fc;
                    background-color: rgba(187, 134, 252, 0.1);
                }
                
                .theme-dark .tab.active {
                    color: #bb86fc;
                    border-color: #bb86fc;
                }
                
                /* 标签页内容 */
                .tab-content {
                    display: none;
                }
                
                .tab-content.active {
                    display: block;
                }
                
                /* 表单元素 */
                .form-group {
                    margin-bottom: 16px;
                }
                
                .form-label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                }
                
                .form-control {
                    width: 100%;
                    padding: 10px 12px;
                    border-radius: 6px;
                    border: 1px solid;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                
                .theme-light .form-control {
                    border-color: #ddd;
                    background-color: #fff;
                    color: #333;
                }
                
                .theme-light .form-control:focus {
                    border-color: #6200ea;
                    box-shadow: 0 0 0 2px rgba(98, 0, 234, 0.2);
                }
                
                .theme-dark .form-control {
                    border-color: #555;
                    background-color: #3d3d3d;
                    color: #e0e0e0;
                }
                
                .theme-dark .form-control:focus {
                    border-color: #bb86fc;
                    box-shadow: 0 0 0 2px rgba(187, 134, 252, 0.2);
                }
                
                .css-editor {
                    font-family: 'Fira Code', monospace;
                    min-height: 200px;
                    resize: vertical;
                    white-space: pre;
                    tab-size: 2;
                }
                
                /* 按钮 */
                .btn-group {
                    display: flex;
                    gap: 10px;
                    margin-top: 16px;
                }
                
                .btn {
                    padding: 10px 16px;
                    border-radius: 6px;
                    border: none;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .btn-primary {
                    background-color: #6200ea;
                    color: white;
                }
                
                .btn-primary:hover:not(:disabled) {
                    background-color: #5000c9;
                }
                
                .theme-dark .btn-primary {
                    background-color: #bb86fc;
                    color: #333;
                }
                
                .theme-dark .btn-primary:hover:not(:disabled) {
                    background-color: #a370f7;
                }
                
                .btn-secondary {
                    background-color: transparent;
                }
                
                .theme-light .btn-secondary {
                    color: #6200ea;
                    border: 1px solid #6200ea;
                }
                
                .theme-light .btn-secondary:hover:not(:disabled) {
                    background-color: rgba(98, 0, 234, 0.05);
                }
                
                .theme-dark .btn-secondary {
                    color: #bb86fc;
                    border: 1px solid #bb86fc;
                }
                
                .theme-dark .btn-secondary:hover:not(:disabled) {
                    background-color: rgba(187, 134, 252, 0.1);
                }
                
                .btn-danger {
                    background-color: #f44336;
                    color: white;
                }
                
                .btn-danger:hover:not(:disabled) {
                    background-color: #d32f2f;
                }
                
                /* 预设列表 */
                .preset-list {
                    margin-top: 16px;
                    border: 1px solid;
                    border-radius: 6px;
                    max-height: 200px;
                    overflow-y: auto;
                }
                
                .theme-light .preset-list {
                    border-color: #ddd;
                }
                
                .theme-dark .preset-list {
                    border-color: #555;
                }
                
                .preset-item {
                    padding: 12px 16px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: background-color 0.2s;
                }
                
                .preset-item:not(:last-child) {
                    border-bottom: 1px solid;
                }
                
                .theme-light .preset-item:not(:last-child) {
                    border-color: #eee;
                }
                
                .theme-dark .preset-item:not(:last-child) {
                    border-color: #444;
                }
                
                .theme-light .preset-item:hover {
                    background-color: #f5f5f5;
                }
                
                .theme-dark .preset-item:hover {
                    background-color: #3a3a3a;
                }
                
                .preset-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .preset-action {
                    padding: 4px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .theme-light .preset-action {
                    color: #666;
                }
                
                .theme-light .preset-action:hover {
                    color: #6200ea;
                    background-color: rgba(98, 0, 234, 0.1);
                }
                
                .theme-dark .preset-action {
                    color: #aaa;
                }
                
                .theme-dark .preset-action:hover {
                    color: #bb86fc;
                    background-color: rgba(187, 134, 252, 0.1);
                }
                
                /* 历史记录 */
                .history-list {
                    margin-top: 16px;
                    border: 1px solid;
                    border-radius: 6px;
                    max-height: 300px;
                    overflow-y: auto;
                }
                
                .theme-light .history-list {
                    border-color: #ddd;
                }
                
                .theme-dark .history-list {
                    border-color: #555;
                }
                
                .history-item {
                    padding: 12px 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                
                .history-item:not(:last-child) {
                    border-bottom: 1px solid;
                }
                
                .theme-light .history-item:not(:last-child) {
                    border-color: #eee;
                }
                
                .theme-dark .history-item:not(:last-child) {
                    border-color: #444;
                }
                
                .theme-light .history-item:hover {
                    background-color: #f5f5f5;
                }
                
                .theme-dark .history-item:hover {
                    background-color: #3a3a3a;
                }
                
                .history-timestamp {
                    font-size: 12px;
                    margin-top: 4px;
                    opacity: 0.7;
                }
                
                /* 响应式设计 */
                @media (max-width: 768px) {
                    .css-customizer-dialog {
                        width: 95%;
                        max-width: none;
                        max-height: 95vh;
                    }
                    
                    .dialog-header {
                        padding: 12px 16px;
                    }
                    
                    .dialog-title {
                        font-size: 18px;
                    }
                    
                    .dialog-content {
                        padding: 16px;
                    }
                    
                    .btn {
                        padding: 8px 12px;
                    }
                }
                
                /* 代码高亮 */
                .hljs {
                    padding: 0;
                    background: transparent;
                }
                
                /* 导入/导出表单 */
                .import-export-form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                
                /* 网站特定配置 */
                .site-config-list {
                    margin-top: 16px;
                    border: 1px solid;
                    border-radius: 6px;
                    max-height: 200px;
                    overflow-y: auto;
                }
                
                .theme-light .site-config-list {
                    border-color: #ddd;
                }
                
                .theme-dark .site-config-list {
                    border-color: #555;
                }
                
                .site-config-item {
                    padding: 12px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .site-config-item:not(:last-child) {
                    border-bottom: 1px solid;
                }
                
                .theme-light .site-config-item:not(:last-child) {
                    border-color: #eee;
                }
                
                .theme-dark .site-config-item:not(:last-child) {
                    border-color: #444;
                }
                
                /* 快捷键提示 */
                .shortcut-hint {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-family: monospace;
                    margin-left: 8px;
                }
                
                .theme-light .shortcut-hint {
                    background-color: #f0f0f0;
                    color: #666;
                }
                
                .theme-dark .shortcut-hint {
                    background-color: #444;
                    color: #ccc;
                }
            </style>
            
            <div class="dialog-header">
                <div class="dialog-title">
                    <span>✨ CSS自定义器</span>
                    <span class="version-badge">v3.0</span>
                </div>
                <div class="dialog-controls">
                    <div class="theme-toggle" id="theme-toggle">
                        ${currentTheme === 'light' ? 
                            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>' : 
                            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
                        }
                    </div>
                    <div class="close-btn" id="close-btn">×</div>
                </div>
            </div>
            
            <div class="dialog-content">
                <div class="tabs">
                    <div class="tab active" data-tab="editor">编辑器</div>
                    <div class="tab" data-tab="presets">预设管理</div>
                    <div class="tab" data-tab="history">历史记录</div>
                    <div class="tab" data-tab="settings">设置</div>
                </div>
                
                <div class="tab-content active" id="editor-tab">
                    <div class="form-group">
                        <label class="form-label" for="css-selector">CSS选择器范围：</label>
                        <input type="text" id="css-selector" class="form-control" placeholder="例如：* 或 body 或 .article-content" value="${state.cssSelector}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="preset-select">预设样式：</label>
                        <select id="preset-select" class="form-control">
                            <option value="">-- 选择预设 --</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="css-input">自定义CSS：</label>
                        <textarea id="css-input" class="form-control css-editor" rows="8" placeholder="例如：font-family: 'Roboto', sans-serif; font-size: 16px;"></textarea>
                    </div>
                    
                    <div class="btn-group">
                        <button id="preview-btn" class="btn btn-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            预览
                        </button>
                        <button id="save-btn" class="btn btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                            保存
                        </button>
                        <button id="save-preset-btn" class="btn btn-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                            保存为预设
                        </button>
                    </div>
                    
                    <div class="btn-group">
                        <button id="undo-btn" class="btn btn-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>
                            撤销
                        </button>
                        <button id="redo-btn" class="btn btn-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg>
                            重做
                        </button>
                        <button id="reset-btn" class="btn btn-danger">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            重置
                        </button>
                    </div>
                </div>
                
                <div class="tab-content" id="presets-tab">
                    <div class="form-group">
                        <label class="form-label" for="new-preset-name">预设名称：</label>
                        <input type="text" id="new-preset-name" class="form-control" placeholder="输入预设名称">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="new-preset-css">预设CSS：</label>
                        <textarea id="new-preset-css" class="form-control css-editor" rows="6" placeholder="输入预设CSS"></textarea>
                    </div>
                    
                    <div class="btn-group">
                        <button id="add-preset-btn" class="btn btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            添加预设
                        </button>
                    </div>
                    
                    <h3>预设列表</h3>
                    <div class="preset-list" id="preset-list">
                        <!-- 预设列表将在JS中动态生成 -->
                    </div>
                </div>
                
                <div class="tab-content" id="history-tab">
                    <div class="btn-group">
                        <button id="prev-history-btn" class="btn btn-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            上一个
                        </button>
                        <button id="next-history-btn" class="btn btn-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            下一个
                        </button>
                        <button id="clear-history-btn" class="btn btn-danger">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            清空历史
                        </button>
                    </div>
                    
                    <div class="history-list" id="history-list">
                        <!-- 历史记录将在JS中动态生成 -->
                    </div>
                </div>
                
                <div class="tab-content" id="settings-tab">
                    <div class="form-group">
                        <label class="form-label">网站特定配置：</label>
                        <div class="form-check">
                            <input type="checkbox" id="enable-site-specific" class="form-check-input">
                            <label class="form-check-label" for="enable-site-specific">为每个网站保存不同的CSS配置</label>
                        </div>
                    </div>
                    
                    <div class="site-config-list" id="site-config-list">
                        <!-- 网站配置列表将在JS中动态生成 -->
                    </div>
                    
                    <h3>导入/导出</h3>
                    <div class="import-export-form">
                        <button id="export-btn" class="btn btn-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            导出配置
                        </button>
                        
                        <div class="form-group">
                            <label class="form-label" for="import-json">导入配置（JSON格式）：</label>
                            <textarea id="import-json" class="form-control" rows="6" placeholder='粘贴JSON配置...'></textarea>
                        </div>
                        
                        <button id="import-btn" class="btn btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            导入配置
                        </button>
                    </div>
                    
                    <h3>快捷键</h3>
                    <div class="shortcuts-list">
                        <p>打开CSS自定义器：<span class="shortcut-hint">Alt+C</span></p>
                        <p>保存CSS：<span class="shortcut-hint">Ctrl+S</span></p>
                        <p>预览CSS：<span class="shortcut-hint">Ctrl+P</span></p>
                        <p>撤销：<span class="shortcut-hint">Ctrl+Z</span></p>
                        <p>重做：<span class="shortcut-hint">Ctrl+Y</span></p>
                    </div>
                    
                    <h3>关于</h3>
                    <p>CSS自定义器 v3.0</p>
                    <p>一个强大的CSS自定义工具，支持预设管理、暗黑模式、代码高亮和多种高级功能。</p>
                    <p>GitHub: <a href="https://github.com/username/css-customizer" target="_blank">https://github.com/username/css-customizer</a></p>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 初始化对话框
        initializeDialog(dialog, overlay);
        
        return dialog;
    }

    function initializeDialog(dialog, overlay) {
        // 获取元素
        const closeBtn = dialog.querySelector('#close-btn');
        const themeToggle = dialog.querySelector('#theme-toggle');
        const tabs = dialog.querySelectorAll('.tab');
        const cssInput = dialog.querySelector('#css-input');
        const cssSelector = dialog.querySelector('#css-selector');
        const presetSelect = dialog.querySelector('#preset-select');
        const previewBtn = dialog.querySelector('#preview-btn');
        const saveBtn = dialog.querySelector('#save-btn');
        const savePresetBtn = dialog.querySelector('#save-preset-btn');
        const undoBtn = dialog.querySelector('#undo-btn');
        const redoBtn = dialog.querySelector('#redo-btn');
        const resetBtn = dialog.querySelector('#reset-btn');
        const newPresetName = dialog.querySelector('#new-preset-name');
        const newPresetCss = dialog.querySelector('#new-preset-css');
        const addPresetBtn = dialog.querySelector('#add-preset-btn');
        const presetList = dialog.querySelector('#preset-list');
        const prevHistoryBtn = dialog.querySelector('#prev-history-btn');
        const nextHistoryBtn = dialog.querySelector('#next-history-btn');
        const clearHistoryBtn = dialog.querySelector('#clear-history-btn');
        const historyList = dialog.querySelector('#history-list');
        const enableSiteSpecific = dialog.querySelector('#enable-site-specific');
        const siteConfigList = dialog.querySelector('#site-config-list');
        const exportBtn = dialog.querySelector('#export-btn');
        const importJson = dialog.querySelector('#import-json');
        const importBtn = dialog.querySelector('#import-btn');
        
        // 初始化CSS编辑器
        cssInput.value = state.currentCSS || '';
        
        // 初始化CSS选择器
        cssSelector.value = state.cssSelector || '*';
        
        // 初始化预设下拉菜单
        initializePresets(presetSelect);
        
        // 初始化预设列表
        updatePresetList(presetList);
        
        // 初始化历史记录列表
        updateHistoryList(historyList);
        
        // 初始化网站特定配置
        const siteConfig = GM_getValue(CONFIG.STORAGE_KEYS.SITE_SPECIFIC, {});
        enableSiteSpecific.checked = Object.keys(siteConfig).length > 0;
        updateSiteConfigList(siteConfigList);
        
        // 应用代码高亮
        applyCodeHighlighting(cssInput);
        applyCodeHighlighting(newPresetCss);
        
        // 关闭按钮事件
        closeBtn.addEventListener('click', () => {
            closeDialog(dialog, overlay);
        });
        
        // 点击遮罩层关闭对话框
        overlay.addEventListener('click', () => {
            closeDialog(dialog, overlay);
        });
        
        // 主题切换事件
        themeToggle.addEventListener('click', () => {
            toggleTheme(dialog);
        });
        
        // 标签页切换事件
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                switchTab(dialog, tabId);
            });
        });
        
        // 预设选择事件
        presetSelect.addEventListener('change', () => {
            if (presetSelect.value) {
                cssInput.value = presetSelect.value;
                applyCodeHighlighting(cssInput);
            }
        });
        
        // 预览按钮事件
        previewBtn.addEventListener('click', () => {
            previewCSS(cssInput.value, cssSelector.value);
        });
        
        // 保存按钮事件
        saveBtn.addEventListener('click', () => {
            saveCSS(cssInput.value, cssSelector.value);
            closeDialog(dialog, overlay);
        });
        
        // 保存为预设按钮事件
        savePresetBtn.addEventListener('click', () => {
            const presetName = prompt('请输入预设名称：');
            if (presetName) {
                savePreset(presetName, cssInput.value);
                initializePresets(presetSelect);
                updatePresetList(presetList);
            }
        });
        
        // 撤销按钮事件
        undoBtn.addEventListener('click', () => {
            navigateHistory(-1);
            closeDialog(dialog, overlay);
        });
        
        // 重做按钮事件
        redoBtn.addEventListener('click', () => {
            navigateHistory(1);
            closeDialog(dialog, overlay);
        });
        
        // 重置按钮事件
        resetBtn.addEventListener('click', () => {
            if (confirm('确定要重置CSS吗？这将移除所有自定义样式。')) {
                removeStyleElements();
                state.currentCSS = '';
                GM_setValue(CONFIG.STORAGE_KEYS.CURRENT_CSS, '');
                closeDialog(dialog, overlay);
            }
        });
        
        // 添加预设按钮事件
        addPresetBtn.addEventListener('click', () => {
            const name = newPresetName.value.trim();
            const css = newPresetCss.value.trim();
            
            if (name && css) {
                savePreset(name, css);
                newPresetName.value = '';
                newPresetCss.value = '';
                initializePresets(presetSelect);
                updatePresetList(presetList);
            } else {
                utils.showNotification('预设名称和CSS不能为空', 'error');
            }
        });
        
        // 历史导航按钮事件
        prevHistoryBtn.addEventListener('click', () => {
            navigateHistory(-1);
            updateHistoryList(historyList);
        });
        
        nextHistoryBtn.addEventListener('click', () => {
            navigateHistory(1);
            updateHistoryList(historyList);
        });
        
        // 清空历史按钮事件
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('确定要清空所有历史记录吗？')) {
                GM_setValue(CONFIG.STORAGE_KEYS.HISTORY, []);
                state.cssHistory = [];
                state.historyPosition = -1;
                updateHistoryList(historyList);
            }
        });
        
        // 导出按钮事件
        exportBtn.addEventListener('click', () => {
            utils.exportConfig();
        });
        
        // 导入按钮事件
        importBtn.addEventListener('click', () => {
            const jsonString = importJson.value.trim();
            if (jsonString) {
                if (utils.importConfig(jsonString)) {
                    closeDialog(dialog, overlay);
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                }
            } else {
                utils.showNotification('请输入有效的JSON配置', 'error');
            }
        });
        
        // 网站特定配置切换事件
        enableSiteSpecific.addEventListener('change', () => {
            if (!enableSiteSpecific.checked) {
                if (confirm('确定要禁用网站特定配置吗？这将删除所有网站特定的CSS设置。')) {
                    GM_setValue(CONFIG.STORAGE_KEYS.SITE_SPECIFIC, {});
                    updateSiteConfigList(siteConfigList);
                } else {
                    enableSiteSpecific.checked = true;
                }
            }
        });
        
        // 添加键盘快捷键
        dialog.addEventListener('keydown', (e) => {
            // Ctrl+S: 保存
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                saveCSS(cssInput.value, cssSelector.value);
                closeDialog(dialog, overlay);
            }
            
            // Ctrl+P: 预览
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                previewCSS(cssInput.value, cssSelector.value);
            }
            
            // Esc: 关闭
            if (e.key === 'Escape') {
                closeDialog(dialog, overlay);
            }
        });
        
        // 防止点击对话框内部时关闭对话框
        dialog.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    function closeDialog(dialog, overlay) {
        // 添加关闭动画
        dialog.style.opacity = '0';
        dialog.style.transform = 'translate(-50%, -60%) scale(0.95)';
        overlay.style.opacity = '0';
        
        // 动画结束后移除元素
        setTimeout(() => {
            document.body.removeChild(dialog);
            document.body.removeChild(overlay);
            state.isDialogOpen = false;
        }, CONFIG.ANIMATION_DURATION);
    }

    function toggleTheme(dialog) {
        const currentTheme = state.theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // 更新DOM
        dialog.classList.remove(`theme-${currentTheme}`);
        dialog.classList.add(`theme-${newTheme}`);
        
        // 更新主题图标
        const themeToggle = dialog.querySelector('#theme-toggle');
        if (newTheme === 'light') {
            themeToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        } else {
            themeToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        }
        
        // 更新状态
        state.theme = newTheme;
        
        // 保存设置
        GM_setValue(CONFIG.STORAGE_KEYS.THEME, newTheme);
        
        // 更新代码高亮样式
        const cssInputs = dialog.querySelectorAll('.css-editor');
        cssInputs.forEach(input => {
            applyCodeHighlighting(input);
        });
    }

    function switchTab(dialog, tabId) {
        // 更新标签页状态
        const tabs = dialog.querySelectorAll('.tab');
        tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // 更新内容区域
        const tabContents = dialog.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            if (content.id === `${tabId}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }

    function initializePresets(presetSelect) {
        // 清空现有选项
        presetSelect.innerHTML = '<option value="">-- 选择预设 --</option>';
        
        // 获取预设
        const presets = GM_getValue(CONFIG.STORAGE_KEYS.PRESETS, {});
        
        // 如果没有预设，使用默认预设
        if (Object.keys(presets).length === 0) {
            GM_setValue(CONFIG.STORAGE_KEYS.PRESETS, DEFAULT_PRESETS);
            state.presets = DEFAULT_PRESETS;
        } else {
            state.presets = presets;
        }
        
        // 添加预设选项
        for (const [name, css] of Object.entries(state.presets)) {
            const option = document.createElement('option');
            option.value = css;
            option.textContent = name;
            presetSelect.appendChild(option);
        }
    }

    function updatePresetList(presetList) {
        // 清空现有列表
        presetList.innerHTML = '';
        
        // 获取预设
        const presets = GM_getValue(CONFIG.STORAGE_KEYS.PRESETS, {});
        
        // 如果没有预设，显示提示
        if (Object.keys(presets).length === 0) {
            presetList.innerHTML = '<div class="preset-item">没有预设</div>';
            return;
        }
        
        // 添加预设项
        for (const [name, css] of Object.entries(presets)) {
            const presetItem = document.createElement('div');
            presetItem.className = 'preset-item';
            presetItem.innerHTML = `
                <div class="preset-name">${name}</div>
                <div class="preset-actions">
                    <div class="preset-action apply-preset" data-name="${name}" title="应用">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div class="preset-action edit-preset" data-name="${name}" title="编辑">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </div>
                    <div class="preset-action delete-preset" data-name="${name}" title="删除">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </div>
                </div>
            `;
            presetList.appendChild(presetItem);
        }
        
        // 添加事件监听
        const applyButtons = presetList.querySelectorAll('.apply-preset');
        applyButtons.forEach(button => {
            button.addEventListener('click', () => {
                const name = button.getAttribute('data-name');
                const css = presets[name];
                if (css) {
                    applyCustomCSS(css);
                    utils.showNotification(`已应用预设 "${name}"`, 'success');
                    
                    // 关闭对话框
                    const dialog = document.querySelector('#css-customizer-dialog');
                    const overlay = document.querySelector('.css-customizer-overlay');
                    if (dialog && overlay) {
                        closeDialog(dialog, overlay);
                    }
                }
            });
        });
        
        const editButtons = presetList.querySelectorAll('.edit-preset');
        editButtons.forEach(button => {
            button.addEventListener('click', () => {
                const name = button.getAttribute('data-name');
                const css = presets[name];
                if (css) {
                    const newName = prompt('编辑预设名称：', name);
                    if (newName) {
                        const newCss = prompt('编辑预设CSS：', css);
                        if (newCss) {
                            // 删除旧预设
                            delete presets[name];
                            
                            // 添加新预设
                            presets[newName] = newCss;
                            
                            // 保存预设
                            GM_setValue(CONFIG.STORAGE_KEYS.PRESETS, presets);
                            state.presets = presets;
                            
                            // 更新UI
                            updatePresetList(presetList);
                            initializePresets(document.querySelector('#preset-select'));
                            
                            utils.showNotification(`预设 "${name}" 已更新`, 'success');
                        }
                    }
                }
            });
        });
        
        const deleteButtons = presetList.querySelectorAll('.delete-preset');
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const name = button.getAttribute('data-name');
                if (confirm(`确定要删除预设 "${name}" 吗？`)) {
                    deletePreset(name);
                    updatePresetList(presetList);
                    initializePresets(document.querySelector('#preset-select'));
                }
            });
        });
    }

    function updateHistoryList(historyList) {
        // 清空现有列表
        historyList.innerHTML = '';
        
        // 获取历史记录
        const history = GM_getValue(CONFIG.STORAGE_KEYS.HISTORY, []);
        
        // 如果没有历史记录，显示提示
        if (history.length === 0) {
            historyList.innerHTML = '<div class="history-item">没有历史记录</div>';
            return;
        }
        
        // 添加历史记录项
        history.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.setAttribute('data-index', index);
            
            // 高亮当前位置
            if (index === state.historyPosition) {
                historyItem.classList.add('active');
            }
            
            // 格式化时间
            const timeString = utils.formatDate(new Date(item.timestamp));
            
            // 截断CSS以便显示
            const cssPreview = item.css.length > 50 ? item.css.substring(0, 50) + '...' : item.css;
            
            historyItem.innerHTML = `
                <div class="history-css">${cssPreview}</div>
                <div class="history-selector">选择器: ${item.selector || '*'}</div>
                <div class="history-timestamp">${timeString}</div>
            `;
            
            historyList.appendChild(historyItem);
            
            // 添加点击事件
            historyItem.addEventListener('click', () => {
                state.historyPosition = index;
                applyCustomCSS(item.css, item.selector);
                updateHistoryList(historyList);
                
                // 关闭对话框
                const dialog = document.querySelector('#css-customizer-dialog');
                const overlay = document.querySelector('.css-customizer-overlay');
                if (dialog && overlay) {
                    closeDialog(dialog, overlay);
                }
            });
        });
    }

    function updateSiteConfigList(siteConfigList) {
        // 清空现有列表
        siteConfigList.innerHTML = '';
        
        // 获取网站配置
        const siteConfig = GM_getValue(CONFIG.STORAGE_KEYS.SITE_SPECIFIC, {});
        
        // 如果没有网站配置，显示提示
        if (Object.keys(siteConfig).length === 0) {
            siteConfigList.innerHTML = '<div class="site-config-item">没有网站特定配置</div>';
            return;
        }
        
        // 添加网站配置项
        for (const [domain, config] of Object.entries(siteConfig)) {
            const siteConfigItem = document.createElement('div');
            siteConfigItem.className = 'site-config-item';
            siteConfigItem.innerHTML = `
                <div class="site-domain">${domain}</div>
                <div class="site-actions">
                    <button class="btn btn-secondary btn-sm delete-site-config" data-domain="${domain}">删除</button>
                </div>
            `;
            siteConfigList.appendChild(siteConfigItem);
        }
        
        // 添加删除按钮事件
        const deleteButtons = siteConfigList.querySelectorAll('.delete-site-config');
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const domain = button.getAttribute('data-domain');
                if (confirm(`确定要删除 ${domain} 的配置吗？`)) {
                    const siteConfig = GM_getValue(CONFIG.STORAGE_KEYS.SITE_SPECIFIC, {});
                    delete siteConfig[domain];
                    GM_setValue(CONFIG.STORAGE_KEYS.SITE_SPECIFIC, siteConfig);
                    updateSiteConfigList(siteConfigList);
                }
            });
        });
    }

    function applyCodeHighlighting(textarea) {
        // 获取当前主题
        const currentTheme = state.theme;
        
        // 创建高亮容器
        const highlightContainer = document.createElement('div');
        highlightContainer.className = 'highlight-container';
        highlightContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            padding: inherit;
            margin: 0;
            border: none;
            pointer-events: none;
            overflow: hidden;
            white-space: pre-wrap;
            word-wrap: break-word;
            color: transparent;
            background: transparent;
        `;
        
        // 设置textarea样式
        textarea.style.cssText += `
            position: relative;
            background: transparent !important;
            color: transparent !important;
            caret-color: ${currentTheme === 'light' ? '#333' : '#e0e0e0'} !important;
        `;
        
        // 创建包装容器
        const wrapper = document.createElement('div');
        wrapper.className = 'code-editor-wrapper';
        wrapper.style.cssText = `
            position: relative;
            width: 100%;
        `;
        
        // 替换textarea
        textarea.parentNode.insertBefore(wrapper, textarea);
        wrapper.appendChild(textarea);
        wrapper.appendChild(highlightContainer);
        
        // 同步滚动
        textarea.addEventListener('scroll', () => {
            highlightContainer.scrollTop = textarea.scrollTop;
            highlightContainer.scrollLeft = textarea.scrollLeft;
        });
        
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
        
        // 监听按键
        textarea.addEventListener('keydown', (e) => {
            // Tab键处理
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                
                // 插入两个空格
                textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
                
                // 设置光标位置
                textarea.selectionStart = textarea.selectionEnd = start + 2;
                
                // 更新高亮
                updateHighlight();
            }
        });
    }

    function previewCSS(css, selector) {
        if (css && utils.validateCSS(css)) {
            applyCustomCSS(css, selector);
            utils.showNotification('CSS预览已应用', 'info');
        } else {
            utils.showNotification('CSS验证失败', 'error');
        }
    }

    function saveCSS(css, selector) {
        if (css && utils.validateCSS(css)) {
            applyCustomCSS(css, selector);
            utils.showNotification('CSS已保存', 'success');
        } else {
            utils.showNotification('CSS验证失败', 'error');
        }
    }

    function showCSSInputDialog() {
        createDialog();
    }

    // 初始化函数
    function initialize() {
        // 加载保存的CSS
        const savedCSS = GM_getValue(CONFIG.STORAGE_KEYS.CURRENT_CSS, '');
        const savedSelector = GM_getValue(CONFIG.STORAGE_KEYS.SELECTOR, '*');
        
        // 加载保存的主题
        state.theme = GM_getValue(CONFIG.STORAGE_KEYS.THEME, 'light');
        
        // 加载历史记录
        state.cssHistory = GM_getValue(CONFIG.STORAGE_KEYS.HISTORY, []);
        state.historyPosition = state.cssHistory.length - 1;
        
        // 加载预设
        const savedPresets = GM_getValue(CONFIG.STORAGE_KEYS.PRESETS, {});
        if (Object.keys(savedPresets).length === 0) {
            GM_setValue(CONFIG.STORAGE_KEYS.PRESETS, DEFAULT_PRESETS);
            state.presets = DEFAULT_PRESETS;
        } else {
            state.presets = savedPresets;
        }
        
        // 检查是否有网站特定配置
        const siteConfig = GM_getValue(CONFIG.STORAGE_KEYS.SITE_SPECIFIC, {});
        const currentDomain = utils.getCurrentDomain();
        
        if (siteConfig[currentDomain]) {
            // 应用网站特定配置
            state.currentCSS = siteConfig[currentDomain].css;
            state.cssSelector = siteConfig[currentDomain].selector;
            applyCustomCSS(state.currentCSS, state.cssSelector);
        } else if (savedCSS) {
            // 应用全局配置
            state.currentCSS = savedCSS;
            state.cssSelector = savedSelector;
            applyCustomCSS(savedCSS, savedSelector);
        }

        // 设置MutationObserver监听DOM变化
        const observer = new MutationObserver(
            utils.debounce(() => {
                if (state.currentCSS) {
                    applyCustomCSS(state.currentCSS, state.cssSelector);
                }
            }, CONFIG.OBSERVER_THROTTLE)
        );

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });

        // 注册菜单命令
        GM_registerMenuCommand('CSS自定义器', showCSSInputDialog);
        
        // 添加全局快捷键
        document.addEventListener('keydown', (e) => {
            // Alt+C: 打开CSS自定义器
            if (e.altKey && e.key === 'c') {
                e.preventDefault();
                showCSSInputDialog();
            }
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
