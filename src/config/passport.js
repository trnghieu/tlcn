import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User.js";

function safeUsernameFromEmail(email, fallback) {
  const base = (email?.split("@")[0] || fallback || "user").toLowerCase();
  // cắt gọn + gắn hậu tố chống trùng
  return `${base}`.slice(0, 30);
}

async function ensureUniqueUsername(base) {
  let uname = base;
  let i = 0;
  // Thử tối đa vài lần để tránh trùng
  while (await User.findOne({ where: { username: uname } })) {
    i += 1;
    uname = `${base}-${i}`;
  }
  return uname;
}

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || null;

      // 1) Ưu tiên tìm theo google_id
      let user = await User.findOne({ where: { google_id: profile.id } });
      if (user) return done(null, user);

      // 2) Nếu có email, thử tìm user theo email (đã đăng ký thường trước đó)
      if (email) {
        user = await User.findOne({ where: { email } });
        if (user) {
          // Gán google_id cho account sẵn có
          user.google_id = profile.id;
          if (!user.avatar && profile.photos?.[0]?.value) user.avatar = profile.photos[0].value;
          await user.save();
          return done(null, user);
        }
      }

      // 3) Tạo user mới (password = null)
      const baseName = safeUsernameFromEmail(email, profile.id);
      const username = await ensureUniqueUsername(baseName);

      const created = await User.create({
        google_id: profile.id,
        fullName: profile.displayName || username,
        email: email,                  // có thể null nếu Google không trả email (rất hiếm)
        avatar: profile.photos?.[0]?.value,
        username,
        password: null                 // 👈 quan trọng: để null
      });

      return done(null, created);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.userId));
passport.deserializeUser(async (id, done) => {
  const user = await User.findByPk(id);
  done(null, user);
});

export default passport;
