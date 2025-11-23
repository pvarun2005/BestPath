import axios from 'axios';

export interface SpoonOSConfig {
  geminiApiKey: string;
  geminiApiUrl: string;
  model?: string;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  success: boolean;
  content?: string;
  error?: string;
  reasoning?: string;
}

export class SpoonOSAgent {
  private config: SpoonOSConfig;
  private conversationHistory: AgentMessage[] = [];

  constructor(config: SpoonOSConfig) {
    this.config = {
      model: 'gemini-pro',
      ...config
    };
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<AgentResponse> {
    try {
      const messages: AgentMessage[] = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      
      messages.push(...this.conversationHistory);
      messages.push({ role: 'user', content: message });

      const response = await axios.post(
        this.config.geminiApiUrl,
        {
          model: this.config.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.geminiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const assistantMessage = response.data.choices[0]?.message?.content;
      
      if (assistantMessage) {
        this.conversationHistory.push({ role: 'user', content: message });
        this.conversationHistory.push({ role: 'assistant', content: assistantMessage });
        
        // Keep conversation history manageable
        if (this.conversationHistory.length > 10) {
          this.conversationHistory = this.conversationHistory.slice(-10);
        }

        return {
          success: true,
          content: assistantMessage,
          reasoning: this.extractReasoning(assistantMessage)
        };
      }

      return {
        success: false,
        error: 'No response from Gemini API'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private extractReasoning(content: string): string {
    // Extract reasoning if present in the response
    const reasoningMatch = content.match(/<reasoning>(.*?)<\/reasoning>/s);
    return reasoningMatch ? reasoningMatch[1].trim() : '';
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): AgentMessage[] {
    return [...this.conversationHistory];
  }
}