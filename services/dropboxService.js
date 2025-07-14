const fs = require("fs");
const https = require("https");
const { Dropbox } = require("dropbox");
const fetch = require("node-fetch");
const axios = require("axios");

const getAccessToken = async () => {
    const response = await axios.post("https://api.dropbox.com/oauth2/token", null, {
        params: {
            refresh_token: process.env.DROPBOX_REFRESH_TOKEN,
            grant_type: "refresh_token",
            client_id: process.env.DROPBOX_CLIENT_ID,
            client_secret: process.env.DROPBOX_CLIENT_SECRET,
        },
    });

    return response.data.access_token;
};

const downloadDropboxStream = async (dropboxPath, outputPath) => {
    const accessToken = await getAccessToken();

    return new Promise((resolve, reject) => {
        const options = {
            hostname: "content.dropboxapi.com",
            path: "/2/files/download",
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath }),
            },
        };

        const file = fs.createWriteStream(outputPath);

        const req = https.request(options, (res) => {
            res.pipe(file);
            file.on("finish", () => {
                file.close();
                resolve(outputPath);
            });
        });

        req.on("error", (err) => {
            fs.unlinkSync(outputPath);
            reject(err);
        });

        req.end();
    });
};

// Share a file and return public URL
const shareFilePublicly = async (dropboxPath) => {
    const accessToken = await getAccessToken();
    const dbx = new Dropbox({ accessToken, fetch });

    const res = await dbx.sharingCreateSharedLinkWithSettings({
        path: dropboxPath,
        settings: {
            requested_visibility: "public",
        },
    });

    return res.result.url.replace("dl=0", "dl=1"); // direct link
};

// Unshare (revoke public link) for a file
const unshareFile = async (dropboxPath) => {
    const accessToken = await getAccessToken();
    const dbx = new Dropbox({ accessToken, fetch });

    // Step 1: Get shared links for that path
    const listRes = await dbx.sharingListSharedLinks({
        path: dropboxPath,
        direct_only: true,
    });

    if (!listRes.result.links.length) {
        throw new Error("No shared link found to unshare.");
    }

    const sharedLink = listRes.result.links[0];

    // Step 2: Revoke the link
    await dbx.sharingRevokeSharedLink({ url: sharedLink.url });

    return true;
};

module.exports = {
    getAccessToken,
    downloadDropboxStream,
    shareFilePublicly,
    unshareFile,
};
