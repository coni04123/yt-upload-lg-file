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
    const { path: dropboxPath, title, description, tags, thumbnails } = req.body;

    if (!dropboxPath) {
        return res.status(400).json({ error: "Dropbox path is required" });
    }

    const fileName = path.basename(dropboxPath);
    const tempPath = `./video/${fileName}`;

    try {
        TempFileManager.ensureDirectory("./video");
        if (TempFileManager.exists(tempPath)) {
            console.log(`Temp file already exists at ${tempPath}, skipping download.`);
        } else {
            await downloadDropboxStream(dropboxPath, tempPath);
        }

        const result = await uploadVideoFromFile(
            tempPath,
            title || fileName,
            description || "",
            tags || "",
            thumbnails
        );

        return res.status(200).json({
            success: true,
            videoId: result.id,
            message: "Video uploaded to YouTube"
        });
    } catch (err) {
        console.error("Transfer failed:", err.message);
        return res.status(500).json({ error: "Failed to transfer video" });
    } finally {
        // Clean up temporary file using the utility
        TempFileManager.safeDelete(tempPath);
    }
};


// Share a Dropbox file publicly
const shareDropboxFile = async (req, res) => {
  const { path, mode = "download" } = req.body;

  if (!path) return res.status(400).json({ error: "Dropbox path is required" });

  try {
    const url = await shareFilePublicly(path);
    const cleanUrl = url.replace("?dl=0", mode === "raw" ? "?raw=1" : mode === "download" ? "?dl=1" : "?dl=0");

    res.json({ success: true, url: cleanUrl });
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

const getDropboxVideoStaticLink = async (req, res) => {
    const { path: dropboxPath } = req.body;

    if (!dropboxPath) {
        return res.status(400).json({ error: "Dropbox path is required" });
    }

    const fileName = path.basename(dropboxPath);
    const tempPath = `./video/${fileName}`;

    try {
        TempFileManager.ensureDirectory("./video");
        await downloadDropboxStream(dropboxPath, tempPath);

        // Construct static link using server IP
        const staticLink = `http://185.44.66.41:3000/video/${encodeURIComponent(fileName)}`;
        return res.status(200).json({ success: true, url: staticLink });
    } catch (err) {
        console.error("Download failed:", err.message);
        return res.status(500).json({ error: "Failed to download video" });
    }
};

module.exports = {
    transferDropboxToYouTube,
    shareDropboxFile,
    unshareDropboxFile,
    getDropboxVideoStaticLink,
};
