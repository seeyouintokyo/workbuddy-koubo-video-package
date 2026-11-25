# 风格文件

这个 skill 只给做法，不给长相。颜色、字体、边框、阴影、动效能量、字幕样式和封面构图，都写在你自己的风格文件里。

## 一套风格 = 两个文件

放在你的视频工作区，例如 `我的风格/`，路径写进 SKILL.md 的“创作者设定”表：

| 文件 | 内容 |
|---|---|
| `theme.css` | 画面变量（下表），加少量覆盖规则。每条视频复制到 `page.html` 旁边 |
| `style.md` | 文字规则：动效能量、版式偏好、字幕样式、封面构图、不要什么。格式见 `references/style-profile.md` |

## theme.css 里的变量

| 变量 | 用在哪 |
|---|---|
| `--paper` | 背景、全屏页底色 |
| `--ink` | 主文字、边框、头像框 |
| `--accent` / `--accent-ink` | 标签、字幕重点词、榜单序号的底色和上面的字 |
| `--hot` | 大数字、章节号、强调字 |
| `--mark` | 荧光笔高亮、头像呼吸圈 |
| `--muted` / `--line` | 次要文字 / 背景网格线 |
| `--font` / `--font-display` / `--display-weight` | 正文字体 / 大字字体和字重 |
| `--bw` / `--radius` / `--shadow` | 边框粗细 / 圆角 / 阴影 |
| `--sub-color` / `--sub-stroke` | 字幕字色和描边色 |

引擎（`template/engine*.js`）的颜色也从这些变量读，换风格不用改引擎。

## 这里的几个文件

- `neutral.css`：默认。黑白灰，只求干净。
- `example-editorial.css`、`example-dark-tech.css`：示例，说明风格能改到什么程度。**不要直接用**，按 `references/style-profile.md` 生成你自己的。

动效能量另外选：`template/theme-v4.css` + `engine-v4.js` 偏冲击（砸字、震屏、闪白），`template/theme-soft.css` + `engine-soft.js` 偏安静（玻璃卡片、模糊转场）。
