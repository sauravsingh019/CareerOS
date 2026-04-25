const mongoose = require("mongoose");

const careerSuggestionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume"
    },
    detectedSkills: {
      type: [String],
      default: []
    },
    missingSkills: {
      type: [String],
      default: []
    },
    suggestedCareerPaths: {
      type: [String],
      default: []
    },
    jobRoles: {
      type: [String],
      default: []
    },
    skillsToLearn: {
      type: [String],
      default: []
    },
    recommendedCourses: {
      type: [String],
      default: []
    },
    summary: {
      type: String,
      default: ""
    },
    rawAiResponse: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("CareerSuggestion", careerSuggestionSchema);
