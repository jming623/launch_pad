import {
  users,
  projects,
  categories,
  likes,
  comments,
  feedback,
  type User,
  type UpsertUser,
  type Project,
  type ProjectWithDetails,
  type InsertProject,
  type Category,
  type InsertCategory,
  type Comment,
  type CommentWithAuthor,
  type InsertComment,
  type Feedback,
  type FeedbackWithAuthor,
  type InsertFeedback,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql, and, isNull, or } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Project operations
  getProjects(options?: {
    categoryId?: number;
    limit?: number;
    offset?: number;
    timeframe?: 'today' | 'weekly' | 'monthly' | 'all';
    userId?: string;
  }): Promise<ProjectWithDetails[]>;
  getProject(id: number, userId?: string): Promise<ProjectWithDetails | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  incrementViewCount(id: number): Promise<void>;
  
  // Like operations
  toggleLike(projectId: number, userId: string): Promise<{ liked: boolean; likeCount: number }>;
  isProjectLiked(projectId: number, userId: string): Promise<boolean>;
  
  // Comment operations
  getComments(projectId: number): Promise<CommentWithAuthor[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: number, content: string): Promise<Comment | undefined>;
  deleteComment(id: number): Promise<boolean>;
  
  // Feedback operations
  getFeedback(): Promise<FeedbackWithAuthor[]>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  deleteFeedback(id: number): Promise<boolean>;
  
  // Stats
  getStats(): Promise<{
    totalProjects: number;
    totalUsers: number;
    totalViews: number;
    totalLikes: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Project operations
  async getProjects(options: {
    categoryId?: number;
    limit?: number;
    offset?: number;
    timeframe?: 'today' | 'weekly' | 'monthly' | 'all';
    userId?: string;
  } = {}): Promise<ProjectWithDetails[]> {
    const { categoryId, limit = 20, offset = 0, timeframe = 'all', userId } = options;
    
    let timeCondition = sql`true`;
    
    if (timeframe === 'today') {
      timeCondition = sql`${projects.createdAt} >= CURRENT_DATE`;
    } else if (timeframe === 'weekly') {
      timeCondition = sql`${projects.createdAt} >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (timeframe === 'monthly') {
      timeCondition = sql`${projects.createdAt} >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    const query = db
      .select({
        project: projects,
        author: users,
        category: categories,
        isLiked: userId ? sql<boolean>`EXISTS(SELECT 1 FROM ${likes} WHERE ${likes.projectId} = ${projects.id} AND ${likes.userId} = ${userId})` : sql<boolean>`false`,
      })
      .from(projects)
      .leftJoin(users, eq(projects.authorId, users.id))
      .leftJoin(categories, eq(projects.categoryId, categories.id))
      .where(
        and(
          eq(projects.isActive, true),
          categoryId ? eq(projects.categoryId, categoryId) : sql`true`,
          timeCondition
        )
      )
      .orderBy(desc(projects.likeCount), desc(projects.createdAt))
      .limit(limit)
      .offset(offset);

    const results = await query;
    
    return results.map(({ project, author, category, isLiked }) => ({
      ...project,
      author: author!,
      category,
      isLiked,
    }));
  }

  async getProject(id: number, userId?: string): Promise<ProjectWithDetails | undefined> {
    const [result] = await db
      .select({
        project: projects,
        author: users,
        category: categories,
        isLiked: userId ? sql<boolean>`EXISTS(SELECT 1 FROM ${likes} WHERE ${likes.projectId} = ${projects.id} AND ${likes.userId} = ${userId})` : sql<boolean>`false`,
      })
      .from(projects)
      .leftJoin(users, eq(projects.authorId, users.id))
      .leftJoin(categories, eq(projects.categoryId, categories.id))
      .where(and(eq(projects.id, id), eq(projects.isActive, true)));

    if (!result) return undefined;

    return {
      ...result.project,
      author: result.author!,
      category: result.category,
      isLiked: result.isLiked,
    };
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const [deletedProject] = await db
      .update(projects)
      .set({ isActive: false })
      .where(eq(projects.id, id))
      .returning();
    return !!deletedProject;
  }

  async incrementViewCount(id: number): Promise<void> {
    await db
      .update(projects)
      .set({ viewCount: sql`${projects.viewCount} + 1` })
      .where(eq(projects.id, id));
  }

  // Like operations
  async toggleLike(projectId: number, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const existingLike = await db
      .select()
      .from(likes)
      .where(and(eq(likes.projectId, projectId), eq(likes.userId, userId)));

    if (existingLike.length > 0) {
      // Unlike
      await db
        .delete(likes)
        .where(and(eq(likes.projectId, projectId), eq(likes.userId, userId)));
      
      await db
        .update(projects)
        .set({ likeCount: sql`${projects.likeCount} - 1` })
        .where(eq(projects.id, projectId));
      
      const [project] = await db
        .select({ likeCount: projects.likeCount })
        .from(projects)
        .where(eq(projects.id, projectId));
      
      return { liked: false, likeCount: project.likeCount || 0 };
    } else {
      // Like
      await db.insert(likes).values({ projectId, userId });
      
      await db
        .update(projects)
        .set({ likeCount: sql`${projects.likeCount} + 1` })
        .where(eq(projects.id, projectId));
      
      const [project] = await db
        .select({ likeCount: projects.likeCount })
        .from(projects)
        .where(eq(projects.id, projectId));
      
      return { liked: true, likeCount: project.likeCount || 0 };
    }
  }

  async isProjectLiked(projectId: number, userId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.projectId, projectId), eq(likes.userId, userId)));
    return !!like;
  }

  // Comment operations
  async getComments(projectId: number): Promise<CommentWithAuthor[]> {
    const allComments = await db
      .select({
        comment: comments,
        author: users,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(and(eq(comments.projectId, projectId), eq(comments.isActive, true)))
      .orderBy(asc(comments.createdAt));

    // Group comments by parent
    const commentsMap = new Map<number, CommentWithAuthor>();
    const rootComments: CommentWithAuthor[] = [];

    allComments.forEach(({ comment, author }) => {
      const commentWithAuthor: CommentWithAuthor = {
        ...comment,
        author: author!,
        replies: [],
      };

      commentsMap.set(comment.id, commentWithAuthor);

      if (comment.parentId) {
        const parent = commentsMap.get(comment.parentId);
        if (parent) {
          parent.replies!.push(commentWithAuthor);
        }
      } else {
        rootComments.push(commentWithAuthor);
      }
    });

    return rootComments;
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    
    // Update comment count
    await db
      .update(projects)
      .set({ commentCount: sql`${projects.commentCount} + 1` })
      .where(eq(projects.id, comment.projectId));
    
    return newComment;
  }

  async updateComment(id: number, content: string): Promise<Comment | undefined> {
    const [updatedComment] = await db
      .update(comments)
      .set({ content, updatedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return updatedComment;
  }

  async deleteComment(id: number): Promise<boolean> {
    const [deletedComment] = await db
      .update(comments)
      .set({ isActive: false })
      .where(eq(comments.id, id))
      .returning();
    return !!deletedComment;
  }

  // Feedback operations
  async getFeedback(): Promise<FeedbackWithAuthor[]> {
    const results = await db
      .select({
        feedback: feedback,
        author: users,
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.authorId, users.id))
      .where(eq(feedback.isActive, true))
      .orderBy(desc(feedback.createdAt));

    return results.map(({ feedback: fb, author }) => ({
      ...fb,
      author: author!,
    }));
  }

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db.insert(feedback).values(feedbackData).returning();
    return newFeedback;
  }

  async deleteFeedback(id: number): Promise<boolean> {
    const [deletedFeedback] = await db
      .update(feedback)
      .set({ isActive: false })
      .where(eq(feedback.id, id))
      .returning();
    return !!deletedFeedback;
  }

  // Stats
  async getStats(): Promise<{
    totalProjects: number;
    totalUsers: number;
    totalViews: number;
    totalLikes: number;
  }> {
    const [projectStats] = await db
      .select({
        totalProjects: sql<number>`COUNT(*)`,
        totalViews: sql<number>`SUM(${projects.viewCount})`,
        totalLikes: sql<number>`SUM(${projects.likeCount})`,
      })
      .from(projects)
      .where(eq(projects.isActive, true));

    const [userStats] = await db
      .select({
        totalUsers: sql<number>`COUNT(*)`,
      })
      .from(users);

    return {
      totalProjects: projectStats.totalProjects || 0,
      totalUsers: userStats.totalUsers || 0,
      totalViews: projectStats.totalViews || 0,
      totalLikes: projectStats.totalLikes || 0,
    };
  }
}

export const storage = new DatabaseStorage();
