import {
  users,
  projects,
  categories,
  likes,
  comments,
  feedback,
  siteVisits,
  profanityWords,
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
  type SiteVisit,
  type InsertSiteVisit,
  type ProfanityWord,
  type InsertProfanityWord,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql, and, isNull, or, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByNickname(nickname: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, data: { nickname?: string; profileImageUrl?: string }): Promise<User | undefined>;
  
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
  searchProjects(query: string, options?: {
    limit?: number;
    offset?: number;
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
  updateFeedback(id: number, data: { content: string; category: string }, userId: string): Promise<FeedbackWithAuthor | null>;
  deleteFeedback(id: number, userId: string): Promise<boolean>;
  
  // Site visits operations
  recordVisit(visit: InsertSiteVisit): Promise<SiteVisit>;
  getTodayVisits(): Promise<number>;
  
  // Get categories with project counts
  getCategoriesWithCounts(): Promise<(Category & { projectCount: number })[]>;
  
  // Profanity operations
  getProfanityWords(): Promise<ProfanityWord[]>;
  addProfanityWord(word: InsertProfanityWord): Promise<ProfanityWord>;
  isProfane(text: string): Promise<boolean>;
  
  // Stats
  getStats(): Promise<{
    totalProjects: number;
    totalUsers: number;
    todayVisits: number;
    totalLikes: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByNickname(nickname: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.nickname, nickname));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
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

  async updateUserProfile(id: string, data: { nickname?: string; profileImageUrl?: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        ...data, 
        hasSetNickname: data.nickname ? true : undefined,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
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

  async getCategoriesWithCounts(): Promise<(Category & { projectCount: number })[]> {
    const result = await db
      .select({
        category: categories,
        projectCount: sql<number>`CAST(COUNT(${projects.id}) AS INTEGER)`,
      })
      .from(categories)
      .leftJoin(projects, and(eq(categories.id, projects.categoryId), eq(projects.isActive, true)))
      .groupBy(categories.id)
      .orderBy(asc(categories.name));

    return result.map(({ category, projectCount }) => ({
      ...category,
      projectCount: projectCount || 0,
    }));
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

  async searchProjects(query: string, options: {
    limit?: number;
    offset?: number;
    userId?: string;
  } = {}): Promise<ProjectWithDetails[]> {
    const { limit = 20, offset = 0, userId } = options;
    
    const searchQuery = `%${query}%`;
    
    const results = await db
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
          or(
            ilike(projects.title, searchQuery),
            ilike(projects.description, searchQuery)
          )
        )
      )
      .orderBy(desc(projects.likeCount), desc(projects.createdAt))
      .limit(limit)
      .offset(offset);
    
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
      .orderBy(desc(comments.createdAt));

    // Separate root comments and replies
    const rootComments: CommentWithAuthor[] = [];
    const replies: CommentWithAuthor[] = [];

    allComments.forEach(({ comment, author }) => {
      const commentWithAuthor: CommentWithAuthor = {
        ...comment,
        author: author!,
        replies: [],
      };

      if (comment.parentId) {
        replies.push(commentWithAuthor);
      } else {
        rootComments.push(commentWithAuthor);
      }
    });

    // Group replies with their parent comments
    replies.forEach(reply => {
      const parent = rootComments.find(comment => comment.id === reply.parentId);
      if (parent) {
        parent.replies!.push(reply);
      }
    });

    // Sort replies within each comment by createdAt descending
    rootComments.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
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
      .orderBy(desc(feedback.updatedAt));

    return results.map(({ feedback: fb, author }) => ({
      ...fb,
      author: author!,
    }));
  }

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db.insert(feedback).values(feedbackData).returning();
    return newFeedback;
  }

  async updateFeedback(id: number, data: { content: string; category: string }, userId: string): Promise<FeedbackWithAuthor | null> {
    // Check if the feedback exists and belongs to the user
    const [existingFeedback] = await db
      .select()
      .from(feedback)
      .where(and(eq(feedback.id, id), eq(feedback.authorId, userId), eq(feedback.isActive, true)));

    if (!existingFeedback) {
      return null;
    }

    const [updatedFeedback] = await db
      .update(feedback)
      .set({
        content: data.content,
        category: data.category,
        updatedAt: new Date(),
      })
      .where(eq(feedback.id, id))
      .returning();

    // Get the updated feedback with author info
    const result = await db
      .select({
        feedback: feedback,
        author: users,
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.authorId, users.id))
      .where(eq(feedback.id, id));

    return result.map(({ feedback: fb, author }) => ({
      ...fb,
      author: author!,
    }))[0] || null;
  }

  async deleteFeedback(id: number, userId: string): Promise<boolean> {
    const [existingFeedback] = await db
      .select()
      .from(feedback)
      .where(and(eq(feedback.id, id), eq(feedback.authorId, userId), eq(feedback.isActive, true)));

    if (!existingFeedback) {
      return false;
    }

    await db
      .update(feedback)
      .set({ isActive: false })
      .where(eq(feedback.id, id));

    return true;
  }

  // Site visits operations
  async recordVisit(visitData: InsertSiteVisit): Promise<SiteVisit> {
    // Check if this session already visited today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [existingVisit] = await db
      .select()
      .from(siteVisits)
      .where(
        and(
          eq(siteVisits.sessionId, visitData.sessionId),
          sql`${siteVisits.visitDate} >= ${today.toISOString()}`,
          sql`${siteVisits.visitDate} < ${tomorrow.toISOString()}`
        )
      );

    if (existingVisit) {
      return existingVisit;
    }

    const [newVisit] = await db.insert(siteVisits).values(visitData).returning();
    return newVisit;
  }

  async getTodayVisits(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [result] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${siteVisits.sessionId})::int` })
      .from(siteVisits)
      .where(
        and(
          sql`${siteVisits.visitDate} >= ${today.toISOString()}`,
          sql`${siteVisits.visitDate} < ${tomorrow.toISOString()}`
        )
      );

    return result.count;
  }

  // Stats
  async getStats(): Promise<{
    totalProjects: number;
    totalUsers: number;
    todayVisits: number;
    totalLikes: number;
  }> {
    const [projectStats] = await db
      .select({
        totalProjects: sql<number>`COUNT(*)`,
        totalLikes: sql<number>`SUM(${projects.likeCount})`,
      })
      .from(projects)
      .where(eq(projects.isActive, true));

    const [userStats] = await db
      .select({
        totalUsers: sql<number>`COUNT(*)`,
      })
      .from(users);

    const todayVisits = await this.getTodayVisits();

    return {
      totalProjects: projectStats.totalProjects || 0,
      totalUsers: userStats.totalUsers || 0,
      todayVisits,
      totalLikes: projectStats.totalLikes || 0,
    };
  }

  // Profanity operations
  async getProfanityWords(): Promise<ProfanityWord[]> {
    return await db.select().from(profanityWords).orderBy(asc(profanityWords.word));
  }

  async addProfanityWord(word: InsertProfanityWord): Promise<ProfanityWord> {
    const [newWord] = await db.insert(profanityWords).values(word).returning();
    return newWord;
  }

  async isProfane(text: string): Promise<boolean> {
    const words = await this.getProfanityWords();
    const lowerText = text.toLowerCase();
    
    return words.some(word => {
      const lowerWord = word.word.toLowerCase();
      return lowerText.includes(lowerWord);
    });
  }
}

export const storage = new DatabaseStorage();
