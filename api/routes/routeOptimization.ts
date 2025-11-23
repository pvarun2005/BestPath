import express from 'express';
import { RouteOptimizationService } from '../services/RouteOptimizationService';
import { RouteOption } from '../../shared/types';

const router = express.Router();

// Initialize the route optimization service
const routeOptimizationService = new RouteOptimizationService({
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiApiUrl: process.env.GEMINI_API_URL || 'https://api.sudoapp.dev/v1/chat/completions',
  mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || ''
});

/**
 * POST /api/optimize-route
 * Optimizes a route based on natural language input
 * 
 * Body: {
 *   userInput: string
 * }
 */
router.post('/optimize-route', async (req, res) => {
  try {
    const { userInput } = req.body;

    if (!userInput) {
      return res.status(400).json({
        success: false,
        error: 'userInput is required'
      });
    }

    console.log('🚀 Received route optimization request:', userInput);

    const result = await routeOptimizationService.optimizeRoute(userInput);

    if (result.success) {
      console.log('✅ Route optimization successful');
      res.json({
        success: true,
        parsedRequest: result.parsedRequest,
        routes: result.routes
      });
    } else {
      console.error('❌ Route optimization failed:', result.error);
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('💥 Unexpected error in optimize-route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/test-agents
 * Test endpoint to verify agent functionality
 */
router.get('/test-agents', async (req, res) => {
  try {
    const testInput = "I want to go to the gym, get groceries at Costco, and eat at an Indian restaurant. I'm in Santa Clara, CA.";
    
    const result = await routeOptimizationService.optimizeRoute(testInput);
    
    res.json({
      success: true,
      testInput,
      result
    });
  } catch (error) {
    console.error('Test agents error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Route optimization API is healthy',
    timestamp: new Date().toISOString(),
    services: {
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured',
      mapbox: process.env.MAPBOX_ACCESS_TOKEN ? 'configured' : 'not configured'
    }
  });
});

export default router;