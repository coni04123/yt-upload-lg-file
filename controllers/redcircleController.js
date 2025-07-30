const RedCircleService = require("../services/redcircleService");
const { downloadDropboxStream } = require("../services/dropboxService");
const TempFileManager = require("../utils/tempFileManager");
const path = require("path");
const axios = require("axios");

const uploadEpisode = async (req, res) => {
    // Immediately respond to the client
    res.status(202).json({ message: "Signal received. Processing in background." });

    // Run the rest in the background
    (async () => {
        console.log(`\n🎙️  Starting RedCircle episode upload controller...`);
        console.log(`📋 Request body:`, JSON.stringify(req.body, null, 2));
        
        const { filePath, title, description, transcriptionLink, webhookUrl, ...others } = req.body;
        let result = {};
        let localPath = "";

        try {
            if (!filePath || !title || !description) throw new Error("Missing required fields");

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
            
            localPath = path.join(tmpDir, path.basename(filePath));
            console.log(`📁 Local file path: ${localPath}`);
            
            console.log(`📥 Downloading file from Dropbox...`);
            await downloadDropboxStream(filePath, localPath);
            console.log(`✅ File downloaded successfully`);

            console.log(`🎙️  Starting RedCircle service upload...`);
            try {
                result = await RedCircleService.uploadEpisode({ filePath: localPath, title, description, transcriptionLink });
            } catch (err) {
                result = { success: false, error: err.message };
            }


            if (result.success) {
                console.log(`✅ Episode upload completed successfully!`);
                console.log(`🔗 Episode URL: ${result.message}`);
            } else {
                console.log(`❌ Episode upload failed: ${result.error}`);
            }
        } catch (err) {
            console.error(`❌ Error: ${err.message}`);
            result = { success: false, error: err.message, stack: err.stack };
        } finally {
            // Clean up temporary file using the utility
            console.log(`🧹 Cleaning up temporary file...`);
            TempFileManager.safeDelete(
                localPath
            );
            console.log(`✅ Temporary file cleaned up`);
        }

        // Notify webhook if provided
        if (webhookUrl) {
            try {
                await axios.post(webhookUrl, {...result, ...others});
                console.log(`✅ Webhook notified: ${webhookUrl}`);
            } catch (webhookErr) {
                console.error(`❌ Failed to notify webhook: ${webhookErr.message}`);
            }
        }
    })();
};

module.exports = { uploadEpisode };