import { IntentParserAgent } from '../agents/IntentParserAgent';
import { LocationFinderAgent } from '../agents/LocationFinderAgent';
import { RouteOptimizerAgent } from '../agents/RouteOptimizerAgent';
import { MockLocationFinderAgent } from '../agents/MockLocationFinderAgent';
import { MockRouteOptimizerAgent } from '../agents/MockRouteOptimizerAgent';
import { ParsedUserRequest, Route, RouteOption, Location } from '@shared/types';
import { parseIntent as pyParseIntent, health as pyHealth, optimizeRoute as pyOptimizeRoute } from '../utils/pythonAgent';

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
  private usePythonAgent: boolean;

  constructor(config: RouteOptimizationServiceConfig) {
    this.useMockData = !config.mapboxAccessToken || config.mapboxAccessToken === 'your_mapbox_access_token_here';
    this.usePythonAgent = (process.env.USE_PY_AGENT || 'false').toLowerCase() === 'true';
    
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
      let parsedRequest: ParsedUserRequest;
      if (this.usePythonAgent) {
        const pyHealthRes = await pyHealth();
        if ((pyHealthRes as any).success === false) {
          console.warn('Python agent health check failed, falling back to TS agent');
          parsedRequest = await this.intentParser.parseUserInput(userInput);
        } else {
          const pyRes = await pyParseIntent(userInput);
          if (!pyRes.success || !pyRes.content) {
            console.warn('Python intent parse failed, falling back to TS agent');
            parsedRequest = await this.intentParser.parseUserInput(userInput);
          } else {
            const jsonMatch = pyRes.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsedData = JSON.parse(jsonMatch[0]);
              parsedRequest = {
                startingLocation: {
                  latitude: 0,
                  longitude: 0,
                  address: parsedData.startingLocation,
                  name: parsedData.startingLocation
                },
                tasks: (parsedData.tasks || []).map((task: any, index: number) => ({
                  id: `task-${index}`,
                  type: task.type,
                  description: task.description,
                  preferences: task.preferences || [],
                  isMandatory: (task.preferences || []).some((p: any) => p.isMandatory) || false
                })),
                preferences: (parsedData.tasks || []).flatMap((task: any) => task.preferences || []),
                optimizeFor: parsedData.optimizeFor || 'preferences'
              };
            } else {
              parsedRequest = await this.intentParser.parseUserInput(userInput);
            }
          }
        }
      } else {
        // TS parser may fail if LLM returns 400; fallback to Python pipeline
        try {
          parsedRequest = await this.intentParser.parseUserInput(userInput);
        } catch (e) {
          console.warn('TS intent parser failed, delegating directly to Python pipeline');
          const pyDirect = await pyOptimizeRoute({ userInput });
          if (pyDirect && pyDirect.success) {
            const routes: Route[] = (pyDirect.routes || []).map((r: any) => ({
              id: r.id,
              waypoints: (r.stops || []).map((loc: any, idx: number) => ({
                location: loc,
                taskId: `task-${idx}`,
                estimatedDuration: 30,
                order: idx + 1,
              })),
              totalDistance: r.totalDistance,
              totalDuration: r.totalDuration,
              preferenceScore: r.preferenceScore,
              trafficFactor: 'medium',
              legs: r.legs || [],
            }));
            const routeOptions = this.formatRouteOptions(routes, pyDirect.parsedRequest);
            return {
              success: true,
              parsedRequest: pyDirect.parsedRequest,
              routes: routeOptions,
            };
          }
          return {
            success: false,
            error: (pyDirect && pyDirect.error) || 'Failed to parse user input',
          };
        }
      }
      console.log('✅ Parsed request:', JSON.stringify(parsedRequest, null, 2));

      if (this.usePythonAgent) {
        console.log('🛣️  Delegating optimization to Python agent...');
        console.log(`🧩 Tasks to optimize: ${parsedRequest.tasks.length}`);
        const pyResult = await pyOptimizeRoute({
          startingAddress: parsedRequest.startingLocation.address,
          tasks: parsedRequest.tasks
        });
        if (pyResult && pyResult.success) {
          const routes: Route[] = (pyResult.routes || []).map((r: any) => ({
            id: r.id,
            waypoints: (r.stops || []).map((loc: any, idx: number) => ({
              location: loc,
              taskId: `task-${idx}`,
              estimatedDuration: 30,
              order: idx + 1,
            })),
            totalDistance: r.totalDistance,
            totalDuration: r.totalDuration,
            preferenceScore: r.preferenceScore,
            trafficFactor: 'medium',
            legs: r.legs || [],
          }))
          const routeOptions = this.formatRouteOptions(routes, pyResult.parsedRequest)
          return {
            success: true,
            parsedRequest: pyResult.parsedRequest,
            routes: routeOptions,
          }
        } else if (pyResult && pyResult.error) {
          return {
            success: false,
            error: pyResult.error,
          };
        } else {
          console.warn('Python optimization failed, falling back to Node optimization')
        }
      }

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