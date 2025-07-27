import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertUserSchema, 
  insertProjectSchema, 
  insertCommentSchema, 
  insertFeedbackSchema,
  insertCategorySchema
} from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Set up authentication
  setupAuth(app);

  // Visitor tracking middleware
  app.use(async (req, res, next) => {
    try {
      // Only track visits to main pages, not API calls or assets
      if (!req.path.startsWith('/api') && 
          !req.path.startsWith('/uploads') && 
          !req.path.includes('.') && // Skip static files
          req.method === 'GET') {
        
        const sessionId = req.sessionID || req.ip; // Use session ID or IP as fallback
        const userAgent = req.get('User-Agent') || '';
        const ipAddress = req.ip || req.connection.remoteAddress || '';

        await storage.recordVisit({
          sessionId,
          userAgent,
          ipAddress,
          visitDate: new Date()
        });
      }
    } catch (error) {
      console.error('Error tracking visit:', error);
    }
    next();
  });

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure multer for file uploads
  const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage_multer,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'));
      }
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(uploadsDir));

  // Initialize categories route
  app.post('/api/categories/init', async (req, res) => {
    try {
      const defaultCategories = [
        { name: "웹 개발", slug: "web-dev", description: "웹사이트 및 웹 애플리케이션" },
        { name: "모바일 앱", slug: "mobile-app", description: "iOS, Android 앱" },
        { name: "AI/ML", slug: "ai-ml", description: "인공지능 및 머신러닝" },
        { name: "게임", slug: "game", description: "게임 개발" },
        { name: "디자인", slug: "design", description: "UI/UX 디자인" },
        { name: "도구", slug: "tools", description: "개발 도구 및 유틸리티" },
        { name: "기타", slug: "others", description: "기타 프로젝트" }
      ];

      const createdCategories = [];
      for (const category of defaultCategories) {
        try {
          const newCategory = await storage.createCategory(category);
          createdCategories.push(newCategory);
        } catch (error) {
          console.log(`Category "${category.name}" might already exist`);
        }
      }

      res.json({ 
        message: "Categories initialized", 
        created: createdCategories.length,
        categories: createdCategories 
      });
    } catch (error) {
      console.error("Error initializing categories:", error);
      res.status(500).json({ message: "Failed to initialize categories" });
    }
  });

  // Categories
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Stats endpoint
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Projects
  app.get('/api/projects', async (req, res) => {
    try {
      const { 
        categoryId, 
        page = '1', 
        limit = '20', 
        timeframe = 'all' 
      } = req.query;
      
      const userId = req.user?.id;
      
      const options = {
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
        timeframe: timeframe as 'today' | 'weekly' | 'monthly' | 'all',
        userId,
      };

      const projects = await storage.getProjects(options);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Search projects
  app.get('/api/projects/search', async (req, res) => {
    try {
      const { 
        q: query, 
        page = '1', 
        limit = '20' 
      } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const userId = req.user?.id;
      
      const options = {
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
        userId,
      };

      const projects = await storage.searchProjects(query, options);
      res.json(projects);
    } catch (error) {
      console.error("Error searching projects:", error);
      res.status(500).json({ message: "Failed to search projects" });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Increment view count
      await storage.incrementViewCount(projectId);
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      console.log('Creating project - User:', req.user);
      console.log('Creating project - Body:', req.body);
      
      const userId = req.user.id;
      const projectData = insertProjectSchema.parse({
        ...req.body,
        authorId: userId,
      });

      console.log('Parsed project data:', projectData);
      const project = await storage.createProject(projectData);
      console.log('Created project:', project);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Check if user owns the project
      const existingProject = await storage.getProject(projectId);
      if (!existingProject || existingProject.authorId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const projectData = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(projectId, projectData);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(updatedProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Check if user owns the project
      const existingProject = await storage.getProject(projectId);
      if (!existingProject || existingProject.authorId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const deleted = await storage.deleteProject(projectId);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Likes
  app.post('/api/projects/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const result = await storage.toggleLike(projectId, userId);
      res.json(result);
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  // Comments
  app.get('/api/projects/:id/comments', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const comments = await storage.getComments(projectId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/projects/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const commentData = insertCommentSchema.parse({
        ...req.body,
        projectId,
        authorId: userId,
      });

      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.put('/api/comments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const { content } = req.body;
      
      const comment = await storage.updateComment(commentId, content);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  app.delete('/api/comments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.id);
      
      const success = await storage.deleteComment(commentId);
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Feedback
  app.get('/api/feedback', async (req, res) => {
    try {
      const feedback = await storage.getFeedback();
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const feedbackData = insertFeedbackSchema.parse({
        ...req.body,
        authorId: userId,
      });

      const feedback = await storage.createFeedback(feedbackData);
      res.status(201).json(feedback);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid feedback data", errors: error.errors });
      }
      console.error("Error creating feedback:", error);
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  app.put('/api/feedback/:id', isAuthenticated, async (req: any, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const userId = req.user.id;
      const { content, category } = req.body;
      
      const feedback = await storage.updateFeedback(feedbackId, { content, category }, userId);
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found or unauthorized" });
      }
      
      res.json(feedback);
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  app.delete('/api/feedback/:id', isAuthenticated, async (req: any, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const success = await storage.deleteFeedback(feedbackId, userId);
      if (!success) {
        return res.status(404).json({ message: "Feedback not found or unauthorized" });
      }
      
      res.json({ message: "Feedback deleted successfully" });
    } catch (error) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ message: "Failed to delete feedback" });
    }
  });

  // Visit tracking
  app.post('/api/visit', async (req, res) => {
    try {
      const visit = await storage.recordVisit(req.body);
      res.status(201).json(visit);
    } catch (error) {
      console.error("Error recording visit:", error);
      res.status(500).json({ message: "Failed to record visit" });
    }
  });

  // Check email availability endpoint
  app.post("/api/user/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "이메일을 입력해주세요" });
      }

      // Validate email format
      const emailSchema = z.string().email();
      try {
        emailSchema.parse(email);
      } catch {
        return res.status(400).json({ message: "올바른 이메일 형식이 아닙니다" });
      }

      // Check if email is already taken
      const existingUser = await storage.getUserByEmail(email);
      const available = !existingUser;

      res.json({ 
        available,
        message: available ? "사용 가능한 이메일입니다" : "이미 사용 중인 이메일입니다"
      });
    } catch (error) {
      console.error("Email check error:", error);
      res.status(500).json({ message: "이메일 확인 중 오류가 발생했습니다" });
    }
  });

  // Stats
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Profanity words API
  app.get('/api/profanity', async (req, res) => {
    try {
      const words = await storage.getProfanityWords();
      res.json(words.map(w => w.word)); // Only return the words, not the full object
    } catch (error) {
      console.error("Error fetching profanity words:", error);
      res.status(500).json({ message: "Failed to fetch profanity words" });
    }
  });

  app.post('/api/profanity/init', async (req, res) => {
    try {
      const defaultProfanityWords = [
        // 일반적인 욕설
        { word: "바보", severity: 1, category: "mild" },
        { word: "멍청이", severity: 1, category: "mild" },
        { word: "병신", severity: 2, category: "offensive" },
        { word: "또라이", severity: 2, category: "offensive" },
        { word: "미친", severity: 2, category: "offensive" },
        { word: "씨발", severity: 3, category: "severe" },
        { word: "개새끼", severity: 3, category: "severe" },
        { word: "좆", severity: 3, category: "sexual" },
        { word: "섹스", severity: 2, category: "sexual" },
        { word: "sex", severity: 2, category: "sexual" },
        { word: "fuck", severity: 3, category: "severe" },
        { word: "shit", severity: 2, category: "offensive" },
        { word: "bitch", severity: 3, category: "severe" },
        // 관리자/시스템 관련
        { word: "admin", severity: 1, category: "system" },
        { word: "administrator", severity: 1, category: "system" },
        { word: "관리자", severity: 1, category: "system" },
        { word: "운영자", severity: 1, category: "system" },
        { word: "null", severity: 1, category: "system" },
        { word: "undefined", severity: 1, category: "system" },
      ];

      const createdWords = [];
      for (const word of defaultProfanityWords) {
        try {
          const newWord = await storage.addProfanityWord(word);
          createdWords.push(newWord);
        } catch (error) {
          console.log(`Word "${word.word}" might already exist`);
        }
      }

      res.json({ 
        message: "Profanity words initialized", 
        created: createdWords.length,
        words: createdWords 
      });
    } catch (error) {
      console.error("Error initializing profanity words:", error);
      res.status(500).json({ message: "Failed to initialize profanity words" });
    }
  });

  // Nickname validation API
  app.post('/api/user/validate-nickname', async (req, res) => {
    try {
      const { nickname } = req.body;
      
      if (!nickname || typeof nickname !== 'string') {
        return res.status(400).json({ message: "닉네임이 필요합니다" });
      }

      // Check basic validation
      if (nickname.length < 2) {
        return res.status(400).json({ message: "닉네임은 최소 2글자 이상이어야 합니다" });
      }
      
      if (nickname.length > 20) {
        return res.status(400).json({ message: "닉네임은 최대 20글자까지 가능합니다" });
      }
      
      if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
        return res.status(400).json({ message: "닉네임은 한글, 영문, 숫자, 언더스코어만 사용 가능합니다" });
      }

      // Check profanity
      const isProfane = await storage.isProfane(nickname);
      if (isProfane) {
        return res.status(400).json({ message: "부적절한 내용이 포함된 닉네임입니다" });
      }

      // Check if nickname already exists
      const existingUser = await storage.getUserByNickname(nickname);
      if (existingUser) {
        return res.status(400).json({ message: "이미 사용 중인 닉네임입니다" });
      }

      res.json({ valid: true, message: "사용 가능한 닉네임입니다" });
    } catch (error) {
      console.error("Error validating nickname:", error);
      res.status(500).json({ message: "닉네임 검증 중 오류가 발생했습니다" });
    }
  });

  // Update user profile API with file upload
  app.put('/api/user/profile', isAuthenticated, upload.single('avatar'), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "인증이 필요합니다" });
      }

      const { nickname } = req.body;
      
      // Validate nickname if provided
      if (nickname) {
        const validation = await validateNickname(nickname, userId);
        if (!validation.valid) {
          return res.status(400).json({ message: validation.message });
        }
      }

      // Handle avatar upload
      let avatarUrl = undefined;
      if (req.file) {
        avatarUrl = `/uploads/${req.file.filename}`;
        
        // Delete old avatar file if exists
        const currentUser = await storage.getUser(userId);
        if (currentUser?.profileImageUrl && currentUser.profileImageUrl.startsWith('/uploads/')) {
          const oldFilePath = path.join(process.cwd(), currentUser.profileImageUrl);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
      }

      const updateData: any = {};
      if (nickname) updateData.nickname = nickname;
      if (avatarUrl) updateData.profileImageUrl = avatarUrl;

      const updatedUser = await storage.updateUserProfile(userId, updateData);

      if (!updatedUser) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "프로필 업데이트 중 오류가 발생했습니다" });
    }
  });

  // Helper function for nickname validation
  async function validateNickname(nickname: string, currentUserId?: string): Promise<{ valid: boolean; message: string }> {
    if (!nickname || typeof nickname !== 'string') {
      return { valid: false, message: "닉네임이 필요합니다" };
    }

    if (nickname.length < 2) {
      return { valid: false, message: "닉네임은 최소 2글자 이상이어야 합니다" };
    }
    
    if (nickname.length > 20) {
      return { valid: false, message: "닉네임은 최대 20글자까지 가능합니다" };
    }
    
    if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
      return { valid: false, message: "닉네임은 한글, 영문, 숫자, 언더스코어만 사용 가능합니다" };
    }

    const isProfane = await storage.isProfane(nickname);
    if (isProfane) {
      return { valid: false, message: "부적절한 내용이 포함된 닉네임입니다" };
    }

    const existingUser = await storage.getUserByNickname(nickname);
    if (existingUser && existingUser.id !== currentUserId) {
      return { valid: false, message: "이미 사용 중인 닉네임입니다" };
    }

    return { valid: true, message: "사용 가능한 닉네임입니다" };
  }

  const httpServer = createServer(app);
  return httpServer;
}