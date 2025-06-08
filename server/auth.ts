import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import type { Express, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import type { User } from '@shared/schema';

// Configure session store
export function setupSession(app: Express) {
  const PgSession = connectPg(session);
  
  app.use(session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'demo-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));
}

// Initialize Passport
export function setupAuth(app: Express) {
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await storage.upsertUser({
          id: `google_${profile.id}`,
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName || profile.username || 'Unknown',
          profileImage: profile.photos?.[0]?.value || null,
          provider: 'google',
          providerId: profile.id,
          role: 'user',
          lastLoginAt: new Date(),
        });
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // Amazon OAuth Strategy (using OAuth2 generic strategy)
  if (process.env.AMAZON_CLIENT_ID && process.env.AMAZON_CLIENT_SECRET) {
    passport.use('amazon', new OAuth2Strategy({
      authorizationURL: 'https://www.amazon.com/ap/oa',
      tokenURL: 'https://api.amazon.com/auth/o2/token',
      clientID: process.env.AMAZON_CLIENT_ID,
      clientSecret: process.env.AMAZON_CLIENT_SECRET,
      callbackURL: "/auth/amazon/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Fetch user profile from Amazon
        const response = await fetch('https://api.amazon.com/user/profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const amazonProfile = await response.json();
        
        const user = await storage.upsertUser({
          id: `amazon_${amazonProfile.user_id}`,
          email: amazonProfile.email || '',
          name: amazonProfile.name || 'Amazon User',
          profileImage: null,
          provider: 'amazon',
          providerId: amazonProfile.user_id,
          role: 'user',
          lastLoginAt: new Date(),
        });
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // Serialize/deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

// Auth middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user as User)?.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Admin access required' });
}

// Auth routes
export function setupAuthRoutes(app: Express) {
  // Google OAuth routes
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/');
    }
  );

  // Amazon OAuth routes
  app.get('/auth/amazon', passport.authenticate('amazon', { scope: ['profile'] }));
  app.get('/auth/amazon/callback',
    passport.authenticate('amazon', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/');
    }
  );

  // Logout route
  app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  // Current user route
  app.get('/auth/user', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });
}