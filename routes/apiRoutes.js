const express = require("express");
const router = express.Router();
const {
    transferDropboxToYouTube,
    shareDropboxFile,
    unshareDropboxFile,
    getDropboxVideoStaticLink,
} = require("../controllers/transferController");
const { uploadEpisode } = require("../controllers/redcircleController");

console.log(`🔧 Setting up API routes...`);

// Middleware to log all API requests
router.use((req, res, next) => {
    console.log(`\n📡 API Request: ${req.method} ${req.path}`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`👤 User Agent: ${req.get('User-Agent')}`);
    console.log(`📊 Request Body Size: ${JSON.stringify(req.body).length} characters`);
    next();
});

// Transfer Dropbox to YouTube
router.post("/transfer", (req, res) => {
    console.log(`🎬 Transfer endpoint called`);
    transferDropboxToYouTube(req, res);
});

// Share Dropbox file
router.post("/share", (req, res) => {
    console.log(`🔗 Share endpoint called`);
    shareDropboxFile(req, res);
});

// Unshare Dropbox file
router.post("/unshare", (req, res) => {
    console.log(`🚫 Unshare endpoint called`);
    unshareDropboxFile(req, res);
});

// Upload to RedCircle
router.post("/redcircle", (req, res) => {
    console.log(`🎙️  RedCircle endpoint called`);
    uploadEpisode(req, res);
});

// Get Dropbox video static link
router.post("/static-link", (req, res) => {
    console.log(`🔗 Static link endpoint called`);
    getDropboxVideoStaticLink(req, res);
});

console.log(`✅ API routes configured successfully`);
console.log(`📋 Available routes:`);
console.log(`   POST /api/transfer - Transfer Dropbox to YouTube`);
console.log(`   POST /api/share - Share Dropbox file`);
console.log(`   POST /api/unshare - Unshare Dropbox file`);
console.log(`   POST /api/redcircle - Upload to RedCircle`);
console.log(`   POST /api/static-link - Get Dropbox video static link`);

module.exports = router;
