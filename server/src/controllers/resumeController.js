const Resume = require("../models/Resume");
const asyncHandler = require("../middleware/asyncHandler");
const { parseResumePdf } = require("../services/resumeParserService");

const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    const error = new Error("Resume PDF is required");
    error.statusCode = 400;
    throw error;
  }

  const parsedResume = await parseResumePdf(req.file.path);

  const resume = await Resume.create({
    user: req.user._id,
    fileName: req.file.originalname,
    filePath: req.file.path,
    extractedText: parsedResume.extractedText,
    detectedSkills: parsedResume.detectedSkills
  });

  res.status(201).json({
    success: true,
    message: "Resume uploaded successfully",
    data: resume
  });
});

const getLatestResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).sort({
    createdAt: -1
  });

  if (!resume) {
    return res.status(200).json({
      success: true,
      data: null
    });
  }

  res.status(200).json({
    success: true,
    data: resume
  });
});

module.exports = {
  uploadResume,
  getLatestResume
};
