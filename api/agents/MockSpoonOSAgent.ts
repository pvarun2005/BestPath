import { SpoonOSAgent, AgentResponse } from './SpoonOSAgent';

export class MockSpoonOSAgent extends SpoonOSAgent {
  private mockResponses: Map<string, string> = new Map();

  constructor() {
    super({ geminiApiKey: 'mock', geminiApiUrl: 'mock' });
    this.setupMockResponses();
  }

  private setupMockResponses() {
    // Mock responses for different types of inputs
    this.mockResponses.set('gym', JSON.stringify({
      startingLocation: "Santa Clara, CA",
      tasks: [
        {
          type: "gym",
          description: "Go to a 24/7 fitness gym",
          preferences: [
            {
              type: "chain",
              value: "24 Hour Fitness",
              isMandatory: false,
              description: "Prefer 24/7 fitness gyms"
            }
          ]
        }
      ],
      optimizeFor: "preferences"
    }));

    this.mockResponses.set('costco', JSON.stringify({
      startingLocation: "Santa Clara, CA",
      tasks: [
        {
          type: "groceries",
          description: "Get groceries at Costco",
          preferences: [
            {
              type: "location",
              value: "Costco Fremont",
              isMandatory: true,
              description: "Must go to Costco Fremont"
            }
          ]
        }
      ],
      optimizeFor: "preferences"
    }));

    this.mockResponses.set('indian', JSON.stringify({
      startingLocation: "Santa Clara, CA",
      tasks: [
        {
          type: "restaurant",
          description: "Eat at an Indian restaurant",
          preferences: [
            {
              type: "category",
              value: "Indian",
              isMandatory: false,
              description: "Prefer Indian cuisine"
            }
          ]
        }
      ],
      optimizeFor: "preferences"
    }));
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<AgentResponse> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      // Parse the message to determine what kind of response to return
      const lowerMessage = message.toLowerCase();
      
      let responseData: any = {
        startingLocation: "Santa Clara, CA",
        tasks: [],
        optimizeFor: "preferences"
      };

      // Extract tasks from the message
      if (lowerMessage.includes('gym') || lowerMessage.includes('fitness')) {
        responseData.tasks.push({
          type: "gym",
          description: "Go to the gym",
          preferences: [
            {
              type: "chain",
              value: "24 Hour Fitness",
              isMandatory: false,
              description: "Prefer 24/7 fitness gyms"
            }
          ]
        });
      }

      if (lowerMessage.includes('costco')) {
        responseData.tasks.push({
          type: "groceries",
          description: "Get groceries",
          preferences: [
            {
              type: "location",
              value: "Costco Fremont",
              isMandatory: true,
              description: "Must go to Costco Fremont"
            }
          ]
        });
      } else if (lowerMessage.includes('grocery') || lowerMessage.includes('safeway')) {
        responseData.tasks.push({
          type: "groceries",
          description: "Get groceries",
          preferences: []
        });
      }

      if (lowerMessage.includes('indian')) {
        responseData.tasks.push({
          type: "restaurant",
          description: "Eat at an Indian restaurant",
          preferences: [
            {
              type: "category",
              value: "Indian",
              isMandatory: false,
              description: "Prefer Indian cuisine"
            }
          ]
        });
      } else if (lowerMessage.includes('restaurant') || lowerMessage.includes('food')) {
        responseData.tasks.push({
          type: "restaurant",
          description: "Eat at a restaurant",
          preferences: []
        });
      }

      if (lowerMessage.includes('pharmacy') || lowerMessage.includes('cvs') || lowerMessage.includes('walgreens')) {
        responseData.tasks.push({
          type: "custom",
          description: "Go to pharmacy",
          preferences: []
        });
      }

      if (lowerMessage.includes('coffee') || lowerMessage.includes('starbucks')) {
        responseData.tasks.push({
          type: "custom",
          description: "Get coffee",
          preferences: []
        });
      }

      if (lowerMessage.includes('bank')) {
        responseData.tasks.push({
          type: "custom",
          description: "Go to bank",
          preferences: []
        });
      }

      // Default task if none detected
      if (responseData.tasks.length === 0) {
        responseData.tasks.push({
          type: "custom",
          description: "Run errands",
          preferences: []
        });
      }

      // Add location extraction
      if (lowerMessage.includes('santa clara')) {
        responseData.startingLocation = "Santa Clara, CA";
      } else if (lowerMessage.includes('san jose')) {
        responseData.startingLocation = "San Jose, CA";
      } else if (lowerMessage.includes('palo alto')) {
        responseData.startingLocation = "Palo Alto, CA";
      }

      return {
        success: true,
        content: JSON.stringify(responseData, null, 2),
        reasoning: `Extracted ${responseData.tasks.length} tasks from user input with location: ${responseData.startingLocation}`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Mock agent error'
      };
    }
  }
}