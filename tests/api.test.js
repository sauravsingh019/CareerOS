const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { loadAppWithMocks, clearServerModules } = require("./helpers/testApp");

let mongoServer;
let app;

const parserMock = {
  parseResumePdf: async () => ({
    extractedText: "JavaScript React Node.js AWS Docker",
    detectedSkills: ["JavaScript", "React", "Node.js", "AWS", "Docker"]
  })
};

const aiMock = {
  analyzeCareerData: async ({ user, resume }) => ({
    detectedSkills: resume.detectedSkills,
    missingSkills: ["TypeScript", "System Design"],
    suggestedCareerPaths: ["Full Stack Engineering"],
    jobRoles: ["Full Stack Developer"],
    skillsToLearn: ["TypeScript", "System Design"],
    recommendedCourses: ["Full Stack Open", "System Design Fundamentals"],
    summary: `Career guidance for ${user.name}`,
    rawAiResponse: '{"ok":true}'
  }),
  askCareerChatbot: async ({ user, message }) => ({
    answer: `${user.name}, next step: ${message}`
  })
};

const createPdfFixture = () =>
  Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF", "utf8");

const registerAndLogin = async () => {
  const registerResponse = await request(app).post("/api/auth/register").send({
    name: "Test User",
    email: "test@example.com",
    password: "secret123"
  });

  return registerResponse.body.data.token;
};

test.before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_EXPIRES_IN = "1d";

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  await mongoose.connect(process.env.MONGODB_URI);

  app = loadAppWithMocks({
    [path.resolve(__dirname, "../server/src/services/resumeParserService.js")]: parserMock,
    [path.resolve(__dirname, "../server/src/services/aiService.js")]: aiMock
  });
});

test.after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
  clearServerModules();
});

test.afterEach(async () => {
  await mongoose.connection.db.dropDatabase();

  const uploadsDir = path.resolve(__dirname, "../server/uploads");
  if (fs.existsSync(uploadsDir)) {
    fs.readdirSync(uploadsDir).forEach((fileName) => {
      fs.unlinkSync(path.join(uploadsDir, fileName));
    });
  }
});

test("registers and logs in a user with JWT auth", async () => {
  const registerResponse = await request(app).post("/api/auth/register").send({
    name: "Ava Patel",
    email: "ava@example.com",
    password: "secret123"
  });

  assert.equal(registerResponse.statusCode, 201);
  assert.equal(registerResponse.body.success, true);
  assert.ok(registerResponse.body.data.token);
  assert.equal(registerResponse.body.data.user.email, "ava@example.com");

  const loginResponse = await request(app).post("/api/auth/login").send({
    email: "ava@example.com",
    password: "secret123"
  });

  assert.equal(loginResponse.statusCode, 200);
  assert.equal(loginResponse.body.success, true);
  assert.ok(loginResponse.body.data.token);
});

test("updates and fetches the authenticated profile", async () => {
  const token = await registerAndLogin();

  const updateResponse = await request(app)
    .put("/api/profile/me")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Test User",
      skills: ["JavaScript", "React", "Node.js"],
      education: "B.Tech in Computer Science",
      experience: "2 years building SaaS products"
    });

  assert.equal(updateResponse.statusCode, 200);
  assert.deepEqual(updateResponse.body.data.skills, [
    "JavaScript",
    "React",
    "Node.js"
  ]);

  const profileResponse = await request(app)
    .get("/api/profile/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(profileResponse.statusCode, 200);
  assert.equal(profileResponse.body.data.user.name, "Test User");
  assert.equal(profileResponse.body.data.latestResume, null);
  assert.equal(profileResponse.body.data.latestSuggestion, null);
});

test("uploads a resume and stores parsed skills", async () => {
  const token = await registerAndLogin();

  const uploadResponse = await request(app)
    .post("/api/resume/upload")
    .set("Authorization", `Bearer ${token}`)
    .attach("resume", createPdfFixture(), "resume.pdf");

  assert.equal(uploadResponse.statusCode, 201);
  assert.equal(uploadResponse.body.success, true);
  assert.equal(uploadResponse.body.data.fileName, "resume.pdf");
  assert.deepEqual(uploadResponse.body.data.detectedSkills, [
    "JavaScript",
    "React",
    "Node.js",
    "AWS",
    "Docker"
  ]);

  const latestResumeResponse = await request(app)
    .get("/api/resume/latest")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(latestResumeResponse.statusCode, 200);
  assert.equal(latestResumeResponse.body.data.fileName, "resume.pdf");
});

test("runs AI analysis and returns the latest suggestion", async () => {
  const token = await registerAndLogin();

  await request(app)
    .put("/api/profile/me")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Test User",
      skills: ["JavaScript", "React", "Node.js"],
      education: "B.Tech in Computer Science",
      experience: "2 years building SaaS products"
    });

  await request(app)
    .post("/api/resume/upload")
    .set("Authorization", `Bearer ${token}`)
    .attach("resume", createPdfFixture(), "resume.pdf");

  const analysisResponse = await request(app)
    .post("/api/ai/analyze")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(analysisResponse.statusCode, 200);
  assert.deepEqual(analysisResponse.body.data.missingSkills, [
    "TypeScript",
    "System Design"
  ]);
  assert.deepEqual(analysisResponse.body.data.jobRoles, ["Full Stack Developer"]);

  const latestSuggestionResponse = await request(app)
    .get("/api/ai/suggestions/latest")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(latestSuggestionResponse.statusCode, 200);
  assert.equal(
    latestSuggestionResponse.body.data.summary,
    "Career guidance for Test User"
  );
});

test("returns chatbot advice for the authenticated user", async () => {
  const token = await registerAndLogin();

  const chatResponse = await request(app)
    .post("/api/ai/chat")
    .set("Authorization", `Bearer ${token}`)
    .send({
      message: "How should I prepare for a frontend interview?"
    });

  assert.equal(chatResponse.statusCode, 200);
  assert.equal(
    chatResponse.body.data.answer,
    "Test User, next step: How should I prepare for a frontend interview?"
  );
});

test("rejects invalid profile updates and unauthenticated access", async () => {
  const token = await registerAndLogin();

  const invalidProfileResponse = await request(app)
    .put("/api/profile/me")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "",
      skills: [],
      education: "",
      experience: ""
    });

  assert.equal(invalidProfileResponse.statusCode, 400);
  assert.equal(invalidProfileResponse.body.success, false);

  const unauthorizedResponse = await request(app).get("/api/profile/me");
  assert.equal(unauthorizedResponse.statusCode, 401);
});
