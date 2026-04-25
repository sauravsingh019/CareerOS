const recommendationMap = [
  {
    when: ["JavaScript", "React", "Node.js"],
    roles: ["Full Stack Developer", "Frontend Engineer", "Backend Engineer"],
    skillsToLearn: ["TypeScript", "System Design", "Testing"],
    courses: [
      "Meta Front-End Developer Professional Certificate",
      "Node.js, Express, MongoDB Bootcamp",
      "System Design Fundamentals"
    ],
    paths: ["Full Stack Engineering", "Modern Web Development"]
  },
  {
    when: ["Python", "Machine Learning"],
    roles: ["ML Engineer", "Data Scientist", "AI Engineer"],
    skillsToLearn: ["MLOps", "Statistics", "SQL"],
    courses: [
      "Machine Learning Specialization",
      "DeepLearning.AI Generative AI",
      "Applied Data Science with Python"
    ],
    paths: ["Artificial Intelligence", "Data Science"]
  },
  {
    when: ["AWS", "Docker", "Kubernetes"],
    roles: ["DevOps Engineer", "Cloud Engineer", "Platform Engineer"],
    skillsToLearn: ["Terraform", "Observability", "CI/CD"],
    courses: [
      "AWS Cloud Practitioner Essentials",
      "Docker and Kubernetes Complete Guide",
      "CI/CD for Modern Applications"
    ],
    paths: ["Cloud Engineering", "DevOps"]
  }
];

const buildFallbackSuggestion = ({ profileSkills = [], resumeSkills = [] }) => {
  const combinedSkills = [...new Set([...profileSkills, ...resumeSkills])];
  const matchedRecommendation =
    recommendationMap.find((item) =>
      item.when.every((skill) => combinedSkills.includes(skill))
    ) || recommendationMap[0];

  const missingSkills = matchedRecommendation.skillsToLearn.filter(
    (skill) => !combinedSkills.includes(skill)
  );

  return {
    detectedSkills: combinedSkills,
    missingSkills,
    suggestedCareerPaths: matchedRecommendation.paths,
    jobRoles: matchedRecommendation.roles,
    skillsToLearn: matchedRecommendation.skillsToLearn,
    recommendedCourses: matchedRecommendation.courses,
    summary:
      "These recommendations were generated using the built-in suggestion engine because an AI API key is not configured."
  };
};

module.exports = { buildFallbackSuggestion };
