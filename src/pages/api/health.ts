import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Health check endpoint for monitoring
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // You can add more sophisticated health checks here if needed
  // For example, check database connection or other external services
  
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
} 