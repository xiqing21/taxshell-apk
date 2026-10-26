# taxshell — 个税模拟器壳

基于 Tauri 2 (Rust + WebView) 的极简个税模拟器启动壳。

## 特点
- 无水印、无验证、无付费拦截
- 体积小（Rust + 系统 WebView）
- 内置两个平台入口（经典版 / 新版 Pro），记住上次选择

## 构建 Android APK
```bash
# 依赖：Rust + Android SDK/NDK + JDK 17+
export ANDROID_HOME=$HOME/Library/Android/sdk
export NDK_HOME=$ANDROID_HOME/ndk/27.0.12077973
cargo tauri android build --apk --target aarch64
# 产物: src-tauri/gen/android/app/build/outputs/apk/universal/release/
```

## 修改平台地址
编辑 `dist/index.html` 中的 `URLS` 对象。
