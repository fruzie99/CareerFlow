import { useEffect, useMemo, useState } from "react";

import { updateProfileRequest } from "../api/authApi";

const PREDEFINED_INTERESTS = [
  "Artificial Intelligence & Machine Learning",
  "Full Stack Development",
  "Data Science & Analytics",
  "Cybersecurity",
  "UI/UX Design",
  "Product Design",
  "Product Management",
  "Startup & Entrepreneurship",
  "Sustainability & Green Tech",
  "HealthTech / Bioinformatics",
  "AgriTech / Aquaculture Tech",
  "Cloud Computing",
  "Generative AI",
  "Content Creation",
  "Digital Marketing",
  "Photography & Visual Storytelling",
  "Fashion & Lifestyle Blogging",
  "Community Building & Leadership",
];

const HARD_SKILLS = new Set(
  [
    "Python",
    "Java",
    "C++",
    "JavaScript",
    "Data Structures",
    "Algorithms",
    "HTML",
    "CSS",
    "React.js",
    "Node.js",
    "Express.js",
    "SQL",
    "MongoDB",
    "Machine Learning",
    "Artificial Intelligence",
    "Data Analysis",
    "Cloud Computing",
    "REST APIs",
    "Object-Oriented Programming",
    "System Design",
    "Debugging",
    "Testing",
    "Networking Basics",
    "Cybersecurity Basics",
  ].map((item) => item.toLowerCase())
);

const SOFT_SKILLS = new Set(
  [
    "Problem Solving",
    "Communication",
    "Teamwork",
    "Leadership",
    "Time Management",
    "Critical Thinking",
    "Adaptability",
    "Creativity",
    "Presentation Skills",
    "Emotional Intelligence",
    "Decision Making",
    "Conflict Resolution",
    "Active Listening",
    "Negotiation Skills",
    "Interpersonal Skills",
    "Collaboration",
    "Accountability",
    "Self-Motivation",
    "Work Ethic",
    "Stress Management",
    "Patience",
    "Open-mindedness",
    "Attention to Detail",
    "Flexibility",
    "Initiative",
    "Networking Skills",
    "Empathy",
    "Persuasion",
    "Leadership Presence",
    "Public Speaking",
    "Strategic Thinking",
    "Creativity Thinking",
    "Analytical Thinking",
    "Learning Agility",
    "Resilience",
    "Confidence",
    "Adaptability to Change",
    "Cultural Awareness",
    "Mentoring",
  ].map((item) => item.toLowerCase())
);

const TOOL_SKILLS = new Set(
  [
    "AWS",
    "Git",
    "GitHub",
    "Docker",
    "Kubernetes",
    "VS Code",
    "Postman",
    "Figma",
    "Power BI",
    "Tableau",
    "Firebase",
    "Linux",
    "Agile Methodology",
    "Scrum",
    "DevOps",
    "CI/CD",
    "Version Control",
  ].map((item) => item.toLowerCase())
);

const getInterestBuckets = (allInterests = []) => {
  const selectedPredefined = allInterests.filter((interest) => PREDEFINED_INTERESTS.includes(interest));
  const customInterests = allInterests.filter((interest) => !PREDEFINED_INTERESTS.includes(interest));

  return {
    selectedPredefined,
    customInterests,
  };
};

const formatMonth = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const buildFormStateFromUser = (user) => {
  const profile = user?.profile || {};
  const interestBuckets = getInterestBuckets(profile.careerInterests || []);

  return {
    bio: profile.bio || "",
    profileImageUrl: profile.profileImageUrl || "",
    selectedInterests: interestBuckets.selectedPredefined,
    customInterests: interestBuckets.customInterests,
    customInterestInput: "",
    skills: profile.skills?.length ? profile.skills : [],
    customSkillInput: "",
    education: (profile.education || []).map((item) => ({
      degree: item.degree || "",
      institution: item.institution || "",
      fieldOfStudy: item.fieldOfStudy || "",
      gpa: item.gpa || "",
      startDate: formatMonth(item.startDate),
      endDate: formatMonth(item.endDate),
    })),
    experience: (profile.experience || []).map((item) => ({
      title: item.title || "",
      company: item.company || "",
      startDate: formatMonth(item.startDate),
      endDate: formatMonth(item.endDate),
      description: item.description || "",
    })),
    socialLinks: {
      linkedin: profile.socialLinks?.linkedin || "",
      github: profile.socialLinks?.github || "",
      portfolio: profile.socialLinks?.portfolio || "",
      website: profile.socialLinks?.website || "",
    },
  };
};

const groupedSkills = (skills) => {
  const groups = {
    hard: [],
    soft: [],
    tools: [],
  };

  skills.forEach((skill) => {
    const normalizedSkill = skill.toLowerCase().trim();

    if (SOFT_SKILLS.has(normalizedSkill)) {
      groups.soft.push(skill);
      return;
    }

    if (TOOL_SKILLS.has(normalizedSkill)) {
      groups.tools.push(skill);
      return;
    }

    groups.hard.push(skill);
  });

  return groups;
};

function ProfilePage({ currentUser, onUserUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState(() => buildFormStateFromUser(currentUser));
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setFormState(buildFormStateFromUser(currentUser));
  }, [currentUser]);

  const name = currentUser?.fullName || "Alex";
  const headline = formState.bio || "";
  const completion = currentUser?.profile?.profileCompletionScore ?? 75;

  const interestsPreview =
    formState.selectedInterests.length || formState.customInterests.length
      ? [...formState.selectedInterests, ...formState.customInterests].slice(0, 6)
      : [];

  const educationList = formState.education;

  const experienceList = formState.experience;

  const skillGroups = useMemo(() => groupedSkills(formState.skills), [formState.skills]);

  const toggleInterest = (interest) => {
    setFormState((previous) => ({
      ...previous,
      selectedInterests: previous.selectedInterests.includes(interest)
        ? previous.selectedInterests.filter((item) => item !== interest)
        : [...previous.selectedInterests, interest],
    }));
  };

  const addCustomInterest = () => {
    const value = formState.customInterestInput.trim();
    if (!value) {
      return;
    }

    const allInterests = [...formState.selectedInterests, ...formState.customInterests];
    if (allInterests.includes(value)) {
      setFormState((previous) => ({ ...previous, customInterestInput: "" }));
      return;
    }

    setFormState((previous) => ({
      ...previous,
      customInterests: [...previous.customInterests, value],
      customInterestInput: "",
    }));
  };

  const removeCustomInterest = (interest) => {
    setFormState((previous) => ({
      ...previous,
      customInterests: previous.customInterests.filter((item) => item !== interest),
    }));
  };

  const addSkill = () => {
    const value = formState.customSkillInput.trim();
    if (!value || formState.skills.includes(value)) {
      setFormState((previous) => ({ ...previous, customSkillInput: "" }));
      return;
    }

    setFormState((previous) => ({
      ...previous,
      skills: [...previous.skills, value],
      customSkillInput: "",
    }));
  };

  const removeSkill = (skill) => {
    setFormState((previous) => ({
      ...previous,
      skills: previous.skills.filter((item) => item !== skill),
    }));
  };

  const updateEducation = (index, key, value) => {
    setFormState((previous) => ({
      ...previous,
      education: previous.education.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const addEducation = () => {
    setFormState((previous) => ({
      ...previous,
      education: [
        ...previous.education,
        { degree: "", institution: "", fieldOfStudy: "", gpa: "", startDate: "", endDate: "" },
      ],
    }));
  };

  const removeEducation = (index) => {
    setFormState((previous) => ({
      ...previous,
      education: previous.education.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateExperience = (index, key, value) => {
    setFormState((previous) => ({
      ...previous,
      experience: previous.experience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const addExperience = () => {
    setFormState((previous) => ({
      ...previous,
      experience: [...previous.experience, { title: "", company: "", startDate: "", endDate: "", description: "" }],
    }));
  };

  const removeExperience = (index) => {
    setFormState((previous) => ({
      ...previous,
      experience: previous.experience.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const cancelEditing = () => {
    setFormState(buildFormStateFromUser(currentUser));
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditing(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        bio: formState.bio,
        profileImageUrl: formState.profileImageUrl,
        skills: formState.skills,
        careerInterests: [...formState.selectedInterests, ...formState.customInterests],
        education: formState.education,
        experience: formState.experience,
        socialLinks: formState.socialLinks,
      };

      const data = await updateProfileRequest(payload);
      onUserUpdate(data.user);
      setIsEditing(false);
      setSuccessMessage("Profile saved successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Could not save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="profile-page-v2">
      <form onSubmit={handleSubmit}>
        <div className="profile-top-row">
          <article className="profile-summary-card">
            {formState.profileImageUrl ? (
              <img className="profile-avatar" src={formState.profileImageUrl} alt={`${name} profile`} />
            ) : (
              <div className="profile-avatar" aria-hidden="true">
                👤
              </div>
            )}

            <div className="profile-summary-main">
              <h2>{name}</h2>
              {isEditing ? (
                <>
                  <input
                    value={formState.bio}
                    onChange={(event) => setFormState((previous) => ({ ...previous, bio: event.target.value }))}
                    placeholder="Your professional headline"
                  />
                  <input
                    className="profile-avatar-input"
                    value={formState.profileImageUrl}
                    onChange={(event) =>
                      setFormState((previous) => ({ ...previous, profileImageUrl: event.target.value }))
                    }
                    placeholder="Profile image URL"
                  />
                </>
              ) : (
                <p>{headline || ""}</p>
              )}

              <div className="profile-progress-line">
                <div style={{ width: `${completion}%` }} />
              </div>

              <div className="profile-summary-actions">
                <strong>{completion}% Profile Complete</strong>
                <button type="button" className="small-btn">
                  Complete Profile
                </button>
              </div>
            </div>

            <div className="profile-edit-actions">
              {isEditing ? (
                <>
                  <button type="button" className="outline-btn" onClick={cancelEditing}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Saving..." : "Save Profile"}
                  </button>
                </>
              ) : (
                <button type="button" className="submit-btn" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </button>
              )}
            </div>
          </article>

          <article className="profile-side-card milestone-side-card">
            <h3>My Journey Milestone</h3>
            <div className="milestone-mini-list">
              <span className="active">Resume Review</span>
              <span className="active">Mock Interview</span>
              <span>Skill Workshop</span>
            </div>
          </article>
        </div>

        <div className="profile-layout-grid">
          <section className="profile-main-column">
            <article className="profile-block">
              <h3>Education</h3>
              <div className="profile-cards-grid">
                {educationList.length ? educationList.map((item, index) => (
                  <div key={`education-${index}`} className="entry-card">
                    {isEditing ? (
                      <div className="entry-form-grid">
                        <input
                          placeholder="Degree"
                          value={formState.education[index]?.degree || ""}
                          onChange={(event) => updateEducation(index, "degree", event.target.value)}
                        />
                        <input
                          placeholder="Institution"
                          value={formState.education[index]?.institution || ""}
                          onChange={(event) => updateEducation(index, "institution", event.target.value)}
                        />
                        <input
                          placeholder="Field / Status"
                          value={formState.education[index]?.fieldOfStudy || ""}
                          onChange={(event) => updateEducation(index, "fieldOfStudy", event.target.value)}
                        />
                        <input
                          placeholder="GPA"
                          value={formState.education[index]?.gpa || ""}
                          onChange={(event) => updateEducation(index, "gpa", event.target.value)}
                        />
                        <div className="inline-inputs">
                          <input
                            type="month"
                            value={formState.education[index]?.startDate || ""}
                            onChange={(event) => updateEducation(index, "startDate", event.target.value)}
                          />
                          <input
                            type="month"
                            value={formState.education[index]?.endDate || ""}
                            onChange={(event) => updateEducation(index, "endDate", event.target.value)}
                          />
                        </div>
                        <button type="button" className="tiny-btn" onClick={() => removeEducation(index)}>
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <strong>{item.degree}</strong>
                        <p>{item.institution}</p>
                        <small>{item.fieldOfStudy}</small>
                        <small>GPA: {item.gpa || "N/A"}</small>
                      </>
                    )}
                  </div>
                )) : (
                  <div className="entry-card empty-card">
                    <p className="empty-text">No education added yet.</p>
                  </div>
                )}
              </div>

              {isEditing ? (
                <button type="button" className="tiny-btn" onClick={addEducation}>
                  Add Education
                </button>
              ) : null}
            </article>

            <article className="profile-block">
              <h3>Work Experience</h3>
              <div className="profile-cards-grid">
                {experienceList.length ? experienceList.map((item, index) => (
                  <div key={`experience-${index}`} className="entry-card">
                    {isEditing ? (
                      <div className="entry-form-grid">
                        <input
                          placeholder="Role"
                          value={formState.experience[index]?.title || ""}
                          onChange={(event) => updateExperience(index, "title", event.target.value)}
                        />
                        <input
                          placeholder="Company"
                          value={formState.experience[index]?.company || ""}
                          onChange={(event) => updateExperience(index, "company", event.target.value)}
                        />
                        <div className="inline-inputs">
                          <input
                            type="month"
                            value={formState.experience[index]?.startDate || ""}
                            onChange={(event) => updateExperience(index, "startDate", event.target.value)}
                          />
                          <input
                            type="month"
                            value={formState.experience[index]?.endDate || ""}
                            onChange={(event) => updateExperience(index, "endDate", event.target.value)}
                          />
                        </div>
                        <input
                          placeholder="Short description"
                          value={formState.experience[index]?.description || ""}
                          onChange={(event) => updateExperience(index, "description", event.target.value)}
                        />
                        <button type="button" className="tiny-btn" onClick={() => removeExperience(index)}>
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <strong>{item.title}</strong>
                        <p>{item.company}</p>
                        <small>{item.description}</small>
                      </>
                    )}
                  </div>
                )) : (
                  <div className="entry-card empty-card">
                    <p className="empty-text">No work experience added yet.</p>
                  </div>
                )}
              </div>

              {isEditing ? (
                <button type="button" className="tiny-btn" onClick={addExperience}>
                  Add Experience
                </button>
              ) : null}
            </article>

            <article className="profile-block">
              <h3>Skills</h3>
              <div className="skills-columns">
                <div>
                  <h4>Hard Skills</h4>
                  <div className="chip-row">
                    {skillGroups.hard.length ? skillGroups.hard.map((skill) => (
                      <span key={skill} className="interest-chip">
                        {skill}
                      </span>
                    )) : <span className="empty-text">No hard skills yet.</span>}
                  </div>
                </div>
                <div>
                  <h4>Soft Skills</h4>
                  <div className="chip-row">
                    {skillGroups.soft.length ? skillGroups.soft.map((skill) => (
                      <span key={skill} className="interest-chip">
                        {skill}
                      </span>
                    )) : <span className="empty-text">No soft skills yet.</span>}
                  </div>
                </div>
                <div>
                  <h4>Tools</h4>
                  <div className="chip-row">
                    {skillGroups.tools.length ? skillGroups.tools.map((skill) => (
                      <span key={skill} className="interest-chip">
                        {skill}
                      </span>
                    )) : <span className="empty-text">No tools added yet.</span>}
                  </div>
                </div>
              </div>

              {isEditing ? (
                <>
                  <div className="custom-interest-row">
                    <input
                      type="text"
                      value={formState.customSkillInput}
                      onChange={(event) =>
                        setFormState((previous) => ({ ...previous, customSkillInput: event.target.value }))
                      }
                      placeholder="Add skill"
                    />
                    <button type="button" className="small-btn" onClick={addSkill}>
                      Add
                    </button>
                  </div>
                  <div className="chip-row">
                    {formState.skills.map((skill) => (
                      <button type="button" key={skill} className="interest-chip" onClick={() => removeSkill(skill)}>
                        {skill} ×
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </article>
          </section>

          <aside className="profile-side-column">
            <article className="profile-side-card">
              <h3>My Career Interests</h3>
              <div className="chip-row">
                {interestsPreview.length ? interestsPreview.map((interest) => (
                  <span key={interest} className="interest-chip">
                    {interest}
                  </span>
                )) : <span className="empty-text">No interests selected yet.</span>}
              </div>

              {isEditing ? (
                <>
                  <div className="interest-grid compact-grid">
                    {PREDEFINED_INTERESTS.map((interest) => (
                      <label key={interest} className="interest-option">
                        <input
                          type="checkbox"
                          checked={formState.selectedInterests.includes(interest)}
                          onChange={() => toggleInterest(interest)}
                        />
                        <span>{interest}</span>
                      </label>
                    ))}
                  </div>

                  <div className="custom-interest-row">
                    <input
                      type="text"
                      value={formState.customInterestInput}
                      onChange={(event) =>
                        setFormState((previous) => ({ ...previous, customInterestInput: event.target.value }))
                      }
                      placeholder="Add custom interest"
                    />
                    <button type="button" className="small-btn" onClick={addCustomInterest}>
                      Add
                    </button>
                  </div>

                  <div className="chip-row">
                    {formState.customInterests.map((interest) => (
                      <button
                        type="button"
                        key={interest}
                        className="interest-chip"
                        onClick={() => removeCustomInterest(interest)}
                      >
                        {interest} ×
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </article>

            <article className="profile-side-card">
              <h3>Social & Portfolio Links</h3>
              {isEditing ? (
                <div className="entry-form-grid">
                  <input
                    type="url"
                    value={formState.socialLinks.linkedin}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        socialLinks: { ...previous.socialLinks, linkedin: event.target.value },
                      }))
                    }
                    placeholder="LinkedIn URL"
                  />
                  <input
                    type="url"
                    value={formState.socialLinks.github}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        socialLinks: { ...previous.socialLinks, github: event.target.value },
                      }))
                    }
                    placeholder="GitHub URL"
                  />
                  <input
                    type="url"
                    value={formState.socialLinks.portfolio}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        socialLinks: { ...previous.socialLinks, portfolio: event.target.value },
                      }))
                    }
                    placeholder="Portfolio URL"
                  />
                  <input
                    type="url"
                    value={formState.socialLinks.website}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        socialLinks: { ...previous.socialLinks, website: event.target.value },
                      }))
                    }
                    placeholder="Website URL"
                  />
                </div>
              ) : (
                <div className="social-links-list">
                  {formState.socialLinks.linkedin ? (
                    <a href={formState.socialLinks.linkedin} target="_blank" rel="noreferrer">
                      LinkedIn
                    </a>
                  ) : (
                    <span className="social-link-disabled">LinkedIn</span>
                  )}
                  {formState.socialLinks.github ? (
                    <a href={formState.socialLinks.github} target="_blank" rel="noreferrer">
                      GitHub
                    </a>
                  ) : (
                    <span className="social-link-disabled">GitHub</span>
                  )}
                  {formState.socialLinks.portfolio ? (
                    <a href={formState.socialLinks.portfolio} target="_blank" rel="noreferrer">
                      Portfolio
                    </a>
                  ) : (
                    <span className="social-link-disabled">Portfolio</span>
                  )}
                  {formState.socialLinks.website ? (
                    <a href={formState.socialLinks.website} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  ) : (
                    <span className="social-link-disabled">Website</span>
                  )}
                </div>
              )}
            </article>
          </aside>
        </div>

        {successMessage ? <p className="message success">{successMessage}</p> : null}
        {errorMessage ? <p className="message error">{errorMessage}</p> : null}
      </form>
    </section>
  );
}

export default ProfilePage;
