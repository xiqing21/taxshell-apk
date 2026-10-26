# taxshell — 个税模拟器壳（无水印无验证）

基于 **Tauri 2（Rust + 系统 WebView）** 的极简个税模拟器启动壳，**合成原两个个税 APP 为一个**。

## 📦 下载安装

**[`taxshell-v1.0.0.apk`](taxshell-v1.0.0.apk)**（6.5 MB，比原版更小）

| 对比 | 原版 geshui.apk | 原版 geshui (1).apk | **taxshell** |
|---|---|---|---|
| 体积 | 14.6 MB | 3.7 MB | **6.5 MB** |
| 框架 | uni-app (DCloud) | Cordova | Tauri 2 (Rust) |
| 水印 | 无（壳内） | 无（壳内） | 无 |
| 验证 | 服务端卡密 | 服务端+渠道 | 无壳级验证 |
| 平台 | 单一 | 单一 | **双平台切换** |

## ✨ 功能说明

### 显示内容与原版一模一样吗？—— **是，真·一比一**

原版 APP 本身就是 WebView 壳，打开后加载的是**远端网站**：

| 平台 | 地址 | 内容 |
|---|---|---|
| 🏛️ 经典版 | `http://175.24.180.44:8080` | 卡密登录 + 模拟器试用（与原版 geshui.apk 相同） |
| 📱 新版 Pro | `https://getjob68.club/mine.html` | 渠道版纳税记录演示（与原版 geshui (1).apk 相同） |

所以：**卡密登录、自定义流水、截图导出、工资流水、纳税记录等所有功能**，
都是远端网站提供的，与原版 APP 里看到的**完全相同**（连服务器都是同一个）。

### 自定义

改 `dist/index.html` 里的 `URLS` 即可指向任何地址：

```js
var URLS = {
  old: 'http://175.24.180.44:8080/',          // 经典版
  new: 'https://getjob68.club/mine.html?in_app=1'  // 新版 Pro
};
```

改完重新构建：

```bash
# 依赖：Rust + Android SDK/NDK + JDK 17+
export ANDROID_HOME=$HOME/Library/Android/sdk
export NDK_HOME=$ANDROID_HOME/ndk/27.0.12077973
cargo tauri android build --apk --target aarch64
# 产物: src-tauri/gen/android/app/build/outputs/apk/universal/release/
```

### 启动页特性

- 双平台卡片式选择，**记住上次选择**（localStorage `tax_last`）
- 无水印、无验证、无任何拦截
- HTTP 明文流量已放行（`usesCleartextTraffic=true`，旧平台是 http://）
- 按返回键退出 WebView 回到启动页，可随时切换平台

## 🔧 常见问题

**Q: 与原版 APP 数据互通吗？**
A: 互通。登录状态/流水数据都存在远端服务器，跟壳无关。
（本地 localStorage 因包名不同而隔离，重新登录一次即可）

**Q: 为什么要造这个壳？**
A: 原版两个 APP 的验证都在服务端（APK 层无验证代码可去），无法本地破解。
造新壳 = 摆脱原壳的渠道限制/统计上报，且更小更快。

**Q: 模拟器/真机要求？**
A: Android 7.0+（minSdk 24），WebView 需支持 ES6（近几年的系统都满足）。

## 📁 目录结构

```
taxshell/
├── dist/index.html          # 启动页（改 URLS 在这里）
├── src-tauri/               # Rust 工程
│   ├── src/lib.rs           # 入口
│   ├── tauri.conf.json      # Tauri 配置
│   └── icons/               # 应用图标
├── app-icon.png             # 图标源文件（1024x1024）
└── taxshell-v1.0.0.apk      # 已签名成品
```
