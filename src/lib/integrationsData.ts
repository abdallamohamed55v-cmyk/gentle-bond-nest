// Top 150 most important integrations — connected via Composio (https://composio.dev)
// Each integration maps to a Composio app slug for real OAuth connection.

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
  "CRM & Sales",
  "Marketing",
  "Storage & Files",
  "Design",
  "Support",
  "Finance & Payments",
  "Social",
  "Analytics",
  "AI",
  "E-commerce",
  "HR & Recruiting",
] as const;

export const integrations: Integration[] = [
  // Communication (15)
  { id: "gmail", name: "Gmail", description: "Send, read and manage emails", category: "Communication", app: "gmail" },
  { id: "outlook", name: "Outlook", description: "Microsoft email and calendar", category: "Communication", app: "outlook" },
  { id: "slack", name: "Slack", description: "Team messaging and channels", category: "Communication", app: "slack" },
  { id: "discord", name: "Discord", description: "Community servers and messaging", category: "Communication", app: "discord" },
  { id: "microsoftteams", name: "Microsoft Teams", description: "Team collaboration and meetings", category: "Communication", app: "microsoftteams" },
  { id: "zoom", name: "Zoom", description: "Video conferencing and webinars", category: "Communication", app: "zoom" },
  { id: "googlemeet", name: "Google Meet", description: "Video meetings", category: "Communication", app: "googlemeet" },
  { id: "telegram", name: "Telegram", description: "Messaging and bot automation", category: "Communication", app: "telegram" },
  { id: "whatsapp", name: "WhatsApp Business", description: "Customer messaging at scale", category: "Communication", app: "whatsapp" },
  { id: "twilio", name: "Twilio", description: "SMS, voice, and messaging APIs", category: "Communication", app: "twilio" },
  { id: "sendgrid", name: "SendGrid", description: "Transactional email delivery", category: "Communication", app: "sendgrid" },
  { id: "resend", name: "Resend", description: "Modern email API for developers", category: "Communication", app: "resend" },
  { id: "mailgun", name: "Mailgun", description: "Email API for sending and tracking", category: "Communication", app: "mailgun" },
  { id: "intercom", name: "Intercom", description: "Customer messaging platform", category: "Communication", app: "intercom" },
  { id: "calendly", name: "Calendly", description: "Meeting scheduling", category: "Communication", app: "calendly" },

  // Productivity (18)
  { id: "notion", name: "Notion", description: "Notes, docs, and wikis", category: "Productivity", app: "notion" },
  { id: "googlecalendar", name: "Google Calendar", description: "Events and scheduling", category: "Productivity", app: "googlecalendar" },
  { id: "outlookcalendar", name: "Outlook Calendar", description: "Microsoft calendar", category: "Productivity", app: "outlookcalendar" },
  { id: "googledocs", name: "Google Docs", description: "Collaborative documents", category: "Productivity", app: "googledocs" },
  { id: "googlesheets", name: "Google Sheets", description: "Online spreadsheets", category: "Productivity", app: "googlesheets" },
  { id: "googleforms", name: "Google Forms", description: "Surveys and forms", category: "Productivity", app: "googleforms" },
  { id: "googleslides", name: "Google Slides", description: "Online presentations", category: "Productivity", app: "googleslides" },
  { id: "microsoftword", name: "Microsoft Word", description: "Documents in Microsoft 365", category: "Productivity", app: "microsoftword" },
  { id: "microsoftexcel", name: "Microsoft Excel", description: "Spreadsheets in Microsoft 365", category: "Productivity", app: "microsoftexcel" },
  { id: "onenote", name: "OneNote", description: "Microsoft digital notebook", category: "Productivity", app: "onenote" },
  { id: "evernote", name: "Evernote", description: "Note-taking and organization", category: "Productivity", app: "evernote" },
  { id: "airtable", name: "Airtable", description: "Spreadsheet-database hybrid", category: "Productivity", app: "airtable" },
  { id: "todoist", name: "Todoist", description: "Task management", category: "Productivity", app: "todoist" },
  { id: "clickup", name: "ClickUp", description: "Tasks, docs, goals", category: "Productivity", app: "clickup" },
  { id: "asana", name: "Asana", description: "Work and project management", category: "Productivity", app: "asana" },
  { id: "trello", name: "Trello", description: "Kanban project boards", category: "Productivity", app: "trello" },
  { id: "monday", name: "Monday.com", description: "Work OS for teams", category: "Productivity", app: "monday" },
  { id: "typeform", name: "Typeform", description: "Beautiful forms and surveys", category: "Productivity", app: "typeform" },

  // Development (20)
  { id: "github", name: "GitHub", description: "Code hosting and collaboration", category: "Development", app: "github" },
  { id: "gitlab", name: "GitLab", description: "DevOps platform", category: "Development", app: "gitlab" },
  { id: "bitbucket", name: "Bitbucket", description: "Git code management", category: "Development", app: "bitbucket" },
  { id: "linear", name: "Linear", description: "Issue tracking for teams", category: "Development", app: "linear" },
  { id: "jira", name: "Jira", description: "Agile project management", category: "Development", app: "jira" },
  { id: "confluence", name: "Confluence", description: "Team wiki and knowledge base", category: "Development", app: "confluence" },
  { id: "vercel", name: "Vercel", description: "Frontend deployment", category: "Development", app: "vercel" },
  { id: "netlify", name: "Netlify", description: "Web hosting and deployment", category: "Development", app: "netlify" },
  { id: "heroku", name: "Heroku", description: "Cloud application platform", category: "Development", app: "heroku" },
  { id: "aws", name: "AWS", description: "Amazon Web Services", category: "Development", app: "aws" },
  { id: "gcp", name: "Google Cloud", description: "GCP services", category: "Development", app: "gcp" },
  { id: "azure", name: "Microsoft Azure", description: "Azure cloud services", category: "Development", app: "azure" },
  { id: "digitalocean", name: "DigitalOcean", description: "Cloud infrastructure", category: "Development", app: "digitalocean" },
  { id: "cloudflare", name: "Cloudflare", description: "CDN and edge platform", category: "Development", app: "cloudflare" },
  { id: "sentry", name: "Sentry", description: "Error tracking and monitoring", category: "Development", app: "sentry" },
  { id: "datadog", name: "Datadog", description: "Monitoring and observability", category: "Development", app: "datadog" },
  { id: "supabase", name: "Supabase", description: "Backend as a service", category: "Development", app: "supabase" },
  { id: "firebase", name: "Firebase", description: "Google app platform", category: "Development", app: "firebase" },
  { id: "mongodb", name: "MongoDB Atlas", description: "Cloud document database", category: "Development", app: "mongodb" },
  { id: "postman", name: "Postman", description: "API development platform", category: "Development", app: "postman" },

  // CRM & Sales (12)
  { id: "salesforce", name: "Salesforce", description: "Enterprise CRM", category: "CRM & Sales", app: "salesforce" },
  { id: "hubspot", name: "HubSpot", description: "CRM, marketing & sales", category: "CRM & Sales", app: "hubspot" },
  { id: "pipedrive", name: "Pipedrive", description: "Sales CRM", category: "CRM & Sales", app: "pipedrive" },
  { id: "zoho", name: "Zoho CRM", description: "CRM suite", category: "CRM & Sales", app: "zohocrm" },
  { id: "freshsales", name: "Freshsales", description: "Sales CRM by Freshworks", category: "CRM & Sales", app: "freshsales" },
  { id: "copper", name: "Copper", description: "CRM for Google Workspace", category: "CRM & Sales", app: "copper" },
  { id: "close", name: "Close", description: "Inside sales CRM", category: "CRM & Sales", app: "close" },
  { id: "apollo", name: "Apollo.io", description: "Sales intelligence & prospecting", category: "CRM & Sales", app: "apollo" },
  { id: "outreach", name: "Outreach", description: "Sales engagement platform", category: "CRM & Sales", app: "outreach" },
  { id: "gong", name: "Gong", description: "Revenue intelligence", category: "CRM & Sales", app: "gong" },
  { id: "docusign", name: "DocuSign", description: "Electronic signatures", category: "CRM & Sales", app: "docusign" },
  { id: "pandadoc", name: "PandaDoc", description: "Document automation", category: "CRM & Sales", app: "pandadoc" },

  // Marketing (12)
  { id: "mailchimp", name: "Mailchimp", description: "Email campaigns and automation", category: "Marketing", app: "mailchimp" },
  { id: "klaviyo", name: "Klaviyo", description: "Email & SMS marketing", category: "Marketing", app: "klaviyo" },
  { id: "activecampaign", name: "ActiveCampaign", description: "Marketing automation", category: "Marketing", app: "activecampaign" },
  { id: "convertkit", name: "Kit (ConvertKit)", description: "Creator email marketing", category: "Marketing", app: "convertkit" },
  { id: "marketo", name: "Marketo", description: "B2B marketing automation", category: "Marketing", app: "marketo" },
  { id: "brevo", name: "Brevo", description: "Email, SMS & CRM", category: "Marketing", app: "brevo" },
  { id: "googleads", name: "Google Ads", description: "Search & display advertising", category: "Marketing", app: "googleads" },
  { id: "facebookads", name: "Meta Ads", description: "Facebook & Instagram ads", category: "Marketing", app: "facebookads" },
  { id: "linkedinads", name: "LinkedIn Ads", description: "B2B advertising", category: "Marketing", app: "linkedinads" },
  { id: "tiktokads", name: "TikTok Ads", description: "TikTok advertising", category: "Marketing", app: "tiktokads" },
  { id: "buffer", name: "Buffer", description: "Social media scheduling", category: "Marketing", app: "buffer" },
  { id: "hootsuite", name: "Hootsuite", description: "Social media management", category: "Marketing", app: "hootsuite" },

  // Storage & Files (8)
  { id: "googledrive", name: "Google Drive", description: "Cloud file storage", category: "Storage & Files", app: "googledrive" },
  { id: "dropbox", name: "Dropbox", description: "File sync and sharing", category: "Storage & Files", app: "dropbox" },
  { id: "onedrive", name: "OneDrive", description: "Microsoft cloud storage", category: "Storage & Files", app: "onedrive" },
  { id: "box", name: "Box", description: "Enterprise content management", category: "Storage & Files", app: "box" },
  { id: "s3", name: "AWS S3", description: "Object storage", category: "Storage & Files", app: "s3" },
  { id: "icloud", name: "iCloud Drive", description: "Apple cloud storage", category: "Storage & Files", app: "icloud" },
  { id: "sharepoint", name: "SharePoint", description: "Document collaboration", category: "Storage & Files", app: "sharepoint" },
  { id: "wetransfer", name: "WeTransfer", description: "Large file sharing", category: "Storage & Files", app: "wetransfer" },

  // Design (8)
  { id: "figma", name: "Figma", description: "Design and prototyping", category: "Design", app: "figma" },
  { id: "canva", name: "Canva", description: "Graphic design platform", category: "Design", app: "canva" },
  { id: "adobexd", name: "Adobe XD", description: "UX design", category: "Design", app: "adobexd" },
  { id: "miro", name: "Miro", description: "Online whiteboard", category: "Design", app: "miro" },
  { id: "mural", name: "Mural", description: "Visual collaboration", category: "Design", app: "mural" },
  { id: "framer", name: "Framer", description: "Interactive design tool", category: "Design", app: "framer" },
  { id: "invision", name: "InVision", description: "Design collaboration", category: "Design", app: "invision" },
  { id: "sketch", name: "Sketch", description: "Vector design", category: "Design", app: "sketch" },

  // Support (8)
  { id: "zendesk", name: "Zendesk", description: "Customer support platform", category: "Support", app: "zendesk" },
  { id: "freshdesk", name: "Freshdesk", description: "Helpdesk software", category: "Support", app: "freshdesk" },
  { id: "helpscout", name: "Help Scout", description: "Customer service platform", category: "Support", app: "helpscout" },
  { id: "frontapp", name: "Front", description: "Shared inbox for teams", category: "Support", app: "front" },
  { id: "crisp", name: "Crisp", description: "Live chat and helpdesk", category: "Support", app: "crisp" },
  { id: "tawkto", name: "Tawk.to", description: "Live chat support", category: "Support", app: "tawk" },
  { id: "drift", name: "Drift", description: "Conversational marketing", category: "Support", app: "drift" },
  { id: "livechat", name: "LiveChat", description: "Customer messaging", category: "Support", app: "livechat" },

  // Finance & Payments (12)
  { id: "stripe", name: "Stripe", description: "Online payments", category: "Finance & Payments", app: "stripe" },
  { id: "paypal", name: "PayPal", description: "Online payments", category: "Finance & Payments", app: "paypal" },
  { id: "square", name: "Square", description: "Payments and POS", category: "Finance & Payments", app: "square" },
  { id: "quickbooks", name: "QuickBooks", description: "Accounting software", category: "Finance & Payments", app: "quickbooks" },
  { id: "xero", name: "Xero", description: "Cloud accounting", category: "Finance & Payments", app: "xero" },
  { id: "freshbooks", name: "FreshBooks", description: "Invoicing and accounting", category: "Finance & Payments", app: "freshbooks" },
  { id: "wave", name: "Wave", description: "Free accounting software", category: "Finance & Payments", app: "wave" },
  { id: "plaid", name: "Plaid", description: "Bank account connectivity", category: "Finance & Payments", app: "plaid" },
  { id: "wise", name: "Wise", description: "International transfers", category: "Finance & Payments", app: "wise" },
  { id: "brex", name: "Brex", description: "Corporate cards & expenses", category: "Finance & Payments", app: "brex" },
  { id: "ramp", name: "Ramp", description: "Spend management", category: "Finance & Payments", app: "ramp" },
  { id: "expensify", name: "Expensify", description: "Expense management", category: "Finance & Payments", app: "expensify" },

  // Social (10)
  { id: "twitter", name: "X (Twitter)", description: "Tweets and social posts", category: "Social", app: "twitter" },
  { id: "linkedin", name: "LinkedIn", description: "Professional networking", category: "Social", app: "linkedin" },
  { id: "facebook", name: "Facebook", description: "Pages and posts", category: "Social", app: "facebook" },
  { id: "instagram", name: "Instagram", description: "Photos, reels and stories", category: "Social", app: "instagram" },
  { id: "tiktok", name: "TikTok", description: "Short video platform", category: "Social", app: "tiktok" },
  { id: "youtube", name: "YouTube", description: "Video uploads & analytics", category: "Social", app: "youtube" },
  { id: "pinterest", name: "Pinterest", description: "Visual discovery", category: "Social", app: "pinterest" },
  { id: "reddit", name: "Reddit", description: "Community discussions", category: "Social", app: "reddit" },
  { id: "threads", name: "Threads", description: "Text-based social by Meta", category: "Social", app: "threads" },
  { id: "snapchat", name: "Snapchat", description: "Snaps and stories", category: "Social", app: "snapchat" },

  // Analytics (8)
  { id: "googleanalytics", name: "Google Analytics", description: "Web analytics", category: "Analytics", app: "googleanalytics" },
  { id: "mixpanel", name: "Mixpanel", description: "Product analytics", category: "Analytics", app: "mixpanel" },
  { id: "amplitude", name: "Amplitude", description: "Product analytics", category: "Analytics", app: "amplitude" },
  { id: "posthog", name: "PostHog", description: "Open-source product analytics", category: "Analytics", app: "posthog" },
  { id: "segment", name: "Segment", description: "Customer data platform", category: "Analytics", app: "segment" },
  { id: "hotjar", name: "Hotjar", description: "Heatmaps & user feedback", category: "Analytics", app: "hotjar" },
  { id: "tableau", name: "Tableau", description: "Data visualization", category: "Analytics", app: "tableau" },
  { id: "looker", name: "Looker", description: "Business intelligence", category: "Analytics", app: "looker" },

  // AI (8)
  { id: "openai", name: "OpenAI", description: "GPT models & ChatGPT", category: "AI", app: "openai" },
  { id: "anthropic", name: "Anthropic", description: "Claude models", category: "AI", app: "anthropic" },
  { id: "perplexity", name: "Perplexity", description: "AI-powered search", category: "AI", app: "perplexity" },
  { id: "elevenlabs", name: "ElevenLabs", description: "AI voice generation", category: "AI", app: "elevenlabs" },
  { id: "huggingface", name: "Hugging Face", description: "ML models hub", category: "AI", app: "huggingface" },
  { id: "replicate", name: "Replicate", description: "Run ML models", category: "AI", app: "replicate" },
  { id: "midjourney", name: "Midjourney", description: "AI image generation", category: "AI", app: "midjourney" },
  { id: "runway", name: "Runway", description: "AI video creation", category: "AI", app: "runway" },

  // E-commerce (8)
  { id: "shopify", name: "Shopify", description: "E-commerce platform", category: "E-commerce", app: "shopify" },
  { id: "woocommerce", name: "WooCommerce", description: "WordPress e-commerce", category: "E-commerce", app: "woocommerce" },
  { id: "bigcommerce", name: "BigCommerce", description: "Enterprise e-commerce", category: "E-commerce", app: "bigcommerce" },
  { id: "amazon", name: "Amazon Seller", description: "Amazon marketplace", category: "E-commerce", app: "amazon" },
  { id: "ebay", name: "eBay", description: "Online marketplace", category: "E-commerce", app: "ebay" },
  { id: "etsy", name: "Etsy", description: "Handmade marketplace", category: "E-commerce", app: "etsy" },
  { id: "magento", name: "Magento", description: "Adobe Commerce", category: "E-commerce", app: "magento" },
  { id: "squarespace", name: "Squarespace", description: "Website & store builder", category: "E-commerce", app: "squarespace" },

  // HR & Recruiting (8)
  { id: "workday", name: "Workday", description: "HCM and finance", category: "HR & Recruiting", app: "workday" },
  { id: "bamboohr", name: "BambooHR", description: "HR software", category: "HR & Recruiting", app: "bamboohr" },
  { id: "gusto", name: "Gusto", description: "Payroll and benefits", category: "HR & Recruiting", app: "gusto" },
  { id: "rippling", name: "Rippling", description: "HR, IT & finance platform", category: "HR & Recruiting", app: "rippling" },
  { id: "greenhouse", name: "Greenhouse", description: "Applicant tracking", category: "HR & Recruiting", app: "greenhouse" },
  { id: "lever", name: "Lever", description: "Recruiting CRM", category: "HR & Recruiting", app: "lever" },
  { id: "ashby", name: "Ashby", description: "All-in-one recruiting", category: "HR & Recruiting", app: "ashby" },
  { id: "linkedinrecruiter", name: "LinkedIn Recruiter", description: "Talent sourcing", category: "HR & Recruiting", app: "linkedinrecruiter" },
];
