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

async function uploadVideoFromFile(filePath, title = "Uploaded via API", description = "", tagsString = "", thumbnailUrl = null, schedulingTime = null) {
    console.log(`\n🎬 Starting YouTube video upload...`);
    console.log(`📁 File path: ${filePath}`);
    console.log(`📝 Title: ${title}`);
    console.log(`📄 Description length: ${description.length} characters`);
    console.log(`🏷️  Tags: ${tagsString}`);
    console.log(`🖼️  Thumbnail URL: ${thumbnailUrl || 'None'}`);
    console.log(`📅 Scheduling time: ${schedulingTime || 'None (public)'}`);

    // Check if file exists and get file size
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    const stats = fs.statSync(filePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 File size: ${fileSizeMB} MB`);
    console.log(`📊 File size in bytes: ${stats.size}`);

    console.log(`📖 Creating video file stream...`);
    let videoStream = fs.createReadStream(filePath, {
        highWaterMark: 64 * 1024, // 64KB chunks for better memory management
        flags: 'r'
    });
    console.log(`✅ Video file stream created`);

    // Convert comma-separated string into array
    const tags = tagsString
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    console.log(`🏷️  Processed tags: ${tags.length} tags`);

    // Set privacyStatus and publishAt for scheduling
    const status = schedulingTime
        ? {
            privacyStatus: "private",
            publishAt: new Date(schedulingTime).toISOString(),
            selfDeclaredMadeForKids: false
        }
        : {
            privacyStatus: "private"
        };
    console.log(`🔒 Privacy status: ${status.privacyStatus}`);
    if (schedulingTime) {
        console.log(`📅 Scheduled publish time: ${status.publishAt}`);
    }

    console.log(`🚀 Starting YouTube API upload...`);
    
    // Add retry logic for upload
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
        try {
            console.log(`🔄 Upload attempt ${retryCount + 1}/${maxRetries}`);
            
            const response = await youtube.videos.insert({
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
                // Add upload parameters for better handling
                uploadType: 'resumable',
                // onUploadProgress: (event) => {
                //     if (event.bytesRead && stats.size) {
                //         const progress = ((event.bytesRead / stats.size) * 100).toFixed(1);
                //         console.log(`📈 Upload progress: ${progress}% (${(event.bytesRead / (1024 * 1024)).toFixed(2)} MB / ${fileSizeMB} MB)`);
                //     }
                // }
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

            console.log(`🎉 YouTube upload process completed!`);
            return response.data;
            
        } catch (error) {
            retryCount++;
            console.error(`❌ Upload attempt ${retryCount} failed:`, error.message);
            
            if (error.code === 416 || error.message.includes('Range Not Satisfiable')) {
                console.log(`🔄 Range error detected, retrying...`);
                // Reset the stream for retry
                videoStream.destroy();
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                videoStream = fs.createReadStream(filePath, {
                    highWaterMark: 64 * 1024,
                    flags: 'r'
                });
                continue;
            }
            
            if (retryCount >= maxRetries) {
                console.error(`❌ All upload attempts failed`);
                throw error;
            }
            
            console.log(`⏳ Waiting before retry...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
        }
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
