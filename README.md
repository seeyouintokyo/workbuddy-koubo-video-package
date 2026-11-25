# 阿星视频动效包装 · WorkBuddy Skill

把**真人口播原片**（或数字人口播）包装成竖屏短视频的 WorkBuddy 技能。

一条口播从素材到成片要干的活，它按顺序做完：降噪 → 剪气口和重说 → 逐句校字幕 → 人物抠像 → 版式切换 → 动效 → 配乐 → 封面。另外也管**拆解对标视频风格**和**生成数字人素材**。

> 这是 WorkBuddy / Claude 风格的 Skill：本质是一份 `SKILL.md` 加配套脚本和模板，装进 Agent 后按需读取执行。

## 装上

```bash
cp -R koubo-video-package ~/.workbuddy/skills/
```

装完目录应是 `~/.workbuddy/skills/koubo-video-package/SKILL.md`。重启会话即可调用。

## 用之前

- 第一次跑先执行 `scripts/setup.sh`，依赖装在 `~/.cache/koubo-video`（可用 `KOUBO_VIDEO_HOME` 改位置），不会污染全局 Python。
- 需要 Python、ffmpeg，以及一个 MiniMax Key（做数字人和配音时用）。
- `SKILL.md` 开头有一张「创作者设定」表，创作者名字、结尾署名、主色、发布平台这些先填好，之后每条片子都不用再问。

## 目录

```
SKILL.md            技能主文件，流程和规则都在这
references/         抠像、封面、素材、风格、对标拆解等细则
scripts/            安装、转录、出帧、音频收尾
template/           版式与动效引擎（core.js / engine-soft.js）
cover/              封面模板
avatar/             数字人相关脚本
styles/             视觉预设
```

## 配色默认值

- 底色 `#fff6bb` 浅黄
- 强调色 `#ff0808` 亮红

都在 `SKILL.md` 的设定表里改。

## 授权

代码 MIT。作者：阿星，微信 **staraiwork**（用的时候卡住可以直接找我）。
