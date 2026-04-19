import { Request, Response, NextFunction } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const USER_POOL_ID = process.env.VITE_COGNITO_USER_POOL_ID ?? "";
const CLIENT_ID = process.env.VITE_COGNITO_CLIENT_ID ?? "";

const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: "id",
  clientId: CLIENT_ID,
});

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const token = authHeader.slice(7);
    const payload = await verifier.verify(token);
    (req as any).user = {
      sub: payload.sub,
      email: payload.email,
      groups: payload["cognito:groups"] ?? [],
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user?.groups?.includes("admin")) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
