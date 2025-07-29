const fs = require("fs");
const https = require("https");
const { Dropbox } = require("dropbox");
const fetch = require("node-fetch");
const axios = require("axios");

console.log(`🔧 Initializing Dropbox service...`);

const getAccessToken = async () => {
    console.log(`🔑 Getting Dropbox access token...`);
    const response = await axios.post("https://api.dropbox.com/oauth2/token", null, {
        params: {
            refresh_token: process.env.DROPBOX_REFRESH_TOKEN,
            grant_type: "refresh_token",
            client_id: process.env.DROPBOX_CLIENT_ID,
            client_secret: process.env.DROPBOX_CLIENT_SECRET,
        },
    });

    console.log(`✅ Dropbox access token obtained successfully`);
    return response.data.access_token;
};

const downloadDropboxStream = async (dropboxPath, outputPath) => {
    console.log(`\n📥 Starting Dropbox file download...`);
    console.log(`📁 Dropbox path: ${dropboxPath}`);
    console.log(`💾 Output path: ${outputPath}`);
    
    const accessToken = await getAccessToken();
    console.log(`🔑 Access token ready`);

    return new Promise((resolve, reject) => {
        console.log(`🌐 Setting up HTTPS request to Dropbox...`);
        const options = {
            hostname: "content.dropboxapi.com",
            path: "/2/files/download",
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath }),
            },
        };

        console.log(`📝 Creating write stream...`);
        const file = fs.createWriteStream(outputPath);

        console.log(`🚀 Making request to Dropbox API...`);
        const req = https.request(options, (res) => {
            console.log(`📡 Response received from Dropbox`);
            console.log(`📊 Status code: ${res.statusCode}`);
            console.log(`📦 Content length: ${res.headers['content-length'] || 'Unknown'} bytes`);
            
            res.pipe(file);
            file.on("finish", () => {
                console.log(`✅ File download completed successfully`);
                console.log(`📁 File saved to: ${outputPath}`);
                file.close();
                resolve(outputPath);
            });
        });

        req.on("error", (err) => {
            console.error(`❌ Download error: ${err.message}`);
            console.log(`🧹 Cleaning up partial file...`);
            fs.unlinkSync(outputPath);
            reject(err);
        });

        req.end();
        console.log(`📤 Request sent to Dropbox`);
    });
};

// Share a file and return public URL
const shareFilePublicly = async (dropboxPath) => {
    console.log(`\n🔗 Starting Dropbox file sharing...`);
    console.log(`📁 File path: ${dropboxPath}`);
    
    const accessToken = await getAccessToken();
    console.log(`🔑 Access token ready`);
    
    const dbx = new Dropbox({ accessToken, fetch });
    console.log(`🔧 Dropbox client initialized`);

    console.log(`🚀 Creating shared link...`);
    const res = await dbx.sharingCreateSharedLinkWithSettings({
        path: dropboxPath,
        settings: {
            requested_visibility: "public",
        },
    });

    const url = res.result.url.replace("dl=0", "dl=1"); // direct link
    console.log(`✅ Shared link created successfully`);
    console.log(`🔗 Direct download URL: ${url}`);
    return url;
};

// Unshare (revoke public link) for a file
const unshareFile = async (dropboxPath) => {
    console.log(`\n🚫 Starting Dropbox file unsharing...`);
    console.log(`📁 File path: ${dropboxPath}`);
    
    const accessToken = await getAccessToken();
    console.log(`🔑 Access token ready`);
    
    const dbx = new Dropbox({ accessToken, fetch });
    console.log(`🔧 Dropbox client initialized`);

    // Step 1: Get shared links for that path
    console.log(`🔍 Finding existing shared links...`);
    const listRes = await dbx.sharingListSharedLinks({
        path: dropboxPath,
        direct_only: true,
    });

    if (!listRes.result.links.length) {
        console.log(`⚠️  No shared link found to unshare`);
        throw new Error("No shared link found to unshare.");
    }

    const sharedLink = listRes.result.links[0];
    console.log(`🔗 Found shared link: ${sharedLink.url}`);

    // Step 2: Revoke the link
    console.log(`🚫 Revoking shared link...`);
    await dbx.sharingRevokeSharedLink({ url: sharedLink.url });
    console.log(`✅ Shared link revoked successfully`);

    return true;
};

// Get a temporary link for a file
const filesGetTemporaryLink = async (filePath) => {
    console.log(`\n🔗 Getting temporary link for Dropbox file...`);
    console.log(`📁 File path: ${filePath}`);
    
    try {
        const accessToken = await getAccessToken();
        console.log(`🔑 Access token ready`);
        console.log(`🔑 Token length: ${accessToken.length} characters`);
        
        const dbx = new Dropbox({ accessToken, fetch });
        console.log(`🔧 Dropbox client initialized`);

        // First, let's verify the file exists
        console.log(`🔍 Verifying file exists...`);
        try {
            const metadata = await dbx.filesGetMetadata({ path: filePath });
            console.log(`✅ File exists: ${metadata.result.name} (${metadata.result.size} bytes)`);
        } catch (metadataError) {
            console.error(`❌ File not found or access denied: ${metadataError.message}`);
            throw new Error(`File not found or access denied: ${filePath}`);
        }

        // Try filesGetTemporaryLink first
        console.log(`🚀 Attempting filesGetTemporaryLink...`);
        try {
            const res = await dbx.filesGetTemporaryLink({
                path: filePath
            });

            console.log(`✅ Temporary link created successfully`);
            console.log(`🔗 Temporary URL: ${res.result.link}`);
            console.log(`⏰ Expires at: ${res.result.metadata.server_modified}`);
            
            return res.result;
        } catch (tempLinkError) {
            console.log(`⚠️ filesGetTemporaryLink failed, trying alternative method...`);
            console.log(`Error: ${tempLinkError.message}`);
            
            // Fallback to creating a shared link and converting to direct download
            console.log(`🔄 Creating shared link as fallback...`);
            const shareRes = await dbx.sharingCreateSharedLinkWithSettings({
                path: filePath,
                settings: {
                    requested_visibility: "public",
                },
            });

            const url = shareRes.result.url.replace("dl=0", "dl=1"); // direct link
            console.log(`✅ Shared link created as fallback`);
            console.log(`🔗 Direct download URL: ${url}`);
            
            // Return in the same format as filesGetTemporaryLink
            return {
                link: url,
                metadata: {
                    server_modified: new Date().toISOString(),
                    name: metadata.result.name,
                    size: metadata.result.size
                }
            };
        }
    } catch (error) {
        console.error(`❌ Error getting temporary link: ${error.message}`);
        console.error(`❌ Error status: ${error.status}`);
        console.error(`❌ Error details:`, error);
        
        if (error.status === 409) {
            console.error(`🔍 409 Conflict Error Details:`);
            console.error(`   - This usually indicates an authentication or API version issue`);
            console.error(`   - Check if your access token is valid`);
            console.error(`   - Verify the file path exists: ${filePath}`);
            console.error(`   - Check if your Dropbox app has the correct permissions`);
        } else if (error.status === 401) {
            console.error(`🔍 401 Unauthorized Error Details:`);
            console.error(`   - Access token is invalid or expired`);
            console.error(`   - Check your DROPBOX_REFRESH_TOKEN environment variable`);
        } else if (error.status === 404) {
            console.error(`🔍 404 Not Found Error Details:`);
            console.error(`   - File path does not exist: ${filePath}`);
        }
        throw error;
    }
};

console.log(`✅ Dropbox service initialized successfully`);

module.exports = {
    getAccessToken,
    downloadDropboxStream,
    shareFilePublicly,
    unshareFile,
    filesGetTemporaryLink,
};
