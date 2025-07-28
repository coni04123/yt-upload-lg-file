const fs = require("fs");
const axios = require("axios");
const { google } = require("googleapis");
const path = require("path");
const os = require("os");
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
    filePath,
    title = "Uploaded via API",
    description = "",
    tagsString = "",
    thumbnailUrl = null,
    schedulingTime = null,
    webhookUrl = null
) {
    // Run the upload in the background
    (async () => {
        let result = {};
        try {
            console.log(`\n🎬 Starting YouTube video upload...`);
            console.log(`📁 File path: ${filePath}`);
            console.log(`📝 Title: ${title}`);
            console.log(`📄 Description length: ${description.length} characters`);
            console.log(`🏷️  Tags: ${tagsString}`);
            console.log(`🖼️  Thumbnail URL: ${thumbnailUrl || 'None'}`);
            console.log(`📅 Scheduling time: ${schedulingTime || 'None (public)'}`);

            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            const stats = fs.statSync(filePath);
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`📊 File size: ${fileSizeMB} MB`);
            console.log(`📊 File size in bytes: ${stats.size}`);

            let videoStream = fs.createReadStream(filePath, {
                highWaterMark: 64 * 1024,
                flags: 'r'
            });

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

            let retryCount = 0;
            const maxRetries = 3;
            let response;

            while (retryCount < maxRetries) {
                try {
                    console.log(`🔄 Upload attempt ${retryCount + 1}/${maxRetries}`);
                    response = await youtube.videos.insert({
                        part: "snippet,status",
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
                        uploadType: 'resumable',
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
                    break;
                } catch (error) {
                    retryCount++;
                    console.error(`❌ Upload attempt ${retryCount} failed:`, error.message);

                    if (error.code === 416 || error.message.includes('Range Not Satisfiable')) {
                        console.log(`🔄 Range error detected, retrying...`);
                        videoStream.destroy();
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        videoStream = fs.createReadStream(filePath, {
                            highWaterMark: 64 * 1024,
                            flags: 'r'
                        });
                        continue;
                    }

                    if (retryCount >= maxRetries) {
                        console.error(`❌ All upload attempts failed`);
                        result = { success: false, error: error.message, stack: error.stack };
                        break;
                    }

                    console.log(`⏳ Waiting before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        } catch (err) {
            result = { success: false, error: err.message, stack: err.stack };
        }

        // Notify webhook if provided
        if (webhookUrl) {
            try {
                await axios.post(webhookUrl, result);
                console.log(`✅ Webhook notified: ${webhookUrl}`);
            } catch (webhookErr) {
                console.error(`❌ Failed to notify webhook: ${webhookErr.message}`);
            }
        }
    })();
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
