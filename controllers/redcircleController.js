const RedCircleService = require("../services/redcircleService");
const { downloadDropboxStream } = require("../services/dropboxService");
const TempFileManager = require("../utils/tempFileManager");
const path = require("path");

const uploadEpisode = async (req, res) => {
  const { filePath, title, description, transcriptionLink } = req.body;

  if (!filePath || !title || !description) {
    return res.status(400).json({ error: "filePath, title, and description are required" });
  }

  // Create temporary file with automatic cleanup
  const tmpDir = path.join(__dirname, "..", "tmp");
  TempFileManager.ensureDirectory(tmpDir);
  
  const localPath = path.join(tmpDir, path.basename(filePath));
  
  try {
    await downloadDropboxStream(filePath, localPath);

    // Use local file path for upload
    const result = await RedCircleService.uploadEpisode({ filePath: localPath, title, description, transcriptionLink });

    if (result.success) {
      return res.status(200).json({ message: result.message });
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to download file from Dropbox", details: err.message });
  } finally {
    // Clean up temporary file using the utility
    TempFileManager.safeDelete(localPath);
  }
};

module.exports = { uploadEpisode };