const express = require("express");
const { body } = require("express-validator");

const {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile
} = require("../controllers/profileController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");

const router = express.Router();

router.use(protect);

router.get("/me", getMyProfile);
router.put(
  "/me",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("education").trim().notEmpty().withMessage("Education is required"),
    body("experience").trim().notEmpty().withMessage("Experience is required")
  ],
  validateRequest,
  updateMyProfile
);
router.delete("/me", deleteMyProfile);

module.exports = router;
