const RedCircleService = require("../services/redcircleService");
const { downloadDropboxStream } = require("../services/dropboxService");
const path = require("path");
const fs = require("fs");

const uploadEpisode = async (req, res) => {
  const { filePath, title, description, transcriptionLink } = req.body;

  if (!filePath || !title || !description) {
    return res.status(400).json({ error: "filePath, title, and description are required" });
  }

  // Ensure tmp directory exists
  const tmpDir = path.join(__dirname, "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Download file from Dropbox to local temp path
  const localPath = path.join(tmpDir, path.basename(filePath));
  try {
    await downloadDropboxStream(filePath, localPath);
  } catch (err) {
    return res.status(500).json({ error: "Failed to download file from Dropbox", details: err.message });
  }

  // Use local file path for upload
  const result = await RedCircleService.uploadEpisode({ filePath: localPath, title, description, transcriptionLink });

  if (result.success) {
    return res.status(200).json({ message: result.message });
  } else {
    return res.status(500).json({ error: result.error });
  }
};

module.exports = { uploadEpisode };