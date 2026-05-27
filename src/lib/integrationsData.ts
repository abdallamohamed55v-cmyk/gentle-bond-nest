// Curated integration list (connected via Composio).
// Limited to the providers the team officially supports.

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  app: string;
}

export const INTEGRATION_CATEGORIES = [
  "All",
  "Communication",
  "Productivity",
  "Development",
  "Storage & Files",
  "Design",
  "Social",
  "Analytics",
] as const;

export const integrations: Integration[] = [
  // Communication
  { id: "gmail", name: "Gmail", description: "Send, read and manage emails", category: "Communication", app: "gmail" },
  { id: "outlook", name: "Outlook", description: "Microsoft email and calendar", category: "Communication", app: "outlook" },
  { id: "slack", name: "Slack", description: "Team messaging and channels", category: "Communication", app: "slack" },
  { id: "discord", name: "Discord", description: "Community servers and messaging", category: "Communication", app: "discord" },
  { id: "microsoftteams", name: "Microsoft Teams", description: "Team collaboration and meetings", category: "Communication", app: "microsoftteams" },
  { id: "whatsapp", name: "WhatsApp", description: "Customer messaging at scale", category: "Communication", app: "whatsapp" },

  // Productivity
  { id: "notion", name: "Notion", description: "Notes, docs, and wikis", category: "Productivity", app: "notion" },
  { id: "googlecalendar", name: "Google Calendar", description: "Events and scheduling", category: "Productivity", app: "googlecalendar" },
  { id: "googledocs", name: "Google Docs", description: "Collaborative documents", category: "Productivity", app: "googledocs" },
  { id: "googlesheets", name: "Google Sheets", description: "Online spreadsheets", category: "Productivity", app: "googlesheets" },

  // Development
  { id: "github", name: "GitHub", description: "Code hosting and collaboration", category: "Development", app: "github" },
  { id: "gitlab", name: "GitLab", description: "DevOps platform", category: "Development", app: "gitlab" },
  { id: "linear", name: "Linear", description: "Issue tracking for teams", category: "Development", app: "linear" },
  { id: "vercel", name: "Vercel", description: "Frontend deployment", category: "Development", app: "vercel" },
  { id: "supabase", name: "Supabase", description: "Backend as a service", category: "Development", app: "supabase" },
  { id: "firecrawl", name: "Firecrawl", description: "AI-powered web scraping & crawling", category: "Development", app: "firecrawl" },

  // Storage & Files
  { id: "googledrive", name: "Google Drive", description: "Cloud file storage", category: "Storage & Files", app: "googledrive" },

  // Design
  { id: "figma", name: "Figma", description: "Design and prototyping", category: "Design", app: "figma" },
  { id: "canva", name: "Canva", description: "Graphic design platform", category: "Design", app: "canva" },

  // Social
  { id: "linkedin", name: "LinkedIn", description: "Professional networking", category: "Social", app: "linkedin" },
  { id: "facebook", name: "Facebook", description: "Pages and posts", category: "Social", app: "facebook" },
  { id: "instagram", name: "Instagram", description: "Photos, reels and stories", category: "Social", app: "instagram" },
  { id: "youtube", name: "YouTube", description: "Video uploads & analytics", category: "Social", app: "youtube" },
  { id: "reddit", name: "Reddit", description: "Community discussions", category: "Social", app: "reddit" },

  // Analytics & Maps
  { id: "googleanalytics", name: "Google Analytics", description: "Web analytics", category: "Analytics", app: "googleanalytics" },
  { id: "googlemaps", name: "Google Maps", description: "Maps, geocoding & places", category: "Analytics", app: "googlemaps" },
];
