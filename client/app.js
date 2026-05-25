/* ──────────────────────────────────────────
   CareerOS · app.js
   All pages share this script. Page-specific
   initializers are called from bootstrap().
────────────────────────────────────────── */

const API_BASE = window.CAREEROS_API_URL || 
  (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? (window.location.port === "5051" || window.location.port === "5050" ? "" : "http://localhost:5051")
    : "");

// ─── State ────────────────────────────────
const state = {
  token: localStorage.getItem("careerAssistantToken"),
  user: JSON.parse(localStorage.getItem("careerAssistantUser") || "null"),
  latestResume: null,
  latestSuggestion: null,
  activeAssistantBubble: null,
  typingIndicator: null,
  progressInterval: null
};

const page = document.body.dataset.page;
const requiresAuth = document.body.dataset.requiresAuth === "true";
const toast = document.getElementById("toast");

// ─── API Helper ───────────────────────────
const apiRequest = async (endpoint, options = {}) => {
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (state.token) {
    headers.set("Authorization", `Bearer ${state.token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};

// ─── Toast ────────────────────────────────
const showToast = (message, isError = false) => {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast${isError ? " error" : ""}`;
  toast.classList.remove("hidden");
  window.clearTimeout(showToast._tid);
  showToast._tid = window.setTimeout(() => toast.classList.add("hidden"), 3000);
};

// ─── Button Loading ───────────────────────
const setLoading = (button, isLoading, loadingLabel = "Loading...") => {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = loadingLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
  }
};

// ─── Session ──────────────────────────────
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
  window.location.href = "auth.html";
};

// ─── Logout ───────────────────────────────
const bindLogout = () => {
  const logoutButton = document.getElementById("logoutButton");
  if (!logoutButton) return;
  logoutButton.addEventListener("click", () => {
    clearSession();
    showToast("Logged out successfully");
    window.setTimeout(() => redirectToAuth(), 300);
  });
};

// ─── Chip Renderer ────────────────────────
const chipColors = ["chip-purple", "chip-pink", "chip-green", "chip-amber", "chip-default"];

const renderChips = (elementId, items = [], emptyLabel = "—") => {
  const container = document.getElementById(elementId);
  if (!container) return;
  container.innerHTML = items.length
    ? items.map((item, i) =>
        `<span class="chip ${chipColors[i % chipColors.length]}">${item}</span>`
      ).join("")
    : `<span class="chip chip-default">${emptyLabel}</span>`;
};

// ─── Resume Display ───────────────────────
const renderResume = (resume) => {
  state.latestResume = resume;
  const resumeMeta = document.getElementById("resumeMeta");
  if (!resumeMeta) return;

  if (!resume) {
    resumeMeta.innerHTML = `No resume uploaded yet. Upload a PDF to unlock skill extraction and AI insights.`;
    return;
  }

  resumeMeta.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="font-size:1.4rem;">📄</span>
      <div>
        <strong style="color:var(--text);display:block;">${resume.fileName || "resume.pdf"}</strong>
        <span style="font-size:0.78rem;color:var(--text-3);">Uploaded successfully</span>
      </div>
    </div>
    <div style="font-size:0.82rem;color:var(--text-2);">
      <strong>Detected skills:</strong> ${resume.detectedSkills?.join(", ") || "No skills detected yet"}
    </div>
  `;
};

// ─── Suggestion Display ───────────────────
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
    metricAnalysisStatus.textContent = suggestion ? "Ready ✓" : "Waiting";
    if (suggestion) metricAnalysisStatus.style.color = "var(--green)";
  }

  // Provider badge (analysis page)
  if (suggestion?.providerUsed) {
    const providerBadgeWrap = document.getElementById("providerBadgeWrap");
    const providerBadge = document.getElementById("providerBadge");
    if (providerBadgeWrap && providerBadge) {
      providerBadge.textContent = `🤖 via ${suggestion.providerUsed}`;
      providerBadgeWrap.classList.remove("hidden");
    }
  }
};

// ─── User Display ─────────────────────────
const renderUser = (user) => {
  if (!user) return;
  state.user = user;
  localStorage.setItem("careerAssistantUser", JSON.stringify(user));

  // Nav username
  const navUserName = document.getElementById("navUserName");
  if (navUserName) navUserName.textContent = user.name;

  // Welcome heading
  const welcomeHeading = document.getElementById("welcomeHeading");
  if (welcomeHeading && page === "dashboard") {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    welcomeHeading.textContent = `${greeting}, ${user.name.split(" ")[0]} ✦`;
  }

  // Profile form
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.name.value = user.name || "";
    profileForm.skills.value = (user.skills || []).join(", ");
    profileForm.education.value = user.education || "";
    profileForm.experience.value = user.experience || "";
  }

  // Metrics
  const metricSkillsCount = document.getElementById("metricSkillsCount");
  if (metricSkillsCount) {
    metricSkillsCount.textContent = String((user.skills || []).length);
  }

  // Profile completeness bar
  updateCompleteness(user);

  // Sidebar profile in chat
  const sidebarProfile = document.getElementById("sidebarProfile");
  const sidebarProfileName = document.getElementById("sidebarProfileName");
  const sidebarProfileSkills = document.getElementById("sidebarProfileSkills");
  if (sidebarProfile && user) {
    sidebarProfileName.textContent = user.name || "—";
    sidebarProfileSkills.textContent = (user.skills || []).slice(0, 5).join(", ") || "No skills listed";
    sidebarProfile.style.display = "block";
  }
};

// ─── Profile Completeness ─────────────────
const updateCompleteness = (user) => {
  const bar = document.getElementById("completenessBarFill");
  const percent = document.getElementById("completenessPercent");
  if (!bar || !user) return;

  let score = 0;
  if (user.name) score += 25;
  if ((user.skills || []).length > 0) score += 25;
  if (user.education) score += 25;
  if (user.experience) score += 25;

  setTimeout(() => {
    bar.style.width = `${score}%`;
    if (percent) percent.textContent = `${score}%`;
  }, 300);
};

// ─── Skeleton Loaders ─────────────────────
const showSkeletons = () => {
  const cardIds = ["cardDetected", "cardMissing", "cardPaths", "cardRoles", "cardLearn", "cardCourses"];
  cardIds.forEach((id) => {
    const card = document.getElementById(id);
    if (card) {
      const chipList = card.querySelector(".chip-list");
      if (chipList) {
        chipList.innerHTML = `
          <div class="skeleton skeleton-chip" style="width:70px;"></div>
          <div class="skeleton skeleton-chip" style="width:90px;"></div>
          <div class="skeleton skeleton-chip" style="width:60px;"></div>
        `;
      }
    }
  });

  const summary = document.getElementById("analysisSummary");
  if (summary) {
    summary.innerHTML = `
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text" style="width:55%;"></div>
    `;
  }
};

const hideSkeletons = () => {
  // Skeletons are replaced by real content via renderSuggestion
};

// ─── AI Progress Bar ──────────────────────
const startProgress = () => {
  const wrap = document.getElementById("aiProgressWrap");
  const fill = document.getElementById("aiProgressFill");
  const label = document.getElementById("aiProgressLabel");
  if (!wrap || !fill) return;

  wrap.classList.add("is-active");
  let progress = 0;

  const phases = [
    { target: 30, label: "📄 Parsing resume text..." },
    { target: 60, label: "🧠 Analyzing skills and gaps..." },
    { target: 85, label: "🎯 Generating role recommendations..." },
    { target: 95, label: "✨ Finalizing insights..." }
  ];

  let phaseIndex = 0;
  state.progressInterval = setInterval(() => {
    if (phaseIndex < phases.length && progress >= phases[phaseIndex].target) {
      phaseIndex++;
    }
    if (phaseIndex < phases.length) {
      if (label) label.textContent = phases[phaseIndex]?.label || "";
      progress = Math.min(progress + Math.random() * 3, phases[phaseIndex]?.target || 95);
    } else {
      progress = Math.min(progress + 0.3, 95);
    }
    fill.style.width = `${progress}%`;
  }, 300);
};

const finishProgress = () => {
  clearInterval(state.progressInterval);
  const fill = document.getElementById("aiProgressFill");
  const label = document.getElementById("aiProgressLabel");
  const wrap = document.getElementById("aiProgressWrap");
  if (fill) fill.style.width = "100%";
  if (label) label.textContent = "✅ Analysis complete!";
  setTimeout(() => {
    if (wrap) wrap.classList.remove("is-active");
    if (fill) fill.style.width = "0%";
  }, 1800);
};

// ─── Chat Helpers ─────────────────────────
const formatTime = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const parseInlineMarkdown = (text) => {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold **text**
    .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic *text*
    .replace(/`(.*?)`/g, "<code>$1</code>"); // Inline code `code`
};

const renderMarkdown = (text) => {
  if (!text) return "";

  // 1. Clean HTML entities to prevent XSS but allow our own rendering
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Restore safe <br> tags if generated by the system
  html = html.replace(/&lt;br\s*\/?&gt;/gi, "<br>");

  // 2. Parse Tables (lines starting and ending with |)
  const lines = html.split("\n");
  let inTable = false;
  let tableHeader = null;
  let tableRows = [];
  const renderedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .split("|")
        .map(c => c.trim())
        .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      const isSeparator = cells.every(c => /^[-:|]+$/.test(c));
      if (isSeparator) {
        continue; // skip line dividers like |---|---|
      }

      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
    } else {
      if (inTable) {
        let tableHtml = `<div class="table-container"><table class="markdown-table"><thead><tr>`;
        tableHeader.forEach(cell => {
          tableHtml += `<th>${parseInlineMarkdown(cell)}</th>`;
        });
        tableHtml += `</tr></thead><tbody>`;
        tableRows.forEach(row => {
          tableHtml += `<tr>`;
          row.forEach(cell => {
            tableHtml += `<td>${parseInlineMarkdown(cell)}</td>`;
          });
          tableHtml += `</tr>`;
        });
        tableHtml += `</tbody></table></div>`;
        renderedLines.push(tableHtml);
        
        inTable = false;
        tableHeader = null;
        tableRows = [];
      }
      renderedLines.push(line);
    }
  }

  if (inTable) {
    let tableHtml = `<div class="table-container"><table class="markdown-table"><thead><tr>`;
    tableHeader.forEach(cell => {
      tableHtml += `<th>${parseInlineMarkdown(cell)}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;
    tableRows.forEach(row => {
      tableHtml += `<tr>`;
      row.forEach(cell => {
        tableHtml += `<td>${parseInlineMarkdown(cell)}</td>`;
      });
      tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table></div>`;
    renderedLines.push(tableHtml);
  }

  html = renderedLines.join("\n");

  // 3. Block Elements (Headers, HRs, Lists)
  html = html
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/^---$/gim, "<hr>");

  // Parse list bullets
  let inList = false;
  const finalLines = html.split("\n");
  for (let i = 0; i < finalLines.length; i++) {
    const line = finalLines[i];
    const match = line.match(/^\s*[-•*]\s+(.*$)/i);
    if (match) {
      if (!inList) {
        inList = true;
        finalLines[i] = `<ul><li>${match[1]}</li>`;
      } else {
        finalLines[i] = `<li>${match[1]}</li>`;
      }
    } else {
      if (inList) {
        inList = false;
        finalLines[i] = `</ul>${line}`;
      }
    }
  }
  if (inList) {
    finalLines.push("</ul>");
  }
  html = finalLines.join("\n");

  // 4. Inline elements (Bold, Italic, Code)
  html = parseInlineMarkdown(html);

  // 5. Line Breaks
  html = html.replace(/\n/g, "<br>");

  // Clean double <br> near block tags for perfect spacing
  html = html
    .replace(/<\/h[1-3]><br>/gi, "<\/h3>")
    .replace(/<hr><br>/gi, "<hr>")
    .replace(/<\/ul><br>/gi, "<\/ul>")
    .replace(/<\/table><\/div><br>/gi, "<\/table><\/div>");

  return html;
};

const appendChatMessage = (role, text) => {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return null;

  const wrapper = document.createElement("div");
  wrapper.className = `chat-message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  
  if (role === "assistant" && text) {
    bubble.innerHTML = renderMarkdown(text);
  } else {
    bubble.textContent = text;
  }

  const timestamp = document.createElement("span");
  timestamp.className = "chat-timestamp";
  timestamp.textContent = formatTime();

  wrapper.appendChild(bubble);
  wrapper.appendChild(timestamp);
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return bubble;
};

const showTypingIndicator = () => {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return null;

  const wrapper = document.createElement("div");
  wrapper.className = "chat-message assistant";
  wrapper.id = "typingWrapper";

  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  indicator.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;

  wrapper.appendChild(indicator);
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  state.typingIndicator = wrapper;
  return indicator;
};

const hideTypingIndicator = () => {
  if (state.typingIndicator) {
    state.typingIndicator.remove();
    state.typingIndicator = null;
  }
};

// ─── Hydrate Data ─────────────────────────
const hydratePrivateData = async () => {
  const profileResponse = await apiRequest("/api/profile/me");
  renderUser(profileResponse.data.user);
  renderResume(profileResponse.data.latestResume);
  renderSuggestion(profileResponse.data.latestSuggestion);

  const metricResumeStatus = document.getElementById("metricResumeStatus");
  if (metricResumeStatus) {
    const has = !!profileResponse.data.latestResume;
    metricResumeStatus.textContent = has ? "Uploaded ✓" : "Pending";
    if (has) metricResumeStatus.style.color = "var(--green)";
  }
};

// ─── Scroll Reveal ────────────────────────
const initAnimations = () => {
  const revealItems = document.querySelectorAll(".reveal, .reveal-children");
  if (!revealItems.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );

  revealItems.forEach((item) => observer.observe(item));
};

// ─── Stats Counter ────────────────────────
const initCounters = () => {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = parseInt(entry.target.dataset.count, 10);
          const suffix = entry.target.dataset.suffix || (target > 10 ? "+" : "");
          let start = 0;
          const step = target / 60;
          const interval = setInterval(() => {
            start = Math.min(start + step, target);
            entry.target.textContent = Math.floor(start) + suffix;
            if (start >= target) clearInterval(interval);
          }, 20);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  counters.forEach((el) => observer.observe(el));
};

// ─── Auth Page ────────────────────────────
const initAuthPage = () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  if (state.token) {
    window.location.href = "dashboard.html";
    return;
  }

  // Tab switching
  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".segment").forEach((s) => s.classList.remove("active"));
      button.classList.add("active");
      const isRegister = button.dataset.tab === "register";
      registerForm.classList.toggle("hidden", !isRegister);
      loginForm.classList.toggle("hidden", isRegister);
    });
  });

  // Eye toggles
  document.querySelectorAll(".input-eye-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      btn.style.opacity = input.type === "password" ? "1" : "0.5";
    });
  });

  // Password strength
  const passwordInput = document.getElementById("reg-password");
  const strengthBar = document.getElementById("strengthBar");
  if (passwordInput && strengthBar) {
    passwordInput.addEventListener("input", () => {
      const val = passwordInput.value;
      strengthBar.className = "password-strength-bar";
      if (val.length === 0) {
        strengthBar.style.width = "0%";
      } else if (val.length < 6) {
        strengthBar.classList.add("strength-weak");
      } else if (val.length < 10 || !/[0-9!@#$%]/.test(val)) {
        strengthBar.classList.add("strength-medium");
      } else {
        strengthBar.classList.add("strength-strong");
      }
    });
  }

  // Register
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const btn = document.getElementById("registerBtn");
    try {
      setLoading(btn, true, "Creating account...");
      const payload = Object.fromEntries(new FormData(registerForm).entries());
      const response = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      persistSession(response.data);
      showToast("Account created! Welcome aboard 🎉");
      window.setTimeout(() => { window.location.href = "dashboard.html"; }, 400);
    } catch (error) {
      showToast(error.message, true);
      setLoading(btn, false);
    }
  });

  // Login
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const btn = document.getElementById("loginBtn");
    try {
      setLoading(btn, true, "Signing in...");
      const payload = Object.fromEntries(new FormData(loginForm).entries());
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      persistSession(response.data);
      showToast("Welcome back ✦");
      window.setTimeout(() => { window.location.href = "dashboard.html"; }, 400);
    } catch (error) {
      showToast(error.message, true);
      setLoading(btn, false);
    }
  });
};

// ─── Dashboard Page ───────────────────────
const initDashboardPage = () => {
  const profileForm = document.getElementById("profileForm");
  if (!profileForm) return;

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const btn = document.getElementById("saveProfileBtn");
    try {
      setLoading(btn, true, "Saving...");
      const payload = {
        name: profileForm.name.value.trim(),
        skills: profileForm.skills.value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        education: profileForm.education.value.trim(),
        experience: profileForm.experience.value.trim()
      };

      if (!payload.skills.length) throw new Error("Please add at least one skill");

      const response = await apiRequest("/api/profile/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      renderUser(response.data);
      showToast("Profile updated ✓");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setLoading(btn, false);
    }
  });
};

// ─── Analysis Page ────────────────────────
const initAnalysisPage = () => {
  const resumeForm = document.getElementById("resumeForm");
  const runAnalysisButton = document.getElementById("runAnalysisButton");
  const dropZone = document.getElementById("uploadDropZone");
  const fileInput = document.getElementById("resumeFileInput");
  const fileChosenBadge = document.getElementById("fileChosenBadge");
  const fileChosenName = document.getElementById("fileChosenName");

  // Click on drop zone opens file picker
  if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") fileInput.click();
    });

    // Drag & drop
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-over");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        showFileChosen(file.name);
      } else {
        showToast("Please drop a PDF file", true);
      }
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (file) showFileChosen(file.name);
    });
  }

  const showFileChosen = (name) => {
    if (fileChosenBadge && fileChosenName) {
      fileChosenName.textContent = name;
      fileChosenBadge.classList.remove("hidden");
    }
  };

  // Upload
  if (resumeForm) {
    resumeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const btn = document.getElementById("uploadResumeBtn");
      try {
        const file = resumeForm.resume.files[0];
        if (!file) throw new Error("Please choose a PDF resume");
        if (file.type !== "application/pdf") throw new Error("Only PDF files are allowed");

        setLoading(btn, true, "Uploading...");
        const formData = new FormData();
        formData.append("resume", file);

        const response = await apiRequest("/api/resume/upload", {
          method: "POST",
          body: formData
        });

        renderResume(response.data);
        resumeForm.reset();
        if (fileChosenBadge) fileChosenBadge.classList.add("hidden");
        showToast("Resume uploaded ✓");
      } catch (error) {
        showToast(error.message, true);
      } finally {
        setLoading(btn, false);
      }
    });
  }

  // Run analysis
  if (runAnalysisButton) {
    runAnalysisButton.addEventListener("click", async () => {
      try {
        setLoading(runAnalysisButton, true, "Analyzing...");
        showSkeletons();
        startProgress();

        const response = await apiRequest("/api/ai/analyze", { method: "POST" });

        finishProgress();
        renderSuggestion(response.data);
        showToast("AI analysis complete ✓");
      } catch (error) {
        finishProgress();
        showToast(error.message, true);
      } finally {
        setLoading(runAnalysisButton, false);
      }
    });
  }
};

// ─── Chat Page ────────────────────────────
const getChatFallbackResponse = async (message) => {
  const response = await apiRequest("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message })
  });
  return response.data.answer || "";
};

const initChatPage = () => {
  const chatForm = document.getElementById("chatForm");
  const clearChatBtn = document.getElementById("clearChatBtn");
  const coachStatus = document.getElementById("coachStatus");

  if (!chatForm) return;

  // Initial greeting
  if (!document.getElementById("chatMessages").children.length) {
    appendChatMessage(
      "assistant",
      "Hi! I'm your AI career coach. Ask me about role transitions, interview prep, resume positioning, salary negotiation, or the fastest skills to learn next."
    );
  }

  // Prompt chips
  document.querySelectorAll(".prompt-chip").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById("chatInput");
      if (input) {
        input.value = button.dataset.prompt;
        input.focus();
      }
    });
  });

  // Clear chat
  if (clearChatBtn) {
    clearChatBtn.addEventListener("click", () => {
      const chatMessages = document.getElementById("chatMessages");
      if (chatMessages) {
        chatMessages.innerHTML = "";
        appendChatMessage("assistant", "Chat cleared! What would you like to discuss?");
      }
    });
  }

  // Submit
  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    let outgoingMessage = "";

    try {
      const submitButton = document.getElementById("chatSubmitBtn");
      const message = chatForm.message.value.trim();
      outgoingMessage = message;

      if (!message) throw new Error("Please enter a message");

      appendChatMessage("user", message);
      chatForm.reset();
      setLoading(submitButton, true, "...");
      if (coachStatus) coachStatus.textContent = "Thinking...";

      showTypingIndicator();

      const response = await fetch(`${API_BASE}/api/ai/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.token}`
        },
        body: JSON.stringify({ message })
      });

      hideTypingIndicator();

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Unable to stream AI response");
      }

      const assistantBubble = appendChatMessage("assistant", "");
      state.activeAssistantBubble = assistantBubble;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const [eventLine, dataLine] = event.split("\n");
          const eventName = eventLine?.replace("event: ", "").trim();
          const payload = JSON.parse(dataLine?.replace("data: ", "") || "{}");

          if (eventName === "token") {
            assistantBubble.textContent += payload.token || "";
            const chatMessages = document.getElementById("chatMessages");
            if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
          }

          if (eventName === "error") {
            throw new Error(payload.message || "Streaming request failed");
          }
        }
      }

      if (!assistantBubble.textContent.trim()) {
        const fallbackAnswer = await getChatFallbackResponse(message);
        assistantBubble.innerHTML = renderMarkdown(fallbackAnswer || "No response returned.");
      } else {
        assistantBubble.innerHTML = renderMarkdown(assistantBubble.textContent);
      }

    } catch (error) {
      hideTypingIndicator();
      try {
        const fallbackAnswer = await getChatFallbackResponse(outgoingMessage);
        if (state.activeAssistantBubble && !state.activeAssistantBubble.textContent.trim()) {
          state.activeAssistantBubble.innerHTML = renderMarkdown(fallbackAnswer || error.message);
        } else {
          appendChatMessage("assistant", fallbackAnswer || error.message);
        }
      } catch {
        if (state.activeAssistantBubble && !state.activeAssistantBubble.textContent.trim()) {
          state.activeAssistantBubble.innerHTML = renderMarkdown(error.message);
        } else {
          appendChatMessage("assistant", error.message);
        }
      }
      showToast(error.message, true);
    } finally {
      const submitButton = document.getElementById("chatSubmitBtn");
      setLoading(submitButton, false);
      if (coachStatus) coachStatus.textContent = "AI Ready";
      state.activeAssistantBubble = null;
    }
  });
};

// ─── AI Constellation Background ──────────
const initBgCanvas = () => {
  let canvas = document.getElementById("bg-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "bg-canvas";
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const particles = [];
  const maxParticles = Math.min(45, Math.floor((width * height) / 32000)); // Optimal count for elegant density

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      // Slow, relaxing drift speeds
      this.vx = (Math.random() - 0.5) * 0.16;
      this.vy = (Math.random() - 0.5) * 0.16;
      this.type = Math.random() > 0.45 ? "star" : "circle";
      this.size = Math.random() * 8 + 4; // size in pixels
      this.alpha = Math.random() * 0.25 + 0.15; // starting opacity
      this.pulseSpeed = Math.random() * 0.008 + 0.003;
      this.pulseDir = Math.random() > 0.5 ? 1 : -1;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Wrap around edges smoothly
      if (this.x < -20) this.x = width + 20;
      if (this.x > width + 20) this.x = -20;
      if (this.y < -20) this.y = height + 20;
      if (this.y > height + 20) this.y = -20;

      // Twinkle / Shimmer effect by pulsing alpha
      this.alpha += this.pulseSpeed * this.pulseDir;
      if (this.alpha > 0.45 || this.alpha < 0.1) {
        this.pulseDir *= -1;
      }
    }

    draw() {
      ctx.save();
      if (this.type === "star") {
        // Draw shimmering 4-pointed Apple Pro star (✦ shape)
        const outer = this.size;
        const color = `rgba(113, 113, 122, ${this.alpha})`;
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - outer);
        ctx.quadraticCurveTo(this.x, this.y, this.x + outer, this.y);
        ctx.quadraticCurveTo(this.x, this.y, this.x, this.y + outer);
        ctx.quadraticCurveTo(this.x, this.y, this.x - outer, this.y);
        ctx.quadraticCurveTo(this.x, this.y, this.x, this.y - outer);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        // Draw soft, glowing floating circular halo
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(113, 113, 122, ${this.alpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Faint central core dot
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(9, 9, 11, ${this.alpha})`;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  const setup = () => {
    particles.length = 0;
    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }
  };

  const animate = () => {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.update();
      p.draw();
    });

    requestAnimationFrame(animate);
  };

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    setup();
  });

  setup();
  animate();
};

// ─── Bootstrap ────────────────────────────
const bootstrap = async () => {
  initBgCanvas(); // Start floating dynamic neural network background
  initAnimations();
  initCounters();
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
      window.setTimeout(() => redirectToAuth(), 300);
      return;
    }
  }

  if (page === "dashboard") initDashboardPage();
  if (page === "analysis") initAnalysisPage();
  if (page === "chat") initChatPage();
};

bootstrap();
