import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const PostgresSessionStore = connectPg(session);
  const sessionStore = new PostgresSessionStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "등록되지 않은 이메일입니다" });
          }
          if (!user.password) {
            return done(null, false, { message: "소셜 로그인 계정입니다. 해당 서비스로 로그인해주세요" });
          }
          if (!(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "비밀번호가 올바르지 않습니다" });
          }
          return done(null, user);
        } catch (error) {
          console.error("Login error:", error);
          return done(error);
        }
      }
    )
  );

  // GitHub Strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: "https://7a6b3a00-659c-47ae-a2fe-cba3cfcb9759-00-1mh0t6c0982p8.picard.replit.dev/api/auth/github/callback",
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          console.log("GitHub profile:", profile);
          
          // GitHub에서 받은 사용자 정보
          const githubId = profile.id;
          const email = profile.emails?.[0]?.value;
          const displayName = profile.displayName || profile.username;
          const profileImageUrl = profile.photos?.[0]?.value;

          // 기존 GitHub 계정으로 가입한 사용자 찾기
          let user = await storage.getUserByProviderAndId("github", githubId);
          
          if (user) {
            // 기존 사용자 로그인
            return done(null, user);
          }

          // 같은 이메일로 가입한 사용자가 있는지 확인
          if (email) {
            const existingUser = await storage.getUserByEmail(email);
            if (existingUser) {
              // 기존 계정에 GitHub 연동
              const updatedUser = await storage.linkSocialAccount(existingUser.id, "github", githubId, profileImageUrl);
              return done(null, updatedUser);
            }
          }

          // 새 사용자 생성
          const newUser = await storage.createUser({
            id: `github_${githubId}_${Date.now()}`,
            email: email || null,
            provider: "github",
            providerId: githubId,
            profileImageUrl,
            hasSetNickname: false,
          });

          return done(null, newUser);
        } catch (error) {
          console.error("GitHub OAuth error:", error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint (email + password only)
  app.post("/api/register", async (req, res, next) => {
    try {
      const registerSchema = z.object({
        email: z.string().email("올바른 이메일 주소를 입력해주세요"),
        password: z.string()
          .min(9, "비밀번호는 최소 9자리 이상이어야 합니다")
          .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/, "영문, 숫자, 특수문자를 각각 포함해야 합니다"),
      });

      const { email, password } = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "이미 등록된 이메일입니다" });
      }

      // Create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        password: hashedPassword,
        provider: "local",
        hasSetNickname: false,
      });

      // Login the user
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          profileImageUrl: user.profileImageUrl,
          hasSetNickname: user.hasSetNickname,
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "입력 정보가 올바르지 않습니다",
          errors: error.errors 
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "회원가입 중 오류가 발생했습니다" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login authentication error:", err);
        return res.status(500).json({ message: "로그인 처리 중 오류가 발생했습니다" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "이메일 또는 비밀번호가 올바르지 않습니다" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error("Session login error:", err);
          return res.status(500).json({ message: "로그인 세션 생성 중 오류가 발생했습니다" });
        }
        res.status(200).json({
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          profileImageUrl: user.profileImageUrl,
          hasSetNickname: user.hasSetNickname,
        });
      });
    })(req, res, next);
  });

  // Logout endpoint - support both GET and POST for compatibility
  const logoutHandler = (req: any, res: any, next: any) => {
    req.logout((err: any) => {
      if (err) return next(err);
      req.session.destroy((destroyErr: any) => {
        if (destroyErr) console.error("Session destroy error:", destroyErr);
        res.clearCookie('connect.sid');
        res.sendStatus(200);
      });
    });
  };
  
  app.post("/api/logout", logoutHandler);
  app.get("/api/logout", logoutHandler);

  // GitHub OAuth routes
  app.get("/api/auth/github", passport.authenticate("github", { scope: ["user:email"] }));

  app.get("/api/auth/github/callback", 
    passport.authenticate("github", { failureRedirect: "/auth?error=github_failed" }),
    (req, res) => {
      // GitHub 로그인 성공
      const user = req.user as SelectUser;
      if (!user.hasSetNickname) {
        // 닉네임 설정이 필요한 경우
        res.redirect("/nickname");
      } else {
        // 홈으로 리다이렉트
        res.redirect("/");
      }
    }
  );

  // Login page - redirect to frontend auth page
  app.get("/api/login", (req, res) => {
    res.redirect("/auth");
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.sendStatus(401);
    }
    
    const user = req.user as SelectUser;
    res.json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      profileImageUrl: user.profileImageUrl,
      hasSetNickname: user.hasSetNickname,
    });
  });
}

// Authentication middleware
export function isAuthenticated(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}