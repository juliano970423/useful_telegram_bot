const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra'); // 需要安裝：npm install fs-extra

// 引入你之前写好的上传函数
const { uploadToS3 } = require('./upload_files');

/**
 * 使用 yt-dlp 下载视频或音频，并上传到 Synology C2
 * @param {string} url 视频地址
 * @param {'video'|'audio'} type 下载类型
 * @returns {Promise<string>} 返回预签名的下载 URL
 */
async function ytdlp(url, type = 'video') {
  const baseOutputDir = './downloads'; // 基础目录

  // 產生當前時間作為資料夾名稱 (格式: YYYYMMDD_HHMMSS)
  const now = new Date();
  const folderName = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const outputDir = path.join(baseOutputDir, folderName); // 子資料夾路徑

  // 確保目錄存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ffmpegPath = path.join(__dirname, 'bin', 'ffmpeg'); // 自带的 ffmpeg
  const outputTemplate = path.join(outputDir, '%(title)s.%(ext)s');

  let command;

  if (type === 'video') {
    // 下载最佳视频 + 音频，并合并为 MP4
    command = `./bin/yt-dlp \
      --ffmpeg-location "${ffmpegPath}" \
      --no-playlist \
      --no-warnings \
      -q \
      -o "${outputTemplate}" \
      -f "bestvideo[height<=1080]+bestaudio/best" \
      --merge-output-format mp4 \
      "${url}"`;
  } else if (type === 'audio') {
    // 只下载音频并转换为 FLAC
    command = `./bin/yt-dlp \
      --ffmpeg-location "${ffmpegPath}" \
      --no-playlist \
      --no-warnings \
      -q \
      -o "${outputTemplate}" \
      -x \
      --audio-format flac \
      --audio-quality 0 \
      "${url}"`;
  } else {
    throw new Error(`❌ 不支持的媒体类型: ${type}`);
  }

  console.log(`⏳ 开始下载: ${url}`);
  await exec(command);
  // 根據 type 查找對應格式的檔案
  const files = fs.readdirSync(outputDir);

  let matchedFile;

  if (type === 'video') {
    // 尋找 .mp4 檔案
    matchedFile = files.find(file => file.toLowerCase().endsWith('.mp4'));
  } else if (type === 'audio') {
    // 尋找音頻檔案（優先找 flac，再考慮 m4a/mp3）
    matchedFile = files.find(file => file.toLowerCase().endsWith('.flac')) ||
      files.find(file => file.toLowerCase().endsWith('.m4a')) ||
      files.find(file => file.toLowerCase().endsWith('.mp3'));
  }

  if (!matchedFile) {
    throw new Error(`❌ 未找到符合條件的 ${type} 文件`);
  }

  const downloadedFilePath = path.join(outputDir, matchedFile);
  console.log(`✅ 成功找到 ${type} 文件: ${downloadedFilePath}`);

  const s3Key = `downloads/${folderName}/${matchedFile}`; // 统一上传路径

  console.log(`⬆️ 正在上传文件至 Synology C2: ${s3Key}`);
  const downloadUrl = await uploadToS3(downloadedFilePath, s3Key);

  console.log(`🗑️ 正在删除整个下载资料夹: ${outputDir}`);
  await fse.remove(outputDir); // 刪除整個時間資料夾

  return downloadUrl;
}

module.exports = { ytdlp };