# Quick Deployment Guide

## Render Deployment (Recommended)

1. **Push to GitHub**: 
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo>
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository
   - Render will auto-detect `render.yaml`
   - Add Firebase environment variables in dashboard

3. **Required Environment Variables**:
   ```
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id  
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   ```

## Firebase Setup

1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Google Authentication
3. Add your Render domain to authorized domains
4. Copy config values to environment variables

## Local Development

```bash
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

Application runs on http://localhost:5000
