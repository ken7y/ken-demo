import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Recall API
  recallApiKey: process.env.RECALL_API_KEY || '',
  recallRegion: process.env.RECALL_REGION || 'us-east-1',

  // ngrok tunnel domain (used to build webhook URLs for Recall)
  ngrokDomain: process.env.NGROK_DOMAIN || '',

  // Recall webhook signing secret (whsec_... from Recall dashboard)
  webhookSecret: process.env.WEBHOOK_TOKEN || '',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;

// Validate required env vars in production
if (config.nodeEnv === 'production') {
  const required = ['RECALL_API_KEY', 'RECALL_REGION', 'NGROK_DOMAIN'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Warn if webhook verification is disabled
if (!config.webhookSecret) {
  console.warn('⚠️  WEBHOOK_TOKEN not set — webhook signature verification is disabled');
}
