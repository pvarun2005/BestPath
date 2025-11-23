// Configuration utility for Sudo.dev Gemini API
import dotenv from 'dotenv'
dotenv.config()

export interface SudoConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

export function getSudoConfig(): SudoConfig {
  const apiKey = process.env.SUDO_API_KEY || '';
  const apiUrl = process.env.GEMINI_API_URL || 'https://sudoapp.dev/api/v1/chat/completions';
  
  // For hackathon demo, use mock data if no API key is provided
  if (!apiKey || apiKey === 'your_sudo_api_key_here') {
    console.log('📝 Using mock Gemini responses for demo');
    return {
      apiKey: 'demo-key',
      apiUrl: 'mock',
      model: 'gemini-2.0-flash'
    };
  }
  
  return {
    apiKey,
    apiUrl,
    model: 'gemini-2.0-flash'
  };
}

export function isMockMode(): boolean {
  const config = getSudoConfig();
  return config.apiUrl === 'mock' || config.apiKey === 'demo-key';
}