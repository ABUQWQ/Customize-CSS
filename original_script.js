// ==UserScript==
// @name         优化版CSS替换脚本
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  增强版CSS替换工具，支持预设模板、撤销功能和样式预览
// @author       Abu_Sensei
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // 配置常量
    const CONFIG = {
        STYLE_ID: 'custom-css-style',
        DEFAULT_CSS: '',
        ANIMATION_DURATION: 200,
        OBSERVER_THROTTLE: 100
    };

    // CSS预设模板
    const CSS_PRESETS = {
        default: 'font-family: "Microsoft YaHei", sans-serif; font-size: 16px;',
        reading: 'font-family: "Noto Serif SC", serif; font-size: 18px; line-height: 1.8;',
        coding: 'font-family: "Fira Code", monospace; font-size: 14px;',
        comfortable: 'font-family: "Open Sans", sans-serif; font-size: 16px; line-height: 1.6; letter-spacing: 0.5px;'
    };

    // 状态管理
    let state = {
        cssApplied: false,
        previousCSS: null,
        currentCSS: null
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
        }
    };

    // 核心CSS处理函数
    function applyCustomCSS(css) {
        if (!css || typeof css !== 'string') {
            console.warn('Invalid CSS input');
            return;
        }

        try {
            const sanitizedCSS = utils.sanitizeCSS(css);
            
            removeStyleElements();

            const styleElement = document.createElement('style');
            styleElement.id = CONFIG.STYLE_ID;
            styleElement.textContent = `* { ${sanitizedCSS} !important; }`;
            document.head?.appendChild(styleElement) || document.documentElement.appendChild(styleElement);

            handleIFrames(sanitizedCSS);

            if (!state.cssApplied) {
                state.cssApplied = true;
            }

            state.currentCSS = sanitizedCSS;
        } catch (error) {
            console.error('应用CSS时发生错误:', error);
        }
    }

    function removeStyleElements() {
        const styleElements = document.querySelectorAll(`#${CONFIG.STYLE_ID}`);
        styleElements.forEach(element => element.remove());
    }

    function handleIFrames(css) {
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
                    styleElement.textContent = `* { ${css} !important; }`;
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


    function createDialog() {
        const dialog = document.createElement('div');
        dialog.classList.add('custom-css-dialog');
        dialog.innerHTML = `
            <style>
                .custom-css-dialog {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #ffffff;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0px 12px 24px rgba(0, 0, 0, 0.1);
                    max-width: 480px;
                    width: 90%;
                    font-family: system-ui, -apple-system, 'Roboto', sans-serif;
                    color: #333;
                    z-index: 10000;
                    animation: fadeIn 0.2s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, -60%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
                .dialog-title {
                    font-size: 22px;
                    font-weight: 600;
                    color: #6200ea;
                    margin-bottom: 20px;
                    text-align: center;
                }
                #close-btn {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    cursor: pointer;
                    font-size: 24px;
                    color: #888;
                    transition: color 0.2s;
                }
                #close-btn:hover {
                    color: #6200ea;
                }
                .preset-section {
                    margin-bottom: 16px;
                }
                #preset-select {
                    width: 100%;
                    padding: 8px;
                    border-radius: 6px;
                    border: 1px solid #ddd;
                    font-size: 14px;
                }
                #css-input {
                    width: 100%;
                    padding: 14px;
                    border-radius: 6px;
                    border: 1px solid #ddd;
                    margin-top: 16px;
                    font-size: 16px;
                    box-sizing: border-box;
                    background-color: #f9f9f9;
                    font-family: monospace;
                    color: #333;
                    line-height: 1.4;
                }
                .dialog-buttons {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 20px;
                    gap: 16px;
                }
                .button {
                    padding: 10px 18px;
                    border-radius: 6px;
                    border: none;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .save {
                    background-color: #6200ea;
                    color: #ffffff;
                }
                .save:not(:disabled):hover {
                    background-color: #3700b3;
                }
                .undo {
                    background-color: #ffffff;
                    color: #6200ea;
                    border: 1px solid #6200ea;
                }
                .undo:not(:disabled):hover {
                    background: rgba(98, 0, 234, 0.05);
                }
            </style>
            <div class="dialog-title">✨ 自定义CSS样式</div>
            <span id="close-btn">×</span>
            <div class="preset-section">
                <label for="preset-select">预设样式：</label>
                <select id="preset-select">
                    <option value="">-- 选择预设 --</option>
                    ${Object.entries(CSS_PRESETS).map(([key, value]) => 
                        `<option value="${value}">${key}</option>`
                    ).join('')}
                </select>
            </div>
            <label for="css-input">自定义CSS：</label>
            <textarea id="css-input" rows="6" placeholder="例如：font-family: 'Roboto', sans-serif; font-size: 16px;"></textarea>
            <div class="dialog-buttons">
                <button class="button undo" id="undo-btn" ${!state.previousCSS ? 'disabled' : ''}>↩ 撤销</button>
                <div>
                    <button class="button save" id="preview-btn">👁 预览</button>
                    <button class="button save" id="save-btn" disabled>✓ 保存</button>
                </div>
            </div>
        `;
        return dialog;
    }

    function showCSSInputDialog() {
        const dialog = createDialog();
        document.body.appendChild(dialog);

        const textArea = dialog.querySelector('#css-input');
        const presetSelect = dialog.querySelector('#preset-select');
        const saveButton = dialog.querySelector('#save-btn');
        const previewButton = dialog.querySelector('#preview-btn');
        const undoButton = dialog.querySelector('#undo-btn');

        textArea.value = state.currentCSS || '';

        textArea.addEventListener('input', () => {
            const isEmpty = textArea.value.trim() === '';
            saveButton.disabled = isEmpty;
            previewButton.disabled = isEmpty;
        });

        presetSelect.addEventListener('change', () => {
            if (presetSelect.value) {
                textArea.value = presetSelect.value;
                saveButton.disabled = false;
                previewButton.disabled = false;
            }
        });

        dialog.addEventListener('click', (e) => {
            const target = e.target;
            if (target.id === 'save-btn' && !target.disabled) {
                saveCSS(textArea.value, dialog);
            } else if (target.id === 'preview-btn' && !target.disabled) {
                previewCSS(textArea.value);
            } else if (target.id === 'undo-btn' && !target.disabled) {
                undoChanges(dialog);
            } else if (target.id === 'close-btn') {
                dialog.remove();
            }
        });
    }

    function saveCSS(css, dialog) {
        if (css && utils.validateCSS(css)) {
            state.previousCSS = state.currentCSS;
            GM_setValue('customCSS', css);
            applyCustomCSS(css);
            dialog.remove();
        }
    }

    function previewCSS(css) {
        if (utils.validateCSS(css)) {
            applyCustomCSS(css);
        }
    }

    function undoChanges(dialog) {
        if (state.previousCSS) {
            GM_setValue('customCSS', state.previousCSS);
            applyCustomCSS(state.previousCSS);
            dialog.remove();
        }
    }

    function initialize() {
        const savedCSS = GM_getValue('customCSS', '');
        if (savedCSS) {
            state.currentCSS = savedCSS;
            applyCustomCSS(savedCSS);
        }

        const observer = new MutationObserver(
            utils.debounce(() => {
                if (state.currentCSS) {
                    applyCustomCSS(state.currentCSS);
                }
            }, CONFIG.OBSERVER_THROTTLE)
        );

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });

        GM_registerMenuCommand('自定义CSS样式', showCSSInputDialog);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
