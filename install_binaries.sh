#!/bin/sh
set -e

BINARY_DIR="bin"
YT_DLP_BINARY_PATH="$BINARY_DIR/yt-dlp"
FFMPEG_BINARY_PATH="$BINARY_DIR/ffmpeg"

# 创建 bin 目录（如果不存在）
mkdir -p "$BINARY_DIR"

# =============================
# 📥 下载 yt-dlp
# =============================
echo "📥 正在下载最新版 yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o "$YT_DLP_BINARY_PATH"
chmod +x "$YT_DLP_BINARY_PATH"
echo "✅ yt-dlp 下载完成，版本："
"$YT_DLP_BINARY_PATH" --version

# =============================
# 📦 下载 ffmpeg 静态构建版（适用于 Linux x86_64）
# =============================
FFMPEG_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
FFMPEG_TAR="/tmp/ffmpeg.tar.xz"

echo "📥 正在下载 ffmpeg 静态构建包..."
curl -L -o "$FFMPEG_TAR" "$FFMPEG_URL"

echo "📦 解压 ffmpeg 到 $BINARY_DIR"
tar -xf "$FFMPEG_TAR" -C "$BINARY_DIR" --strip-components=1

echo "✅ 设置 ffmpeg 可执行权限"
chmod +x "$FFMPEG_BINARY_PATH"

# 清理临时文件
rm -f "$FFMPEG_TAR"

# 验证是否成功
echo "✅ ffmpeg 安装完成，版本："
"$FFMPEG_BINARY_PATH" -version | head -n 1