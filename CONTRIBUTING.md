# 贡献指南

感谢您对CSS自定义器项目的关注！我们欢迎各种形式的贡献，包括但不限于代码贡献、问题报告、功能建议和文档改进。本指南将帮助您了解如何参与到项目中来。

## 行为准则

参与本项目的所有贡献者都应遵循以下行为准则：

- 尊重所有参与者，不论其经验水平、性别、性取向、残疾状况、种族或宗教信仰
- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情

## 如何贡献

### 报告问题

如果您发现了bug或有功能建议，请通过GitHub Issues提交。在提交问题时，请尽可能详细地描述：

1. 问题的具体表现或功能建议的详细描述
2. 复现步骤（如适用）
3. 预期行为与实际行为
4. 浏览器版本、操作系统和Tampermonkey版本
5. 相关的截图（如适用）

### 提交代码

1. Fork本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建一个Pull Request

### 代码风格指南

- 使用2个空格进行缩进
- 使用单引号而非双引号（除非必要）
- 变量和函数名使用驼峰命名法
- 添加适当的注释，特别是对于复杂的逻辑
- 确保代码通过ESLint检查

### 开发环境设置

1. 克隆仓库
   ```
   git clone https://github.com/username/css-customizer.git
   cd css-customizer
   ```

2. 安装依赖（如果有构建过程）
   ```
   npm install
   ```

3. 在Tampermonkey中安装开发版本
   - 在Tampermonkey中创建新脚本
   - 复制`css-customizer.user.js`的内容
   - 保存并启用脚本

## 发布流程

1. 更新版本号（在脚本头部的`@version`标签）
2. 更新CHANGELOG.md
3. 创建新的发布标签
4. 更新README.md中的安装链接（如需要）

## 项目结构

```
css-customizer/
├── css-customizer.user.js    # 主脚本文件
├── README.md                 # 项目说明
├── LICENSE                   # 许可证文件
├── CONTRIBUTING.md           # 贡献指南
├── CHANGELOG.md              # 更新日志
└── screenshots/              # 截图目录
    ├── main-interface.png
    ├── dark-mode.png
    └── ...
```

## 联系方式

如有任何问题或建议，请通过以下方式联系我们：

- GitHub Issues: [https://github.com/username/css-customizer/issues](https://github.com/username/css-customizer/issues)
- 电子邮件: example@example.com

再次感谢您对CSS自定义器项目的贡献！
