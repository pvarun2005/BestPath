// Configuration utility for Gemini API through sudoapp.dev

export interface GeminiConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

export function getGeminiConfig(): GeminiConfig {
  const apiKey = process.env.GEMINI_API_KEY || '';
  const apiUrl = process.env.GEMINI_API_URL || 'https://api.sudoapp.dev/v1/chat/completions';
  
  // For hackathon demo, use mock data if no API key is provided
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.log('📝 Using mock Gemini responses for demo');
    return {
      apiKey: 'demo-key',
      apiUrl: 'mock',
      model: 'gemini-pro'
    };
  }
  
  return {
    apiKey,
    apiUrl,
    model: 'gemini-pro'
  };
}

export function isMockMode(): boolean {
  const config = getGeminiConfig();
  return config.apiUrl === 'mock' || config.apiKey === 'demo-key';
}