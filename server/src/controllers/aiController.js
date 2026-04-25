const CareerSuggestion = require("../models/CareerSuggestion");
const Resume = require("../models/Resume");
const asyncHandler = require("../middleware/asyncHandler");
const {
  analyzeCareerData,
  askCareerChatbot,
  streamCareerChat
} = require("../services/aiService");

const analyzeResumeAndCareer = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).sort({
    createdAt: -1
  });

  if (!resume) {
    const error = new Error("Upload a resume before requesting AI analysis");
    error.statusCode = 400;
    throw error;
  }

  const suggestion = await analyzeCareerData({
    user: req.user,
    resume
  });

  const savedSuggestion = await CareerSuggestion.create({
    user: req.user._id,
    resume: resume._id,
    ...suggestion
  });

  res.status(200).json({
    success: true,
    message: "AI analysis completed successfully",
    data: savedSuggestion
  });
});

const getLatestSuggestion = asyncHandler(async (req, res) => {
  const suggestion = await CareerSuggestion.findOne({ user: req.user._id }).sort({
    createdAt: -1
  });

  res.status(200).json({
    success: true,
    data: suggestion
  });
});

const chatWithCareerAssistant = asyncHandler(async (req, res) => {
  const latestSuggestion = await CareerSuggestion.findOne({
    user: req.user._id
  }).sort({
    createdAt: -1
  });

  const response = await askCareerChatbot({
    user: req.user,
    latestSuggestion,
    message: req.body.message
  });

  res.status(200).json({
    success: true,
    data: response
  });
});

const streamCareerAssistantChat = asyncHandler(async (req, res) => {
  const latestSuggestion = await CareerSuggestion.findOne({
    user: req.user._id
  }).sort({
    createdAt: -1
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const result = await streamCareerChat({
      user: req.user,
      latestSuggestion,
      message: req.body.message,
      onToken: (token) => sendEvent("token", { token })
    });

    sendEvent("done", {
      providerUsed: result.providerUsed,
      usedFallback: result.usedFallback
    });
    res.end();
  } catch (error) {
    sendEvent("error", { message: error.message });
    res.end();
  }
});

module.exports = {
  analyzeResumeAndCareer,
  getLatestSuggestion,
  chatWithCareerAssistant,
  streamCareerAssistantChat
};
