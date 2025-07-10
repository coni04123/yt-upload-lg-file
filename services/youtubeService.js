const fs = require("fs");
const { google } = require("googleapis");

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

async function uploadVideoFromFile(filePath, title = "Uploaded via API", description = "") {
    const videoStream = fs.createReadStream(filePath);

    const response = await youtube.videos.insert({
        part: "snippet,status",
        requestBody: {
            snippet: {
                title,
                description,
            },
            status: {
                privacyStatus: "unlisted",
            },
        },
        media: {
            body: videoStream,
        },
    });

    return response.data;
}

module.exports = {
    uploadVideoFromFile,
};
