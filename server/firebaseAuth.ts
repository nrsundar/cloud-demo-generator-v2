import type { Request, Response, NextFunction } from "express";

// Simple Firebase auth middleware that checks for authenticated user
export function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  // For now, allow all requests since we're using client-side Firebase auth
  // In production, you would verify Firebase ID tokens here
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check admin status on client side for now
  // In production, verify Firebase token and check user email
  next();
}