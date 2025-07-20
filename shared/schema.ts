import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories for projects
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  content: text("content"),
  imageUrl: varchar("image_url"),
  videoUrl: varchar("video_url"),
  demoUrl: varchar("demo_url"),
  contactInfo: varchar("contact_info"),
  categoryId: integer("category_id").references(() => categories.id),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  viewCount: integer("view_count").default(0),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Likes table
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  authorId: varchar("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  parentId: integer("parent_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feedback table
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'bug', 'feature', 'other'
  authorId: varchar("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  likes: many(likes),
  comments: many(comments),
  feedback: many(feedback),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  projects: many(projects),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  author: one(users, {
    fields: [projects.authorId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [projects.categoryId],
    references: [categories.id],
  }),
  likes: many(likes),
  comments: many(comments),
}));

export const likeRelations = relations(likes, ({ one }) => ({
  project: one(projects, {
    fields: [likes.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}));

export const commentRelations = relations(comments, ({ one, many }) => ({
  project: one(projects, {
    fields: [comments.projectId],
    references: [projects.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "comment_parent",
  }),
  replies: many(comments, {
    relationName: "comment_parent",
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  author: one(users, {
    fields: [feedback.authorId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  viewCount: true,
  likeCount: true,
  commentCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  isActive: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectWithDetails = Project & {
  author: User;
  category: Category | null;
  isLiked?: boolean;
};
export type Comment = typeof comments.$inferSelect;
export type CommentWithAuthor = Comment & {
  author: User;
  replies?: CommentWithAuthor[];
};
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type FeedbackWithAuthor = Feedback & {
  author: User;
};
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
