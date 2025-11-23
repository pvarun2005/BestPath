import { IntentParserAgent } from '../agents/IntentParserAgent';
import { LocationFinderAgent } from '../agents/LocationFinderAgent';
import { RouteOptimizerAgent } from '../agents/RouteOptimizerAgent';
import { MockLocationFinderAgent } from '../agents/MockLocationFinderAgent';
import { MockRouteOptimizerAgent } from '../agents/MockRouteOptimizerAgent';
import { ParsedUserRequest, Route, RouteOption, Location } from '@shared/types';

export interface RouteOptimizationServiceConfig {
  geminiApiKey: string;
  geminiApiUrl: string;
  mapboxAccessToken: string;
}

export class RouteOptimizationService {
  private intentParser: IntentParserAgent;
  private locationFinder: LocationFinderAgent | MockLocationFinderAgent;
  private routeOptimizer: RouteOptimizerAgent | MockRouteOptimizerAgent;
  private useMockData: boolean;

  constructor(config: RouteOptimizationServiceConfig) {
    this.useMockData = !config.mapboxAccessToken || config.mapboxAccessToken === 'your_mapbox_access_token_here';
    
    this.intentParser = new IntentParserAgent(config.geminiApiKey, config.geminiApiUrl);
    
    if (this.useMockData) {
      console.log('📝 Using mock location data for demo');
      this.locationFinder = new MockLocationFinderAgent();
      this.routeOptimizer = new MockRouteOptimizerAgent();
    } else {
      this.locationFinder = new LocationFinderAgent(
        config.geminiApiKey, 
        config.geminiApiUrl, 
        config.mapboxAccessToken
      );
      this.routeOptimizer = new RouteOptimizerAgent(
        config.geminiApiKey, 
        config.geminiApiUrl, 
        config.mapboxAccessToken
      );
    }
  }

  async optimizeRoute(userInput: string): Promise<{
    success: boolean;
    parsedRequest?: ParsedUserRequest;
    routes?: RouteOption[];
    error?: string;
  }> {
    try {
      console.log('🤖 Step 1: Parsing user input...');
      const parsedRequest = await this.intentParser.parseUserInput(userInput);
      console.log('✅ Parsed request:', JSON.stringify(parsedRequest, null, 2));

      console.log('📍 Step 2: Finding starting location...');
      const startingLocation = await this.locationFinder.findStartingLocation(
        parsedRequest.startingLocation.address
      );
      parsedRequest.startingLocation = startingLocation;
      console.log('✅ Starting location found:', startingLocation.name);

      console.log('🔍 Step 3: Validating mandatory preferences...');
      await this.locationFinder.validateMandatoryPreferences(
        parsedRequest.tasks,
        startingLocation
      );
      console.log('✅ All mandatory preferences validated');

      console.log('🏪 Step 4: Finding locations for tasks...');
      const locationOptions = new Map<string, Location[]>();
      
      for (const task of parsedRequest.tasks) {
        console.log(`  Finding locations for: ${task.description}`);
        const locations = await this.locationFinder.findLocationsForTask(task, startingLocation);
        locationOptions.set(task.id, locations);
        console.log(`  Found ${locations.length} locations`);
      }

      console.log('🛣️  Step 5: Generating optimized routes...');
      const routes = await this.routeOptimizer.generateRoutes(
        startingLocation,
        parsedRequest.tasks,
        locationOptions
      );
      console.log(`✅ Generated ${routes.length} route options`);

      console.log('🏆 Step 6: Ranking and formatting routes...');
      const routeOptions = this.formatRouteOptions(routes, parsedRequest);

      return {
        success: true,
        parsedRequest,
        routes: routeOptions
      };

    } catch (error) {
      console.error('❌ Route optimization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private formatRouteOptions(routes: Route[], parsedRequest: ParsedUserRequest): RouteOption[] {
    return routes.map((route, index) => {
      const ranking = index + 1;
      const reasoning = this.generateRouteReasoning(route, parsedRequest);
      const alternativeLabel = this.generateAlternativeLabel(index, route);

      return {
        route,
        ranking,
        reasoning,
        alternativeLabel
      };
    });
  }

  private generateRouteReasoning(route: Route, parsedRequest: ParsedUserRequest): string {
    const totalTime = Math.round(route.totalDuration / 60);
    const totalDistance = (route.totalDistance / 1000).toFixed(1);
    const preferenceScore = route.preferenceScore;
    
    let reasoning = `This route takes ${totalTime} minutes and covers ${totalDistance}km. `;
    
    if (preferenceScore >= 80) {
      reasoning += 'Excellent preference match - all your requirements are satisfied!';
    } else if (preferenceScore >= 60) {
      reasoning += 'Good preference match - most of your requirements are met.';
    } else {
      reasoning += 'Fair preference match - some trade-offs were made for efficiency.';
    }

    if (route.trafficFactor === 'high') {
      reasoning += ' Note: High traffic expected on this route.';
    } else if (route.trafficFactor === 'low') {
      reasoning += ' Light traffic conditions expected.';
    }

    return reasoning;
  }

  private generateAlternativeLabel(index: number, route: Route): string {
    const labels = [
      '🥇 Best Overall',
      '🥈 Alternative 1',
      '🥉 Alternative 2',
      '💡 Alternative 3',
      '🔍 Alternative 4'
    ];
    
    return labels[index] || `Option ${index + 1}`;
  }
}