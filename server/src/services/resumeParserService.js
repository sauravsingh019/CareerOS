const fs = require("fs");
const pdfParse = require("pdf-parse");
const skillCatalog = require("../utils/skillCatalog");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSkillPattern = (skill) => {
  const escapedSkill = escapeRegex(skill).replace(/\s+/g, "\\s+");

  // Match whole skills only, while still allowing punctuation inside names
  // like Node.js, C#, CI/CD, and REST APIs.
  return new RegExp(`(?<![A-Za-z0-9])${escapedSkill}(?![A-Za-z0-9])`, "i");
};

const extractSkillsFromText = (text = "") => {
  return skillCatalog.filter((skill) => buildSkillPattern(skill).test(text));
};

const parseResumePdf = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  const extractedText = data.text || "";
  const detectedSkills = extractSkillsFromText(extractedText);

  return {
    extractedText,
    detectedSkills
  };
};

module.exports = {
  parseResumePdf,
  extractSkillsFromText
};
