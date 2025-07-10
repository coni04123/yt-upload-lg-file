const {
    downloadDropboxStream,
    shareFilePublicly,
    unshareFile,
} = require("../services/dropboxService");

const { uploadVideoFromFile } = require("../services/youtubeService");
const fs = require("fs");
const path = require("path");

// Transfer: Dropbox → YouTube
const transferDropboxToYouTube = async (req, res) => {
    const { path: dropboxPath, title, description } = req.body;

    if (!dropboxPath) {
        return res.status(400).json({ error: "Dropbox path is required" });
    }

    try {
        const fileName = path.basename(dropboxPath);
        const tempPath = `./temp/${fileName}`;

        fs.mkdirSync("./temp", { recursive: true });
        await downloadDropboxStream(dropboxPath, tempPath);
        const result = await uploadVideoFromFile(tempPath, title || fileName, description || "");
        fs.unlinkSync(tempPath);

        return res.status(200).json({
            success: true,
            videoId: result.id,
            message: "Video uploaded to YouTube",
        });
    } catch (err) {
        console.error("Transfer failed:", err.message);
        return res.status(500).json({ error: "Failed to transfer video" });
    }
};

// Share a Dropbox file publicly
const shareDropboxFile = async (req, res) => {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: "Dropbox path is required" });

    try {
        const publicUrl = await shareFilePublicly(path);
        res.json({ success: true, url: publicUrl });
    } catch (err) {
        console.error("Share failed:", err.message);
        res.status(500).json({ error: "Failed to share file" });
    }
};

// Unshare Dropbox file
const unshareDropboxFile = async (req, res) => {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: "Dropbox path is required" });

    try {
        await unshareFile(path);
        res.json({ success: true, message: "File unshared successfully" });
    } catch (err) {
        console.error("Unshare failed:", err.message);
        res.status(500).json({ error: "Failed to unshare file" });
    }
};

module.exports = {
    transferDropboxToYouTube,
    shareDropboxFile,
    unshareDropboxFile,
};
