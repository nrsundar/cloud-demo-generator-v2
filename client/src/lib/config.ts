// API base URL — empty string means same-origin (dev or bundled deploy)
// Set VITE_API_URL for split deployments (e.g., Amplify frontend + ECS backend)
export const API_BASE = import.meta.env.VITE_API_URL ?? "";
