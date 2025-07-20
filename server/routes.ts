import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
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

  const httpServer = createServer(app);
  return httpServer;
}