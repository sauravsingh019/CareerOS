const state = {
  token: localStorage.getItem("careerAssistantToken"),
  user: JSON.parse(localStorage.getItem("careerAssistantUser") || "null"),
  latestResume: null,
  latestSuggestion: null,
  activeAssistantBubble: null
};

const page = document.body.dataset.page;
const requiresAuth = document.body.dataset.requiresAuth === "true";
const toast = document.getElementById("toast");

const apiRequest = async (endpoint, options = {}) => {
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (state.token) {
    headers.set("Authorization", `Bearer ${state.token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};

const showToast = (message, isError = false) => {
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.style.background = isError
    ? "linear-gradient(145deg, #8b1e33, #bf2f45)"
    : "linear-gradient(145deg, #16181d, #292d36)";

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
};

const setLoading = (button, isLoading, loadingLabel = "Loading...") => {
  if (!button) {
    return;
  }

  if (isLoading) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = loadingLabel;
    button.disabled = true;
    button.style.opacity = "0.7";
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
    button.style.opacity = "1";
  }
};

const getChatFallbackResponse = async (message) => {
  const response = await apiRequest("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message })
  });

  return response.data.answer || "";
};

const persistSession = ({ token, user }) => {
  state.token = token;
  state.user = user;
  localStorage.setItem("careerAssistantToken", token);
  localStorage.setItem("careerAssistantUser", JSON.stringify(user));
};

const clearSession = () => {
  state.token = null;
  state.user = null;
  state.latestResume = null;
  state.latestSuggestion = null;
  localStorage.removeItem("careerAssistantToken");
  localStorage.removeItem("careerAssistantUser");
};

const redirectToAuth = () => {
  window.location.href = "/auth.html";
};

const bindLogout = () => {
  const logoutButton = document.getElementById("logoutButton");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", () => {
    clearSession();
    showToast("Logged out");
    window.setTimeout(() => {
      redirectToAuth();
    }, 300);
  });
};

const renderChips = (elementId, items = [], emptyLabel = "No data yet") => {
  const container = document.getElementById(elementId);

  if (!container) {
    return;
  }

  container.innerHTML = items.length
    ? items.map((item) => `<span>${item}</span>`).join("")
    : `<span>${emptyLabel}</span>`;
};

const renderResume = (resume) => {
  state.latestResume = resume;

  const resumeMeta = document.getElementById("resumeMeta");
  if (!resumeMeta) {
    return;
  }

  if (!resume) {
    resumeMeta.innerHTML =
      "No resume uploaded yet. Upload a PDF to unlock skill extraction and AI insights.";
    return;
  }

  resumeMeta.innerHTML = `
    <strong>Latest upload:</strong> ${resume.fileName}<br />
    <strong>Detected skills:</strong> ${
      resume.detectedSkills?.join(", ") || "No skills detected yet"
    }
  `;
};

const renderSuggestion = (suggestion) => {
  state.latestSuggestion = suggestion;

  renderChips("detectedSkills", suggestion?.detectedSkills || []);
  renderChips("missingSkills", suggestion?.missingSkills || []);
  renderChips("careerPaths", suggestion?.suggestedCareerPaths || []);
  renderChips("jobRoles", suggestion?.jobRoles || []);
  renderChips("skillsToLearn", suggestion?.skillsToLearn || []);
  renderChips("courses", suggestion?.recommendedCourses || []);

  const summary = document.getElementById("analysisSummary");
  if (summary) {
    summary.textContent =
      suggestion?.summary || "Run AI analysis to populate this section.";
  }

  const metricAnalysisStatus = document.getElementById("metricAnalysisStatus");
  if (metricAnalysisStatus) {
    metricAnalysisStatus.textContent = suggestion ? "Ready" : "Waiting";
  }
};

const renderUser = (user) => {
  if (!user) {
    return;
  }

  state.user = user;
  localStorage.setItem("careerAssistantUser", JSON.stringify(user));

  const navUserName = document.getElementById("navUserName");
  if (navUserName) {
    navUserName.textContent = user.name;
  }

  const welcomeHeading = document.getElementById("welcomeHeading");
  if (welcomeHeading && page === "dashboard") {
    welcomeHeading.textContent = `${user.name}'s career dashboard`;
  }

  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.name.value = user.name || "";
    profileForm.skills.value = (user.skills || []).join(", ");
    profileForm.education.value = user.education || "";
    profileForm.experience.value = user.experience || "";
  }

  const metricSkillsCount = document.getElementById("metricSkillsCount");
  if (metricSkillsCount) {
    metricSkillsCount.textContent = String((user.skills || []).length);
  }
};

const appendChatMessage = (role, text) => {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) {
    return null;
  }

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
};

const hydratePrivateData = async () => {
  const profileResponse = await apiRequest("/api/profile/me");
  renderUser(profileResponse.data.user);
  renderResume(profileResponse.data.latestResume);
  renderSuggestion(profileResponse.data.latestSuggestion);

  const metricResumeStatus = document.getElementById("metricResumeStatus");
  if (metricResumeStatus) {
    metricResumeStatus.textContent = profileResponse.data.latestResume ? "Uploaded" : "Pending";
  }
};

const initAnimations = () => {
  const revealItems = document.querySelectorAll(".reveal");

  if (!revealItems.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
};

const initAuthPage = () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  if (state.token) {
    window.location.href = "/dashboard.html";
    return;
  }

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".segment").forEach((segment) => {
        segment.classList.remove("active");
      });

      button.classList.add("active");
      const isRegister = button.dataset.tab === "register";
      registerForm.classList.toggle("hidden", !isRegister);
      loginForm.classList.toggle("hidden", isRegister);
    });
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = Object.fromEntries(new FormData(registerForm).entries());
      const response = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      persistSession(response.data);
      showToast("Account created");
      window.setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 300);
    } catch (error) {
      showToast(error.message, true);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = Object.fromEntries(new FormData(loginForm).entries());
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      persistSession(response.data);
      showToast("Welcome back");
      window.setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 300);
    } catch (error) {
      showToast(error.message, true);
    }
  });
};

const initDashboardPage = () => {
  const profileForm = document.getElementById("profileForm");

  if (!profileForm) {
    return;
  }

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = {
        name: profileForm.name.value.trim(),
        skills: profileForm.skills.value
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        education: profileForm.education.value.trim(),
        experience: profileForm.experience.value.trim()
      };

      if (!payload.skills.length) {
        throw new Error("Please add at least one skill");
      }

      const response = await apiRequest("/api/profile/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      renderUser(response.data);
      showToast("Profile updated");
    } catch (error) {
      showToast(error.message, true);
    }
  });
};

const initAnalysisPage = () => {
  const resumeForm = document.getElementById("resumeForm");
  const runAnalysisButton = document.getElementById("runAnalysisButton");

  if (resumeForm) {
    resumeForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const file = resumeForm.resume.files[0];
        if (!file) {
          throw new Error("Please choose a PDF resume");
        }

        if (file.type !== "application/pdf") {
          throw new Error("Only PDF resumes are allowed");
        }

        const formData = new FormData();
        formData.append("resume", file);

        const response = await apiRequest("/api/resume/upload", {
          method: "POST",
          body: formData
        });

        renderResume(response.data);
        resumeForm.reset();
        showToast("Resume uploaded");
      } catch (error) {
        showToast(error.message, true);
      }
    });
  }

  if (runAnalysisButton) {
    runAnalysisButton.addEventListener("click", async () => {
      try {
        const response = await apiRequest("/api/ai/analyze", {
          method: "POST"
        });

        renderSuggestion(response.data);
        showToast("AI analysis completed");
      } catch (error) {
        showToast(error.message, true);
      }
    });
  }
};

const initChatPage = () => {
  const chatForm = document.getElementById("chatForm");

  if (!chatForm) {
    return;
  }

  if (!document.getElementById("chatMessages").children.length) {
    appendChatMessage(
      "assistant",
      "I'm your AI career coach. Ask about role transitions, interviews, resume positioning, or the fastest skills to learn next."
    );
  }

  document.querySelectorAll(".prompt-chip").forEach((button) => {
    button.addEventListener("click", () => {
      chatForm.message.value = button.dataset.prompt;
      chatForm.message.focus();
    });
  });

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    let outgoingMessage = "";

    try {
      const submitButton = chatForm.querySelector("button[type='submit']");
      const message = chatForm.message.value.trim();
      outgoingMessage = message;

      if (!message) {
        throw new Error("Please enter a message");
      }

      appendChatMessage("user", message);
      chatForm.reset();
      const assistantBubble = appendChatMessage("assistant", "");
      state.activeAssistantBubble = assistantBubble;
      setLoading(submitButton, true, "Thinking...");

      const response = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.token}`
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Unable to stream AI response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const [eventLine, dataLine] = event.split("\n");
          const eventName = eventLine?.replace("event: ", "").trim();
          const payload = JSON.parse(dataLine?.replace("data: ", "") || "{}");

          if (eventName === "token") {
            assistantBubble.textContent += payload.token || "";
          }

          if (eventName === "error") {
            throw new Error(payload.message || "Streaming request failed");
          }
        }
      }

      if (!assistantBubble.textContent.trim()) {
        const fallbackAnswer = await getChatFallbackResponse(message);
        assistantBubble.textContent =
          fallbackAnswer || "No response returned.";
      }
    } catch (error) {
      try {
        const fallbackAnswer = await getChatFallbackResponse(outgoingMessage);

        if (state.activeAssistantBubble && !state.activeAssistantBubble.textContent.trim()) {
          state.activeAssistantBubble.textContent =
            fallbackAnswer || error.message;
        } else {
          appendChatMessage("assistant", fallbackAnswer || error.message);
        }
      } catch (fallbackError) {
        if (state.activeAssistantBubble && !state.activeAssistantBubble.textContent.trim()) {
          state.activeAssistantBubble.textContent = error.message;
        } else {
          appendChatMessage("assistant", error.message);
        }
      }
      showToast(error.message, true);
    } finally {
      const submitButton = chatForm.querySelector("button[type='submit']");
      setLoading(submitButton, false);
      state.activeAssistantBubble = null;
    }
  });
};

const bootstrap = async () => {
  initAnimations();
  bindLogout();

  if (page === "auth") {
    initAuthPage();
    return;
  }

  if (requiresAuth && !state.token) {
    redirectToAuth();
    return;
  }

  if (requiresAuth) {
    try {
      await hydratePrivateData();
    } catch (error) {
      clearSession();
      showToast("Session expired. Please sign in again.", true);
      window.setTimeout(() => {
        redirectToAuth();
      }, 300);
      return;
    }
  }

  if (page === "dashboard") {
    initDashboardPage();
  }

  if (page === "analysis") {
    initAnalysisPage();
  }

  if (page === "chat") {
    initChatPage();
  }
};

bootstrap();
