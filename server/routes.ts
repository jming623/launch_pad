import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertProjectSchema, insertCommentSchema, insertFeedbackSchema } from "@shared/schema";
import { z } from "zod";

// Visitor tracking middleware
const visitorTrackingMiddleware = async (req: any, res: any, next: any) => {
  try {
    // Generate or get session ID
    let sessionId = req.session?.visitorId;
    if (!sessionId) {
      sessionId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (req.session) {
        req.session.visitorId = sessionId;
      }
    }

    // Record visit
    await storage.recordVisit({
      sessionId,
      userAgent: req.get('User-Agent') || '',
      ipAddress: req.ip || req.connection.remoteAddress || '',
    });
  } catch (error) {
    console.error('Error tracking visitor:', error);
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);
  
  // Add visitor tracking middleware for main routes
  app.use('/', visitorTrackingMiddleware);

  // Current user route is now handled in auth.ts

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
      const userId = req.user.id;
      const projectData = insertProjectSchema.parse({
        ...req.body,
        authorId: userId,
      });

      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
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

      const updateData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(projectId, updateData);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
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

      const success = await storage.deleteProject(projectId);
      if (!success) {
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
      const userId = req.user.id;
      const { content } = req.body;
      
      // TODO: Check if user owns the comment
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
      const userId = req.user.id;
      
      // TODO: Check if user owns the comment
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
  app.get('/api/feedback', isAuthenticated, async (req, res) => {
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
      const feedbackWithAuthor = await storage.getFeedback();
      const newFeedback = feedbackWithAuthor.find(f => f.id === feedback.id);
      
      res.status(201).json(newFeedback);
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
      
      if (!content || content.trim().length < 10) {
        return res.status(400).json({ message: "피드백 내용을 최소 10자 이상 작성해주세요" });
      }

      if (!['bug', 'feature', 'other'].includes(category)) {
        return res.status(400).json({ message: "올바른 카테고리를 선택해주세요" });
      }

      const updatedFeedback = await storage.updateFeedback(feedbackId, { content, category }, userId);
      
      if (!updatedFeedback) {
        return res.status(404).json({ message: "피드백을 찾을 수 없거나 수정 권한이 없습니다" });
      }
      
      res.json(updatedFeedback);
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
        return res.status(404).json({ message: "피드백을 찾을 수 없거나 삭제 권한이 없습니다" });
      }
      
      res.json({ message: "피드백이 성공적으로 삭제되었습니다" });
    } catch (error) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ message: "Failed to delete feedback" });
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
