const express = require("express");
const { body } = require("express-validator");

const {
  analyzeResumeAndCareer,
  getLatestSuggestion,
  chatWithCareerAssistant,
  streamCareerAssistantChat
} = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");

const router = express.Router();

router.use(protect);

router.post("/analyze", analyzeResumeAndCareer);
router.get("/suggestions/latest", getLatestSuggestion);
router.post(
  "/chat",
  [body("message").trim().notEmpty().withMessage("Chat message is required")],
  validateRequest,
  chatWithCareerAssistant
);
router.post(
  "/chat/stream",
  [body("message").trim().notEmpty().withMessage("Chat message is required")],
  validateRequest,
  streamCareerAssistantChat
);

module.exports = router;
