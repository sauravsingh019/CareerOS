const fs = require("fs");
const User = require("../models/User");
const Resume = require("../models/Resume");
const CareerSuggestion = require("../models/CareerSuggestion");
const asyncHandler = require("../middleware/asyncHandler");

const getMyProfile = asyncHandler(async (req, res) => {
  const latestResume = await Resume.findOne({ user: req.user._id }).sort({
    createdAt: -1
  });
  const latestSuggestion = await CareerSuggestion.findOne({
    user: req.user._id
  }).sort({
    createdAt: -1
  });

  res.status(200).json({
    success: true,
    data: {
      user: req.user,
      latestResume,
      latestSuggestion
    }
  });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, skills, education, experience } = req.body;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      name,
      skills: Array.isArray(skills)
        ? skills
        : String(skills || "")
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
      education,
      experience
    },
    { new: true, runValidators: true }
  ).select("-password");

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: updatedUser
  });
});

const deleteMyProfile = asyncHandler(async (req, res) => {
  const resumes = await Resume.find({ user: req.user._id });

  resumes.forEach((resume) => {
    if (resume.filePath && fs.existsSync(resume.filePath)) {
      fs.unlinkSync(resume.filePath);
    }
  });

  await Resume.deleteMany({ user: req.user._id });
  await CareerSuggestion.deleteMany({ user: req.user._id });
  await User.findByIdAndDelete(req.user._id);

  res.status(200).json({
    success: true,
    message: "Profile and related data deleted successfully"
  });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile
};
