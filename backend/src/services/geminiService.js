/**
 * Gemini AI Service
 *
 * Wraps the Google Generative AI SDK and exposes helpers
 * for career-coaching tasks (chat, career paths, resume feedback, fit scoring).
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

let _genAI = null;
let _model = null;

const SYSTEM_INSTRUCTION = `You are CareerFlow AI Coach – a world-class career counselor and HR expert.

Guidelines:
• Be encouraging but honest.
• Keep answers concise (max ~400 words) unless the user asks for detail.
• When you list items, use numbered or bulleted lists.
• When you recommend courses or resources, explain *why* in one sentence.
• Never make up statistics – say "estimated" when uncertain.
• If you don't have enough information to answer, ask a follow-up question.`;

function getModel() {
  if (_model) return _model;
  const key = process.env.GEMINI_KEY;
  if (!key) throw new Error("GEMINI_KEY is not set in environment variables");
  _genAI = new GoogleGenerativeAI(key);
  _model = _genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
  });
  return _model;
}

/* ─────────── helpers ─────────── */

function buildProfileContext(user) {
  const p = user.profile || {};
  const edu = (p.education || [])
    .map((e) => [e.degree, e.fieldOfStudy, e.institution].filter(Boolean).join(", "))
    .join("; ");
  const exp = (p.experience || [])
    .map((e) => [e.title, e.company, e.description].filter(Boolean).join(" – "))
    .join("; ");

  return [
    `Name: ${user.fullName}`,
    p.bio ? `Bio: ${p.bio}` : null,
    p.location ? `Location: ${p.location}` : null,
    p.skills?.length ? `Skills: ${p.skills.join(", ")}` : null,
    p.careerInterests?.length ? `Career Interests: ${p.careerInterests.join(", ")}` : null,
    edu ? `Education: ${edu}` : null,
    exp ? `Experience: ${exp}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ─────────── public API ─────────── */

/**
 * General chat – send a user message with optional context.
 * `history` is an array of { role: "user"|"model", parts: [{ text }] }.
 */
async function chat(userMessage, profileContext, history = []) {
  const model = getModel();
  const chatSession = model.startChat({ history });

  const prompt = profileContext
    ? `[User Profile]\n${profileContext}\n\n[User Message]\n${userMessage}`
    : userMessage;

  const result = await chatSession.sendMessage(prompt);
  return result.response.text();
}

/**
 * Generate personalised career path recommendations.
 * Returns parsed JSON with three paths.
 */
async function generateCareerPaths(user) {
  const model = getModel();
  const profileCtx = buildProfileContext(user);

  const prompt = `[User Profile]
${profileCtx}

Analyze this person's profile and generate exactly 3 personalized career path recommendations.

Return ONLY a valid JSON object (no markdown, no code fences) with this structure:
{
  "paths": [
    {
      "title": "Role title (e.g. Data Analyst)",
      "fitScore": <number 0-100>,
      "salaryRange": "₹X,XX,000 – ₹Y,YY,000",
      "description": "1-2 sentence description of the role and why it fits",
      "skillsToLearn": ["skill1", "skill2", "skill3"],
      "recommendedCourse": {
        "name": "Course or certification name",
        "reason": "One sentence why"
      },
      "steps": ["Step 1 description", "Step 2 description", "Step 3 description", "Step 4 description"]
    }
  ]
}

Tailor fit scores honestly based on the user's current skills and experience.
If the profile is sparse, base recommendations on their career interests and suggest foundational paths.`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  // Strip potential markdown code fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Analyze a resume PDF buffer and return structured feedback.
 */
async function analyzeResume(pdfBuffer, profileContext) {
  const model = getModel();

  const parts = [
    {
      inlineData: {
        data: pdfBuffer.toString("base64"),
        mimeType: "application/pdf",
      },
    },
  ];

  const prompt = profileContext
    ? `[User Profile]\n${profileContext}\n\nAnalyze this resume for ATS compatibility. Provide:\n1. An overall score (0-100)\n2. Three specific strengths\n3. Three specific improvements\n4. Keyword suggestions for their target roles\n\nReturn ONLY valid JSON (no markdown fences):\n{ "score": <number>, "strengths": ["..."], "improvements": ["..."], "keywords": ["..."] }`
    : `Analyze this resume for ATS compatibility. Provide:\n1. An overall score (0-100)\n2. Three specific strengths\n3. Three specific improvements\n4. Keyword suggestions\n\nReturn ONLY valid JSON (no markdown fences):\n{ "score": <number>, "strengths": ["..."], "improvements": ["..."], "keywords": ["..."] }`;

  parts.push(prompt);

  const result = await model.generateContent(parts);
  const raw = result.response.text().trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Score a user against a specific job description.
 */
async function fitScore(user, jobDescription) {
  const model = getModel();
  const profileCtx = buildProfileContext(user);

  const prompt = `[User Profile]
${profileCtx}

[Job Description]
${jobDescription}

Analyze this user's fit for the job described above.

Return ONLY valid JSON (no markdown fences):
{
  "score": <number 0-100>,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "reason": "2-3 sentence explanation",
  "tips": ["tip 1", "tip 2", "tip 3"]
}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Generate a branching career path visualization for a goal role. 
 */
async function generateCareerPathTree(user, goalRole) {
  const model = getModel();
  const profileCtx = buildProfileContext(user);

  const prompt = `[User Profile]
${profileCtx}

The user wants to become a "${goalRole}".

Generate a career trajectory from their current position to "${goalRole}".
Include 4-6 steps, each representing a role on the path.

Return ONLY valid JSON (no markdown fences):
{
  "goalRole": "${goalRole}",
  "nodes": [
    {
      "step": 1,
      "role": "Current / Entry role",
      "avgSalary": "₹X,XX,000 – ₹Y,YY,000",
      "yearsInRole": "1-2 years",
      "keySkills": ["skill1", "skill2"],
      "certifications": ["cert1 (optional)"],
      "responsibilities": ["responsibility1", "responsibility2"]
    }
  ],
  "estimatedTotalYears": "X-Y years",
  "advice": "1-2 sentence personalized advice"
}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

module.exports = {
  chat,
  generateCareerPaths,
  analyzeResume,
  fitScore,
  generateCareerPathTree,
  buildProfileContext,
};
