const express = require("express");
const router = express.Router();
const {
    transferDropboxToYouTube,
    shareDropboxFile,
    unshareDropboxFile,
} = require("../controllers/transferController");

router.post("/transfer", transferDropboxToYouTube);
router.post("/share", shareDropboxFile);
router.post("/unshare", unshareDropboxFile);

module.exports = router;
