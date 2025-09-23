import {
  users,
  submissions,
  comments,
  type User,
  type InsertUser,
  type Submission,
  type InsertSubmission,
  type Comment,
  type InsertComment,
  type SubmissionWithUser,
  type SubmissionWithComments,
  type LoginCredentials,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUserByCredentials(credentials: LoginCredentials): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  
  // Submission operations
  createSubmission(submission: InsertSubmission & { userId: string }): Promise<Submission>;
  getSubmissionsByUser(userId: string): Promise<SubmissionWithUser[]>;
  getAllSubmissions(): Promise<SubmissionWithUser[]>;
  getSubmissionById(id: number): Promise<SubmissionWithComments | undefined>;
  updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission>;
  
  // Comment operations
  createComment(comment: InsertComment & { userId: string }): Promise<Comment>;
  getCommentsBySubmission(submissionId: number): Promise<(Comment & { user: User })[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserByCredentials(credentials: LoginCredentials): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.userId, credentials.userId),
          eq(users.password, credentials.password)
        )
      );
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createSubmission(submission: InsertSubmission & { userId: string }): Promise<Submission> {
    const [newSubmission] = await db
      .insert(submissions)
      .values(submission)
      .returning();
    return newSubmission;
  }

  async getSubmissionsByUser(userId: string): Promise<SubmissionWithUser[]> {
    const result = await db
      .select()
      .from(submissions)
      .leftJoin(users, eq(submissions.userId, users.id))
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.createdAt));
    
    return result.map(row => ({
      ...row.submissions,
      user: row.users!,
    }));
  }

  async getAllSubmissions(): Promise<SubmissionWithUser[]> {
    const result = await db
      .select()
      .from(submissions)
      .leftJoin(users, eq(submissions.userId, users.id))
      .orderBy(desc(submissions.createdAt));
    
    return result.map(row => ({
      ...row.submissions,
      user: row.users!,
    }));
  }

  async getSubmissionById(id: number): Promise<SubmissionWithComments | undefined> {
    const [submission] = await db
      .select()
      .from(submissions)
      .leftJoin(users, eq(submissions.userId, users.id))
      .where(eq(submissions.id, id));

    if (!submission) return undefined;

    const submissionComments = await db
      .select()
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.submissionId, id))
      .orderBy(desc(comments.createdAt));

    return {
      ...submission.submissions,
      user: submission.users!,
      comments: submissionComments.map(c => ({
        ...c.comments,
        user: c.users!,
      })),
    } as SubmissionWithComments;
  }

  async updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission> {
    const [updated] = await db
      .update(submissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(submissions.id, id))
      .returning();
    return updated;
  }

  async createComment(comment: InsertComment & { userId: string }): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getCommentsBySubmission(submissionId: number): Promise<(Comment & { user: User })[]> {
    const result = await db
      .select()
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.submissionId, submissionId))
      .orderBy(desc(comments.createdAt));

    return result.map(r => ({
      ...r.comments,
      user: r.users!,
    }));
  }
}

export const storage = new DatabaseStorage();
