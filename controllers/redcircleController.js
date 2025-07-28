const RedCircleService = require("../services/redcircleService");
const { downloadDropboxStream } = require("../services/dropboxService");
const TempFileManager = require("../utils/tempFileManager");
const path = require("path");

const uploadEpisode = async (req, res) => {
    console.log(`\n🎙️  Starting RedCircle episode upload controller...`);
    console.log(`📋 Request body:`, JSON.stringify(req.body, null, 2));
    
    const { filePath, title, description, transcriptionLink } = req.body;

    if (!filePath || !title || !description) {
        console.log(`❌ Error: Missing required fields`);
        console.log(`📁 filePath: ${filePath || 'Missing'}`);
        console.log(`📝 title: ${title || 'Missing'}`);
        console.log(`📄 description: ${description || 'Missing'}`);
        return res.status(400).json({ error: "filePath, title, and description are required" });
    }

    console.log(`📁 Dropbox file path: ${filePath}`);
    console.log(`📝 Episode title: ${title}`);
    console.log(`📄 Episode description: ${description}`);
    console.log(`🔗 Transcription link: ${transcriptionLink || 'None'}`);

    // Create temporary file with automatic cleanup
    const tmpDir = path.join(__dirname, "..", "tmp");
    console.log(`📁 Temporary directory: ${tmpDir}`);
    
    console.log(`📁 Ensuring tmp directory exists...`);
    TempFileManager.ensureDirectory(tmpDir);
    console.log(`✅ Temporary directory ready`);
    
    const localPath = path.join(tmpDir, path.basename(filePath));
    console.log(`📁 Local file path: ${localPath}`);
    
    try {
        console.log(`📥 Downloading file from Dropbox...`);
        await downloadDropboxStream(filePath, localPath);
        console.log(`✅ File downloaded successfully`);

        console.log(`🎙️  Starting RedCircle service upload...`);
        // Use local file path for upload
        const result = await RedCircleService.uploadEpisode({ filePath: localPath, title, description, transcriptionLink });

        if (result.success) {
            console.log(`✅ Episode upload completed successfully!`);
            console.log(`🔗 Episode URL: ${result.message}`);
            return res.status(200).json({ message: result.message });
        } else {
            console.log(`❌ Episode upload failed: ${result.error}`);
            return res.status(500).json({ error: result.error });
        }
    } catch (err) {
        console.error(`❌ Failed to download file from Dropbox: ${err.message}`);
        return res.status(500).json({ error: "Failed to download file from Dropbox", details: err.message });
    } finally {
        // Clean up temporary file using the utility
        console.log(`🧹 Cleaning up temporary file...`);
        TempFileManager.safeDelete(localPath);
        console.log(`✅ Temporary file cleaned up`);
    }
};

module.exports = { uploadEpisode };