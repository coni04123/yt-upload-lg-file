const fs = require("fs");
const axios = require("axios");
const { google } = require("googleapis");
const path = require("path");
const os = require("os");
const https = require("https");
const dropboxService = require("./dropboxService");
const TempFileManager = require("../utils/tempFileManager");

console.log(`🔧 Initializing YouTube service...`);

const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
console.log(`✅ YouTube OAuth2 client configured`);

const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
});

async function uploadVideoFromFile(
    dropboxPath,
    title = "Uploaded via API",
    description = "",
    tagsString = "",
    thumbnailUrl = null,
    schedulingTime = null,
) {
    // 1. Download Dropbox file to temp directory
    const fileName = path.basename(dropboxPath);
    const tempDir = path.join(__dirname, "..", "tmp");
    TempFileManager.ensureDirectory(tempDir);
    const localPath = path.join(tempDir, fileName);

    let result = {};
    try {
        console.log(`📥 Downloading from Dropbox: ${dropboxPath} → ${localPath}`);
        await dropboxService.downloadDropboxStream(dropboxPath, localPath);
        console.log(`✅ Downloaded file to local disk`);

        // 2. Upload local file to YouTube
        const stats = fs.statSync(localPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`📊 File size: ${fileSizeMB} MB`);

        const videoStream = fs.createReadStream(localPath);

        const tags = tagsString
            .split(",")
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        const status = schedulingTime
            ? {
                privacyStatus: "private",
                publishAt: new Date(schedulingTime).toISOString(),
                selfDeclaredMadeForKids: false
            }
            : {
                privacyStatus: "public"
            };

        const response = await youtube.videos.insert({
            part: "snippet,status",
            notifySubscribers: false,
            requestBody: {
                snippet: {
                    title,
                    description,
                    tags,
                },
                status,
            },
            media: {
                body: videoStream,
            },
        });

        const videoId = response.data.id;
        console.log(`✅ Video uploaded successfully!`);
        console.log(`🎬 Video ID: ${videoId}`);
        console.log(`🔗 Video URL: https://www.youtube.com/watch?v=${videoId}`);

        if (thumbnailUrl) {
            console.log(`🖼️  Setting thumbnail from URL: ${thumbnailUrl}`);
            await setThumbnailFromUrl(videoId, thumbnailUrl);
            console.log(`✅ Thumbnail set successfully`);
        }

        result = {
            success: true,
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            message: "Video uploaded to YouTube"
        };
    } catch (err) {
        console.error(`❌ Upload failed: ${err.message}`);
        result = {
            success: false,
            error: err.message,
            stack: err.stack
        };
    } finally {
        // 3. Delete temp file
        if (fs.existsSync(localPath)) {
            TempFileManager.safeDelete(localPath);
            console.log(`🧹 Deleted temp file: ${localPath}`);
        }
        
        return result;
    }
}

async function setThumbnailFromUrl(videoId, imageUrl) {
    console.log(`🖼️  Starting thumbnail upload...`);
    console.log(`🎬 Video ID: ${videoId}`);
    console.log(`🔗 Image URL: ${imageUrl}`);
    
    const tempPath = TempFileManager.createTempFile("yt-thumb", ".jpg");
    console.log(`📁 Temporary thumbnail path: ${tempPath}`);

    try {
        console.log(`📥 Downloading thumbnail image...`);
        const response = await axios.get(imageUrl, { 
            responseType: "stream",
            timeout: 30000, // 30 second timeout
            maxContentLength: 10 * 1024 * 1024 // 10MB max
        });
        console.log(`✅ Thumbnail downloaded`);
        
        const writer = fs.createWriteStream(tempPath);
        console.log(`📝 Writing thumbnail to temp file...`);

        await new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", reject);
            response.data.on("error", reject);
        });
        console.log(`✅ Thumbnail written to temp file`);

        console.log(`🚀 Uploading thumbnail to YouTube...`);
        await youtube.thumbnails.set({
            videoId,
            media: {
                body: fs.createReadStream(tempPath),
            },
        });
        console.log(`✅ Thumbnail uploaded to YouTube`);
    } finally {
        // Clean up temporary file using the utility
        console.log(`🧹 Cleaning up temporary thumbnail file...`);
        TempFileManager.safeDelete(tempPath);
        console.log(`✅ Temporary thumbnail file cleaned up`);
    }
}

console.log(`✅ YouTube service initialized successfully`);

module.exports = {
    uploadVideoFromFile,
};
