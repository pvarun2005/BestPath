import { SpoonOSAgent } from './SpoonOSAgent';
import { MockSpoonOSAgent } from './MockSpoonOSAgent';
import { Task, Location, Preference, ParsedUserRequest } from '@shared/types';
import { isMockMode } from '../utils/config';

export class IntentParserAgent {
  private agent: SpoonOSAgent | MockSpoonOSAgent;

  constructor(geminiApiKey: string, geminiApiUrl: string) {
    if (isMockMode()) {
      this.agent = new MockSpoonOSAgent();
    } else {
      this.agent = new SpoonOSAgent({ geminiApiKey, geminiApiUrl });
    }
  }

  async parseUserInput(userInput: string): Promise<ParsedUserRequest> {
    const systemPrompt = `You are an intelligent task parser for a route optimization application. 
    Your job is to extract tasks, locations, and preferences from natural language input.
    
    Extract the following information:
    1. Starting location (city/address)
    2. List of tasks (gym, groceries, restaurant, etc.)
    3. Preferences (specific locations, chains, categories, hours, etc.)
    4. Whether preferences are mandatory or preferred
    
    Return JSON format:
    {
      "startingLocation": "city name or address",
      "tasks": [
        {
          "type": "gym|groceries|restaurant|custom",
          "description": "task description",
          "preferences": [
            {
              "type": "location|chain|category|hours|rating",
              "value": "preference value",
              "isMandatory": true|false,
              "description": "human readable description"
            }
          ]
        }
      ],
      "optimizeFor": "time|distance|preferences|cost"
    }
    
    If no optimization preference is mentioned, default to "preferences".
    
    <reasoning>
    Explain your parsing logic and any assumptions made
    </reasoning>`;

    const response = await this.agent.sendMessage(userInput, systemPrompt);
    
    if (!response.success || !response.content) {
      throw new Error(`Failed to parse user input: ${response.error}`);
    }

    try {
      // Extract JSON from the response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Transform to our expected format
      return {
        startingLocation: {
          latitude: 0, // Will be geocoded later
          longitude: 0,
          address: parsedData.startingLocation,
          name: parsedData.startingLocation
        },
        tasks: parsedData.tasks.map((task: any, index: number) => ({
          id: `task-${index}`,
          type: task.type,
          description: task.description,
          preferences: task.preferences || [],
          isMandatory: task.preferences?.some((p: Preference) => p.isMandatory) || false
        })),
        preferences: parsedData.tasks.flatMap((task: any) => task.preferences || []),
        optimizeFor: parsedData.optimizeFor || 'preferences'
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}