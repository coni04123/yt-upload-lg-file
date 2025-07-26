const fs = require("fs");
const axios = require("axios");
const { google } = require("googleapis");
const path = require("path");
const os = require("os");
const TempFileManager = require("../utils/tempFileManager");

const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });

const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
});

async function uploadVideoFromFile(filePath, title = "Uploaded via API", description = "", tagsString = "", thumbnailUrl = null) {
    const videoStream = fs.createReadStream(filePath);

    // Convert comma-separated string into array
    const tags = tagsString
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0); // Remove empty strings

    const status = {
        privacyStatus: scheduledPublishTime ? "private" : "unlisted",
    };

    // if (scheduledPublishTime) {
    //     status.publishAt = new Date(scheduledPublishTime).toISOString(); // Ensure UTC ISO string
    //     status.selfDeclaredMadeForKids = false; // Required for scheduled publishing
    // }

    const response = await youtube.videos.insert({
        part: "snippet,status",
        requestBody: {
            snippet: {
                title,
                description,
                tags,
            },
            status: {
                privacyStatus: "public",
            },
        },
        media: {
            body: videoStream,
        },
    });

    const videoId = response.data.id;

    if (thumbnailUrl) {
        await setThumbnailFromUrl(videoId, thumbnailUrl);
    }

    return response.data;
}

async function setThumbnailFromUrl(videoId, imageUrl) {
    const tempPath = TempFileManager.createTempFile("yt-thumb", ".jpg");

    try {
        const response = await axios.get(imageUrl, { responseType: "stream" });
        const writer = fs.createWriteStream(tempPath);

        await new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        await youtube.thumbnails.set({
            videoId,
            media: {
                body: fs.createReadStream(tempPath),
            },
        });
    } finally {
        // Clean up temporary file using the utility
        TempFileManager.safeDelete(tempPath);
    }
}

module.exports = {
    uploadVideoFromFile,
};
