const express = require("express");
const router = express.Router();
const {
    transferDropboxToYouTube,
    shareDropboxFile,
    unshareDropboxFile,
} = require("../controllers/transferController");
const { uploadEpisode } = require("../controllers/redcircleController");

router.post("/redcircle", uploadEpisode);
router.post("/transfer", transferDropboxToYouTube);
router.post("/share", shareDropboxFile);
router.post("/unshare", unshareDropboxFile);
router.get("/test", (req, res) => {return res.send("Okay")})

module.exports = router;
