const OpenAI = require("openai");
const { buildFallbackSuggestion } = require("./suggestionEngine");

const buildAnalysisPrompt = ({ name, skills, education, experience, resumeText }) => `
You are an expert AI career advisor.
Return valid JSON only with the following shape:
{
  "detectedSkills": ["string"],
  "missingSkills": ["string"],
  "suggestedCareerPaths": ["string"],
  "jobRoles": ["string"],
  "skillsToLearn": ["string"],
  "recommendedCourses": ["string"],
  "summary": "string"
}

User profile:
- Name: ${name || "Unknown"}
- Skills: ${(skills || []).join(", ") || "None provided"}
- Education: ${education || "Not provided"}
- Experience: ${experience || "Not provided"}

Resume text:
${resumeText || "No resume text available"}
`;

const buildChatPrompt = ({ user, latestSuggestion, message }) => `
Profile:
- Name: ${user.name}
- Skills: ${user.skills.join(", ") || "None"}
- Education: ${user.education || "Not provided"}
- Experience: ${user.experience || "Not provided"}

Latest AI insights:
${latestSuggestion ? JSON.stringify(latestSuggestion) : "No prior suggestion"}

User question:
${message}
`;

const resolvePreferredProvider = () =>
  (process.env.AI_PROVIDER || "fallback").toLowerCase();

const normalizeProviderError = (provider, error) => {
  const message = error?.message || "Unknown provider error";
  const normalized = new Error(`${provider.toUpperCase()}: ${message}`);
  normalized.provider = provider;
  normalized.statusCode = 502;
  return normalized;
};

const parseJsonResponse = (rawResponse, fallbackResumeSkills = []) => {
  const parsedResponse = JSON.parse(rawResponse || "{}");

  return {
    detectedSkills: parsedResponse.detectedSkills || fallbackResumeSkills,
    missingSkills: parsedResponse.missingSkills || [],
    suggestedCareerPaths: parsedResponse.suggestedCareerPaths || [],
    jobRoles: parsedResponse.jobRoles || [],
    skillsToLearn: parsedResponse.skillsToLearn || [],
    recommendedCourses: parsedResponse.recommendedCourses || [],
    summary: parsedResponse.summary || "",
    rawAiResponse: rawResponse || ""
  };
};

const getConfiguredProviders = () => {
  const providers = [];
  const preferred = resolvePreferredProvider();

  if (preferred !== "fallback") {
    providers.push(preferred);
  }

  if (process.env.GEMINI_API_KEY && !providers.includes("gemini")) {
    providers.push("gemini");
  }

  if (process.env.GROK_API_KEY && !providers.includes("grok")) {
    providers.push("grok");
  }

  if (process.env.OPENAI_API_KEY && !providers.includes("openai")) {
    providers.push("openai");
  }

  if (process.env.OPENROUTER_API_KEY && !providers.includes("openrouter")) {
    providers.push("openrouter");
  }

  return providers;
};

const getOpenAiCompatibleClient = (apiKey, baseURL) =>
  new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {})
  });

const callOpenAiCompatibleJson = async ({ apiKey, baseURL, model, prompt, system }) => {
  const client = getOpenAiCompatibleClient(apiKey, baseURL);
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ]
  });

  return completion.choices[0]?.message?.content || "{}";
};

const callOpenAiCompatibleChat = async ({ apiKey, baseURL, model, prompt, system }) => {
  const client = getOpenAiCompatibleClient(apiKey, baseURL);
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.55,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ]
  });

  return completion.choices[0]?.message?.content || "";
};

const streamOpenAiCompatibleChat = async ({
  apiKey,
  baseURL,
  model,
  prompt,
  system,
  onToken
}) => {
  const client = getOpenAiCompatibleClient(apiKey, baseURL);
  const stream = await client.chat.completions.create({
    model,
    temperature: 0.55,
    stream: true,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ]
  });

  let answer = "";

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content || "";
    if (delta) {
      answer += delta;
      onToken(delta);
    }
  }

  return answer;
};

const callGemini = async ({ prompt, model, systemInstruction }) => {
  const apiKey = process.env.GEMINI_API_KEY;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json"
        },
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(bodyText || `Gemini request failed with status ${response.status}`);
  }

  const data = JSON.parse(bodyText);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
};

const callGeminiChat = async ({ prompt, model, systemInstruction }) => {
  const apiKey = process.env.GEMINI_API_KEY;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.55
        },
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(bodyText || `Gemini chat failed with status ${response.status}`);
  }

  const data = JSON.parse(bodyText);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

const streamGeminiChat = async ({ prompt, model, systemInstruction, onToken }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.55
        },
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini stream failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const lines = event
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s*/, ""));

      for (const line of lines) {
        if (!line || line === "[DONE]") {
          continue;
        }

        try {
          const data = JSON.parse(line);
          const delta =
            data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") ||
            "";

          if (delta) {
            const freshText = delta.slice(answer.length);
            if (freshText) {
              answer += freshText;
              onToken(freshText);
            }
          }
        } catch (error) {
          // Ignore malformed partial SSE chunks and keep streaming.
        }
      }
    }
  }

  return answer;
};

const runAnalysisWithProvider = async ({ provider, user, resume }) => {
  const prompt = buildAnalysisPrompt({
    name: user.name,
    skills: user.skills,
    education: user.education,
    experience: user.experience,
    resumeText: resume.extractedText
  });

  if (provider === "gemini") {
    const rawResponse = await callGemini({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      prompt,
      systemInstruction:
        "You are a precise career assistant that returns structured JSON for application consumption."
    });

    return parseJsonResponse(rawResponse, resume.detectedSkills || []);
  }

  if (provider === "grok") {
    const rawResponse = await callOpenAiCompatibleJson({
      apiKey: process.env.GROK_API_KEY,
      baseURL: "https://api.x.ai/v1",
      model: process.env.GROK_MODEL || "grok-4",
      prompt,
      system:
        "You are a precise career assistant that returns structured JSON for application consumption."
    });

    return parseJsonResponse(rawResponse, resume.detectedSkills || []);
  }

  if (provider === "openai") {
    const rawResponse = await callOpenAiCompatibleJson({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      prompt,
      system:
        "You are a precise career assistant that returns structured JSON for application consumption."
    });

    return parseJsonResponse(rawResponse, resume.detectedSkills || []);
  }

  if (provider === "openrouter") {
    const rawResponse = await callOpenAiCompatibleJson({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_MODEL || "openrouter/free",
      prompt,
      system:
        "You are a precise career assistant that returns structured JSON for application consumption."
    });

    return parseJsonResponse(rawResponse, resume.detectedSkills || []);
  }

  throw new Error(`Unsupported provider: ${provider}`);
};

const runChatWithProvider = async ({ provider, user, latestSuggestion, message }) => {
  const prompt = buildChatPrompt({ user, latestSuggestion, message });
  const system =
    "You are a helpful career coach. Give concise, actionable advice tailored to the user's profile and suggestions.";

  if (provider === "gemini") {
    return callGeminiChat({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      prompt,
      systemInstruction: system
    });
  }

  if (provider === "grok") {
    return callOpenAiCompatibleChat({
      apiKey: process.env.GROK_API_KEY,
      baseURL: "https://api.x.ai/v1",
      model: process.env.GROK_MODEL || "grok-4",
      prompt,
      system
    });
  }

  if (provider === "openai") {
    return callOpenAiCompatibleChat({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      prompt,
      system
    });
  }

  if (provider === "openrouter") {
    return callOpenAiCompatibleChat({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_MODEL || "openrouter/free",
      prompt,
      system
    });
  }

  throw new Error(`Unsupported provider: ${provider}`);
};

const streamChatWithProvider = async ({
  provider,
  user,
  latestSuggestion,
  message,
  onToken
}) => {
  const prompt = buildChatPrompt({ user, latestSuggestion, message });
  const system =
    "You are a helpful career coach. Give concise, actionable advice tailored to the user's profile and suggestions.";

  if (provider === "gemini") {
    return streamGeminiChat({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      prompt,
      systemInstruction: system,
      onToken
    });
  }

  if (provider === "grok") {
    return streamOpenAiCompatibleChat({
      apiKey: process.env.GROK_API_KEY,
      baseURL: "https://api.x.ai/v1",
      model: process.env.GROK_MODEL || "grok-4",
      prompt,
      system,
      onToken
    });
  }

  if (provider === "openai") {
    return streamOpenAiCompatibleChat({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      prompt,
      system,
      onToken
    });
  }

  if (provider === "openrouter") {
    return streamOpenAiCompatibleChat({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_MODEL || "openrouter/free",
      prompt,
      system,
      onToken
    });
  }

  throw new Error(`Unsupported provider: ${provider}`);
};

const analyzeCareerData = async ({ user, resume }) => {
  const providers = getConfiguredProviders();
  const errors = [];

  for (const provider of providers) {
    try {
      const result = await runAnalysisWithProvider({ provider, user, resume });
      return {
        ...result,
        providerUsed: provider,
        usedFallback: false
      };
    } catch (error) {
      errors.push(normalizeProviderError(provider, error));
    }
  }

  if (providers.length > 0) {
    const joinedMessage = errors.map((error) => error.message).join(" | ");
    const finalError = new Error(
      `All configured AI providers failed. ${joinedMessage}`
    );
    finalError.statusCode = 502;
    throw finalError;
  }

  const fallback = buildFallbackSuggestion({
    profileSkills: user.skills,
    resumeSkills: resume.detectedSkills
  });

  return {
    ...fallback,
    providerUsed: "fallback",
    usedFallback: true
  };
};

const askCareerChatbot = async ({ user, latestSuggestion, message }) => {
  const providers = getConfiguredProviders();
  const errors = [];

  for (const provider of providers) {
    try {
      const answer = await runChatWithProvider({
        provider,
        user,
        latestSuggestion,
        message
      });

      return {
        answer: answer || "I could not generate a response right now.",
        providerUsed: provider,
        usedFallback: false
      };
    } catch (error) {
      errors.push(normalizeProviderError(provider, error));
    }
  }

  if (providers.length > 0) {
    const joinedMessage = errors.map((error) => error.message).join(" | ");
    const finalError = new Error(
      `All configured AI providers failed. ${joinedMessage}`
    );
    finalError.statusCode = 502;
    throw finalError;
  }

  return {
    answer:
      "I can still help without a live AI key. Focus on sharpening your strongest two skills, build one portfolio project that shows measurable impact, and prepare concise stories that connect your experience to the role you want next.",
    providerUsed: "fallback",
    usedFallback: true
  };
};

const streamCareerChat = async ({
  user,
  latestSuggestion,
  message,
  onToken
}) => {
  const providers = getConfiguredProviders();
  const errors = [];

  for (const provider of providers) {
    try {
      const answer = await streamChatWithProvider({
        provider,
        user,
        latestSuggestion,
        message,
        onToken
      });

      return {
        answer,
        providerUsed: provider,
        usedFallback: false
      };
    } catch (error) {
      errors.push(normalizeProviderError(provider, error));
    }
  }

  if (providers.length > 0) {
    const joinedMessage = errors.map((error) => error.message).join(" | ");
    const finalError = new Error(
      `All configured AI providers failed. ${joinedMessage}`
    );
    finalError.statusCode = 502;
    throw finalError;
  }

  const fallbackAnswer =
    "I can still help without a live AI key. Focus on sharpening your strongest two skills, build one portfolio project that shows measurable impact, and prepare concise stories that connect your experience to the role you want next.";
  onToken(fallbackAnswer);

  return {
    answer: fallbackAnswer,
    providerUsed: "fallback",
    usedFallback: true
  };
};

module.exports = {
  analyzeCareerData,
  askCareerChatbot,
  streamCareerChat
};
