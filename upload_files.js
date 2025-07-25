// upload_files.js
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// 配置 Synology C2 S3 参数
const s3Config = {
  endpoint: new AWS.Endpoint('https://us-003.s3.synologyc2.net'),
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-003',
  sslEnabled: true,
  s3ForcePathStyle: true,
};

const s3 = new AWS.S3(s3Config);
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// 配置文件路径
const DB_FILE = path.join(__dirname, 'uploads.json');

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, '{}');
  }
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data);
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * 添加一条上传记录
 * @param {string} s3Key
 * @param {number} expiresIn 毫秒
 */
function addUploadRecord(s3Key, expiresIn = 86400000) {
  const db = loadDB();
  db[s3Key] = {
    uploadedAt: new Date().toISOString(),
    expiresIn,
  };
  saveDB(db);
}

/**
 * 获取所有过期的文件
 * @returns {string[]}
 */
function getExpiredFiles() {
  const db = loadDB();
  const now = Date.now();
  const expired = [];

  for (const s3Key in db) {
    const record = db[s3Key];
    const uploadTime = new Date(record.uploadedAt).getTime();
    if (now - uploadTime >= record.expiresIn) {
      expired.push(s3Key);
    }
  }

  return expired;
}

/**
 * 删除已处理的过期文件记录
 * @param {string[]} s3Keys
 */
function removeRecords(s3Keys) {
  const db = loadDB();
  s3Keys.forEach((key) => {
    delete db[key];
  });
  saveDB(db);
}

/**
 * 删除 C2 上的文件
 * @param {string} s3Key 文件键名
 * @returns {Promise<void>}
 */
async function deleteFromS3(s3Key) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: s3Key,
  };

  await s3.deleteObject(params).promise();
  console.log(`🗑️ 文件 ${s3Key} 已从 C2 删除`);
  // 获取父文件夹路径，例如：downloads/20250725_200039/
  const parentFolder = path.dirname(s3Key) + '/';

  // 直接删除父文件夹
  await s3.deleteObject({
    Bucket: BUCKET_NAME,
    Key: parentFolder,
  }).promise();

  console.log(`🗑️ 资料夹 ${parentFolder} 已直接删除`);
}

/**
 * 上传本地文件到 Synology C2 S3 兼容存储
 * @param {string} filePath 本地路径
 * @param {string} s3Key S3 中的对象键名（路径+文件名）
 * @returns {Promise<string>} 返回预签名 URL
 */
async function uploadToS3(filePath, s3Key) {
  const fileStream = fs.createReadStream(filePath);

  const params = {
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileStream,
    ContentType: 'application/octet-stream',
    ACL: 'private',
  };

  await s3.upload(params).promise();

  // 生成预签名 URL
  const url = s3.getSignedUrl('getObject', {
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Expires: 60 * 60 * 24, // 24小時
  });

  // 记录上传信息
  addUploadRecord(s3Key, 24 * 60 * 60 * 1000); // 默认 24 小时后删除
  //addUploadRecord(s3Key, 10 * 1000); // 默认 24 小时后删除

  return url;
}

module.exports = {
  uploadToS3,
  deleteFromS3,
  getExpiredFiles,
  removeRecords,
};