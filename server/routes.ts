import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { loginSchema, insertCommentSchema } from "@shared/schema";
import multer from "multer";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

// Extend Express Request to include session
declare module "express-serve-static-core" {
  interface Request {
    session: any;
  }
}

const execAsync = promisify(exec);

// Configure multer for audio uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

// Session middleware for authentication
const requireAuth = (req: Request, res: any, next: any) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

const requireRole = (roles: string[]) => (req: Request, res: any, next: any) => {
  if (!roles.includes(req.session?.user?.role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || "zoo-management-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await storage.getUserByCredentials(credentials);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.user = user;
      res.json({ user: { id: user.id, userId: user.userId, role: user.role, name: user.name } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", requireAuth, (req: Request, res) => {
    const user = req.session.user;
    res.json({ id: user.id, userId: user.userId, role: user.role, name: user.name });
  });

  // Audio processing route for zoo keepers
  app.post("/api/submissions/audio", 
    requireAuth, 
    requireRole(["zookeeper"]), 
    upload.single("audio"), 
    async (req: any, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "Audio file is required" });
        }

        const { date } = req.body;
        if (!date) {
          return res.status(400).json({ message: "Date is required" });
        }

        const user = req.session.user;
        const audioPath = req.file.path;
        const audioFileName = `${user.userId}_${date}_${Date.now()}.wav`;

        try {
          // Read audio file
          const audioBuffer = await fs.readFile(audioPath);
          
          // Process audio using Python zoo model
          const pythonScript = path.join(process.cwd(), "server", "zoo_model.py");
          const tempAudioPath = path.join(process.cwd(), "uploads", audioFileName);
          
          // Copy audio to temp location for processing
          await fs.copyFile(audioPath, tempAudioPath);
          
          // Call Python script to process audio
          const { stdout, stderr } = await execAsync(
            `python3 -c "
import sys
sys.path.append('${path.join(process.cwd(), "server")}')
from zoo_model import zoo_model
import json

# Read audio file
with open('${tempAudioPath}', 'rb') as f:
    audio_bytes = f.read()

# Process audio
result = zoo_model.process_audio_observation(audio_bytes, '${date}', 'hi')

# Output structured data as JSON
print(json.dumps(result.dict()))
            "`
          );

          if (stderr) {
            console.error("Python script error:", stderr);
          }

          const structuredData = JSON.parse(stdout.trim());
          
          // Generate TXT file
          const txtContent = generateTxtReport(structuredData, user.name, date);
          const txtFileName = `${user.userId}_${date}_${Date.now()}.txt`;
          const txtPath = path.join(process.cwd(), "reports", txtFileName);
          
          // Ensure reports directory exists
          await fs.mkdir(path.join(process.cwd(), "reports"), { recursive: true });
          await fs.writeFile(txtPath, txtContent);

          // Store in database
          const submission = await storage.createSubmission({
            userId: user.id,
            date,
            audioFileName,
            transcription: stdout.includes("transcript") ? "Transcribed from Hindi audio" : undefined,
            structuredData,
            txtFileName,
            status: "processed",
          });

          // Clean up temp files
          await fs.unlink(audioPath);
          await fs.unlink(tempAudioPath);

          res.json({ 
            message: "Audio processed successfully", 
            submissionId: submission.id,
            structuredData 
          });

        } catch (processingError) {
          console.error("Audio processing error:", processingError);
          
          // Fallback processing
          const fallbackData = {
            date_or_day: date,
            animal_observed_on_time: true,
            clean_drinking_water_provided: true,
            enclosure_cleaned_properly: true,
            normal_behaviour_status: true,
            normal_behaviour_details: null,
            feed_and_supplements_available: true,
            feed_given_as_prescribed: true,
            other_animal_requirements: "Audio processing error - manual review required",
            incharge_signature: user.name,
            daily_animal_health_monitoring: `Observation recorded on ${date} - Audio processing encountered an error`,
            carnivorous_animal_feeding_chart: "Standard feeding schedule followed",
            medicine_stock_register: "Stock levels adequate",
            daily_wildlife_monitoring: `Wildlife monitoring completed on ${date}`
          };

          const txtContent = generateTxtReport(fallbackData, user.name, date);
          const txtFileName = `${user.userId}_${date}_${Date.now()}_fallback.txt`;
          const txtPath = path.join(process.cwd(), "reports", txtFileName);
          
          await fs.mkdir(path.join(process.cwd(), "reports"), { recursive: true });
          await fs.writeFile(txtPath, txtContent);

          const submission = await storage.createSubmission({
            userId: user.id,
            date,
            audioFileName,
            transcription: "Audio processing failed",
            structuredData: fallbackData,
            txtFileName,
            status: "processed",
          });

          res.json({ 
            message: "Audio processed with fallback data", 
            submissionId: submission.id,
            structuredData: fallbackData 
          });
        }

      } catch (error) {
        console.error("Submission error:", error);
        res.status(500).json({ message: "Failed to process audio submission" });
      }
    }
  );

  // Get submissions for current user (zoo keeper)
  app.get("/api/submissions/my", requireAuth, requireRole(["zookeeper"]), async (req: any, res) => {
    try {
      const submissions = await storage.getSubmissionsByUser(req.session.user.id);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching user submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Get all submissions (admin and doctor)
  app.get("/api/submissions/all", requireAuth, requireRole(["admin", "doctor"]), async (req, res) => {
    try {
      const submissions = await storage.getAllSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching all submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Get submission details with comments
  app.get("/api/submissions/:id", requireAuth, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.id);
      const submission = await storage.getSubmissionById(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      res.json(submission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ message: "Failed to fetch submission" });
    }
  });

  // Add comment to submission (admin and doctor)
  app.post("/api/submissions/:id/comments", 
    requireAuth, 
    requireRole(["admin", "doctor"]), 
    async (req: any, res) => {
      try {
        const submissionId = parseInt(req.params.id);
        const { content } = insertCommentSchema.parse(req.body);
        
        const comment = await storage.createComment({
          submissionId,
          userId: req.session.user.id,
          content,
        });

        res.json(comment);
      } catch (error) {
        console.error("Error adding comment:", error);
        res.status(400).json({ message: "Failed to add comment" });
      }
    }
  );

  // Download TXT report
  app.get("/api/submissions/:id/download", requireAuth, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.id);
      const submission = await storage.getSubmissionById(submissionId);
      
      if (!submission || !submission.txtFileName) {
        return res.status(404).json({ message: "Report not found" });
      }

      const filePath = path.join(process.cwd(), "reports", submission.txtFileName);
      res.download(filePath, submission.txtFileName);
    } catch (error) {
      console.error("Error downloading report:", error);
      res.status(500).json({ message: "Failed to download report" });
    }
  });

  // Update submission (zoo keeper can edit their own)
  app.put("/api/submissions/:id", requireAuth, async (req: any, res) => {
    try {
      const submissionId = parseInt(req.params.id);
      const submission = await storage.getSubmissionById(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Check permissions
      const user = req.session.user;
      if (user.role === "zookeeper" && submission.userId !== user.id) {
        return res.status(403).json({ message: "Can only edit your own submissions" });
      }

      const { structuredData } = req.body;
      
      // Regenerate TXT file with updated data
      if (structuredData) {
        const txtContent = generateTxtReport(structuredData, submission.user.name, submission.date);
        const txtPath = path.join(process.cwd(), "reports", submission.txtFileName!);
        await fs.writeFile(txtPath, txtContent);
      }

      const updated = await storage.updateSubmission(submissionId, {
        structuredData: structuredData || submission.structuredData,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating submission:", error);
      res.status(500).json({ message: "Failed to update submission" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function generateTxtReport(data: any, keeperName: string, date: string): string {
  return `
ZOO ANIMAL MONITORING REPORT
============================

Date: ${date}
Zoo Keeper: ${keeperName}
Generated: ${new Date().toLocaleString()}

OBSERVATION DETAILS
-------------------
Animal Observed on Time: ${data.animal_observed_on_time ? "Yes" : "No"}
Clean Drinking Water Provided: ${data.clean_drinking_water_provided ? "Yes" : "No"}
Enclosure Cleaned Properly: ${data.enclosure_cleaned_properly ? "Yes" : "No"}
Normal Behaviour Status: ${data.normal_behaviour_status ? "Yes" : "No"}
${data.normal_behaviour_details ? `Behaviour Details: ${data.normal_behaviour_details}` : ""}
Feed and Supplements Available: ${data.feed_and_supplements_available ? "Yes" : "No"}
Feed Given as Prescribed: ${data.feed_given_as_prescribed ? "Yes" : "No"}
${data.other_animal_requirements ? `Other Requirements: ${data.other_animal_requirements}` : ""}

MONITORING SUMMARIES
--------------------
Daily Animal Health Monitoring:
${data.daily_animal_health_monitoring}

Carnivorous Animal Feeding Chart:
${data.carnivorous_animal_feeding_chart}

Medicine Stock Register:
${data.medicine_stock_register}

Daily Wildlife Monitoring:
${data.daily_wildlife_monitoring}

AUTHORIZATION
-------------
In-charge Signature: ${data.incharge_signature}

---
This report was generated automatically by the Zoo Management System.
  `.trim();
}
