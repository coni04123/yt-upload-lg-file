const {
    downloadDropboxStream,
    shareFilePublicly,
    unshareFile,
} = require("../services/dropboxService");

const { uploadVideoFromFile } = require("../services/youtubeService");
const TempFileManager = require("../utils/tempFileManager");
const path = require("path");

// Transfer: Dropbox → YouTube transferDropboxToYouTube
const transferDropboxToYouTube = async (req, res) => {
    console.log(`\n🎬 Starting Dropbox to YouTube transfer...`);
    console.log(`📋 Request body:`, JSON.stringify(req.body, null, 2));
    
    const { path: dropboxPath, title, description, tags, thumbnails, schedulingTime, webhookUrl } = req.body;

    if (!dropboxPath) {
        console.log(`❌ Error: Dropbox path is required`);
        return res.status(400).json({ error: "Dropbox path is required" });
    }

    // Immediately respond to the client
    res.status(202).json({ message: "Signal received. Processing in background." });

    // Run the upload in the background
    (async () => {
        const fileName = path.basename(dropboxPath);
        const tempPath = `./video/${fileName}`;
        let result = {};
        try {
            console.log(`📁 Ensuring video directory exists...`);
            TempFileManager.ensureDirectory("./video");
            console.log(`✅ Video directory ready`);
            
            if (TempFileManager.exists(tempPath)) {
                console.log(`📁 File already exists at ${tempPath}, skipping download`);
            } else {
                console.log(`📥 Downloading file from Dropbox...`);
                await downloadDropboxStream(dropboxPath, tempPath);
                console.log(`✅ File downloaded successfully`);
            }

            console.log(`🎬 Starting YouTube upload...`);
            await uploadVideoFromFile(
                tempPath,
                title || fileName,
                description || "",
                tags || "",
                thumbnails,
                schedulingTime
            );

            result = {
                success: true,
                message: "Video uploaded to YouTube"
            };
            console.log(`✅ Transfer completed successfully!`);
        } catch (err) {
            console.error(`❌ Transfer failed: ${err.message}`);
            result = {
                success: false,
                error: err.message,
                stack: err.stack
            };
        } finally {
            // Clean up temporary file using the utility
            console.log(`🧹 Cleaning up temporary file...`);
            TempFileManager.safeDelete(tempPath);
            console.log(`✅ Temporary file cleaned up`);
            // Notify webhook if provided
            if (webhookUrl) {
                try {
                    await require("axios").post(webhookUrl, result);
                    console.log(`✅ Webhook notified: ${webhookUrl}`);
                } catch (webhookErr) {
                    console.error(`❌ Failed to notify webhook: ${webhookErr.message}`);
                }
            }
        }
    })();
};

// Share a Dropbox file publicly
const shareDropboxFile = async (req, res) => {
    console.log(`\n🔗 Starting Dropbox file sharing...`);
    console.log(`📋 Request body:`, JSON.stringify(req.body, null, 2));
    
    const { path, mode = "download" } = req.body;

    if (!path) {
        console.log(`❌ Error: Dropbox path is required`);
        return res.status(400).json({ error: "Dropbox path is required" });
    }

    console.log(`📁 Dropbox path: ${path}`);
    console.log(`🔗 Share mode: ${mode}`);

    try {
        console.log(`🚀 Creating shared link...`);
        const url = await shareFilePublicly(path);
        console.log(`✅ Shared link created`);
        
        const cleanUrl = url.replace("?dl=0", mode === "raw" ? "?raw=1" : mode === "download" ? "?dl=1" : "?dl=0");
        console.log(`🔗 Final URL: ${cleanUrl}`);

        console.log(`✅ File sharing completed successfully`);
        res.json({ success: true, url: cleanUrl });
    } catch (err) {
        console.error(`❌ Share failed: ${err.message}`);
        res.status(500).json({ error: "Failed to share file" });
    }
};

// Unshare Dropbox file
const unshareDropboxFile = async (req, res) => {
    console.log(`\n🚫 Starting Dropbox file unsharing...`);
    console.log(`📋 Request body:`, JSON.stringify(req.body, null, 2));
    
    const { path } = req.body;
    if (!path) {
        console.log(`❌ Error: Dropbox path is required`);
        return res.status(400).json({ error: "Dropbox path is required" });
    }

    console.log(`📁 Dropbox path: ${path}`);

    try {
        console.log(`🚫 Revoking shared link...`);
        await unshareFile(path);
        console.log(`✅ File unshared successfully`);
        res.json({ success: true, message: "File unshared successfully" });
    } catch (err) {
        console.error(`❌ Unshare failed: ${err.message}`);
        res.status(500).json({ error: "Failed to unshare file" });
    }
};

const getDropboxVideoStaticLink = async (req, res) => {
    console.log(`\n🔗 Starting Dropbox video static link generation...`);
    console.log(`📋 Request body:`, JSON.stringify(req.body, null, 2));
    
    const { path: dropboxPath } = req.body;

    if (!dropboxPath) {
        console.log(`❌ Error: Dropbox path is required`);
        return res.status(400).json({ error: "Dropbox path is required" });
    }

    console.log(`📁 Dropbox path: ${dropboxPath}`);

    const fileName = path.basename(dropboxPath);
    const tempPath = `./video/${fileName}`;
    console.log(`📁 Local file path: ${tempPath}`);

    try {
        console.log(`📁 Ensuring video directory exists...`);
        TempFileManager.ensureDirectory("./video");
        console.log(`✅ Video directory ready`);
        
        console.log(`📥 Downloading file from Dropbox...`);
        await downloadDropboxStream(dropboxPath, tempPath);
        console.log(`✅ File downloaded successfully`);

        // Construct static link using server IP
        const staticLink = `http://185.44.66.41:3000/video/${encodeURIComponent(fileName)}`;
        console.log(`🔗 Static link generated: ${staticLink}`);
        
        console.log(`✅ Static link generation completed successfully`);
        return res.status(200).json({ success: true, url: staticLink });
    } catch (err) {
        console.error(`❌ Download failed: ${err.message}`);
        return res.status(500).json({ error: "Failed to download video" });
    }
};

module.exports = {
    transferDropboxToYouTube,
    shareDropboxFile,
    unshareDropboxFile,
    getDropboxVideoStaticLink,
};
