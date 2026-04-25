const express = require("express");

const { uploadResume, getLatestResume } = require("../controllers/resumeController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(protect);

router.post("/upload", upload.single("resume"), uploadResume);
router.get("/latest", getLatestResume);

module.exports = router;
