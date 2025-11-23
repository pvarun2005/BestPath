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
    // Reset agent history to avoid contamination across requests
    (this.agent as any).clearHistory?.();
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
      const normalizedTasks = (parsedData.tasks || []).map((task: any, index: number) => ({
        id: `task-${index}`,
        type: task.type,
        description: task.description,
        preferences: task.preferences || [],
        isMandatory: (task.preferences || []).some((p: Preference) => p.isMandatory) || false
      }));

      const text = userInput.toLowerCase();
      const hasGroceries = /\bgrocer(y|ies)\b|\bsupermarket\b|\bwalmart\b/.test(text);
      const hasGym = /\bgym\b|\bfitness\b|\bequinox\b|\b24\s*hour\s*fitness\b/.test(text);
      const cuisineMatch = text.match(/\b(indian|chinese|japanese|korean|thai|mexican|italian|pizza|sushi)\b/);

      const isRequired = (phrase: string) => {
        const p = phrase.toLowerCase();
        return /(must|only|exactly|required|have to|need to)\s+/.test(p);
      };

      if (hasGroceries && !normalizedTasks.some(t => t.type === 'groceries')) {
        const chainReq = text.includes('walmart');
        normalizedTasks.push({
          id: `task-${normalizedTasks.length}`,
          type: 'groceries',
          description: 'Get groceries',
          preferences: [{ type: 'chain', value: chainReq ? 'Walmart' : 'Costco', isMandatory: chainReq && isRequired('must walmart'), description: chainReq ? 'Prefer Walmart' : 'Prefer Costco' } as any],
          isMandatory: false
        });
      }

      if (hasGym && !normalizedTasks.some(t => t.type === 'gym')) {
        const gymChain = text.includes('equinox') ? 'Equinox' : (text.includes('24 hour fitness') ? '24 Hour Fitness' : 'Any');
        normalizedTasks.push({
          id: `task-${normalizedTasks.length}`,
          type: 'gym',
          description: 'Go to the gym',
          preferences: gymChain === 'Any' ? [] : [{ type: 'chain', value: gymChain, isMandatory: isRequired(`must ${gymChain}`), description: `Prefer ${gymChain}` } as any],
          isMandatory: false
        });
      }

      if (cuisineMatch && !normalizedTasks.some(t => t.type === 'restaurant')) {
        normalizedTasks.push({
          id: `task-${normalizedTasks.length}`,
          type: 'restaurant',
          description: `Eat at a ${cuisineMatch[1]} restaurant`,
          preferences: [{ type: 'category', value: cuisineMatch[1][0].toUpperCase() + cuisineMatch[1].slice(1), isMandatory: isRequired(`must ${cuisineMatch[1]}`), description: `Prefer ${cuisineMatch[1]} cuisine` } as any],
          isMandatory: false
        });
      }

      const prefs = normalizedTasks.flatMap((task: any) => task.preferences || []);

      // Extract starting location from user input if present (override LLM when explicit)
      let startAddr = parsedData.startingLocation;
      const startMatch = userInput.match(/\b(in|at)\s+([^,.]+,\s*[A-Z]{2})/i);
      if (startMatch) {
        startAddr = startMatch[2];
      }

      return {
        startingLocation: {
          latitude: 0,
          longitude: 0,
          address: startAddr,
          name: startAddr
        },
        tasks: normalizedTasks,
        preferences: prefs,
        optimizeFor: parsedData.optimizeFor || 'preferences'
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}