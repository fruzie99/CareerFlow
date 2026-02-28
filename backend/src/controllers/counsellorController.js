const User = require("../models/User");

const listCounsellors = async (req, res, next) => {
  try {
    const counsellors = await User.find({ role: "career_counselor", isActive: true })
      .select("fullName email profile.bio profile.profileImageUrl profile.skills profile.careerInterests")
      .lean();

    const sanitized = counsellors.map((c) => ({
      id: c._id.toString(),
      fullName: c.fullName,
      email: c.email,
      bio: c.profile?.bio || "",
      profileImageUrl: c.profile?.profileImageUrl || "",
      skills: c.profile?.skills || [],
      careerInterests: c.profile?.careerInterests || [],
    }));

    return res.status(200).json({ counsellors: sanitized });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listCounsellors };
