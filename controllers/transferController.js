const {
    downloadDropboxStream,
    shareFilePublicly,
    unshareFile,
    filesGetTemporaryLink,
} = require("../services/dropboxService");

const { uploadVideoFromFile } = require("../services/youtubeService");
const TempFileManager = require("../utils/tempFileManager");
const path = require("path");

// Transfer: Dropbox → YouTube transferDropboxToYouTube
const transferDropboxToYouTube = async (req, res) => {
    console.log(`\n🎬 Starting Dropbox to YouTube transfer...`);
    console.log(`📋 Request body:`, JSON.stringify(req.body, null, 2));
    
    const { path: dropboxPath, title, description, tags, thumbnails, webhookUrl, ...others } = req.body;

    if (!dropboxPath) {
        console.log(`❌ Error: Dropbox path is required`);
        return res.status(400).json({ error: "Dropbox path is required" });
    }

    res.status(202).json({ message: "Signal received. Processing in background." });

    (async () => {
        try {
            console.log(`🎬 Starting YouTube upload...`);
            const _yt = await uploadVideoFromFile(
                dropboxPath,
                title || fileName,
                description || "",
                tags || "",
                thumbnails,
            );

            result = {
                success: true,
                message: "Video uploaded to YouTube",
                videoId: _yt.id,
                videoUrl: `https://www.youtube.com/watch?v=${_yt.id}`,
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
            // Notify webhook if provided
            if (webhookUrl) {
                try {
                    await require("axios").post(webhookUrl, {...result, ...others});
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

const shareTempLink = async (req, res) => {
    console.log(`\n🔗 Starting temporary link sharing...`);
    console.log(`📋 Request body:`, JSON.stringify(req.body, null, 2));
    
    const { path: dropboxPath } = req.body;
    if (!dropboxPath) {
        console.log(`❌ Error: Dropbox path is required`);
        return res.status(400).json({ error: "Dropbox path is required" });
    }
    
    try {
        console.log(`🔗 Getting temporary link...`);
        const tempLink = await filesGetTemporaryLink(dropboxPath);
        console.log(`✅ Temporary link generated`);
        
        console.log(`✅ Temporary link sharing completed successfully`);
        return res.status(200).json({ success: true, url: tempLink.link });
    } catch (err) {
        console.error(`❌ Temporary link generation failed: ${errs}`);
        return res.status(500).json({ error: "Failed to generate temporary link" });
    }
}

module.exports = {
    shareTempLink,
    transferDropboxToYouTube,
    shareDropboxFile,
    unshareDropboxFile,
    getDropboxVideoStaticLink,
};
