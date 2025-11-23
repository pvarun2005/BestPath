import { SpoonOSAgent } from './SpoonOSAgent';
import { Route, Location, Task } from '@shared/types';
import mbxClient from '@mapbox/mapbox-sdk';
import mbxDirections from '@mapbox/mapbox-sdk/services/directions';

export class RouteOptimizerAgent extends SpoonOSAgent {
  private directionsService: any;

  constructor(geminiApiKey: string, geminiApiUrl: string, mapboxAccessToken: string) {
    super({ geminiApiKey, geminiApiUrl });
    
    const baseClient = mbxClient({ accessToken: mapboxAccessToken });
    this.directionsService = mbxDirections(baseClient);
  }

  async generateRoutes(
    startingLocation: Location,
    tasks: Task[],
    locationOptions: Map<string, Location[]>
  ): Promise<Route[]> {
    const routes: Route[] = [];
    
    // Generate multiple route combinations
    const routeCombinations = this.generateRouteCombinations(tasks, locationOptions);
    
    for (const combination of routeCombinations.slice(0, 5)) {
      // Shuffle combinations to get variety
      const shuffledCombinations = this.shuffleArray([combination]);
      
      for (const taskOrder of shuffledCombinations) {
        try {
          const route = await this.calculateRoute(startingLocation, taskOrder);
          if (route) {
            routes.push(route);
          }
        } catch (error) {
          console.warn('Failed to calculate route:', error);
        }
      }
    }

    // Sort by preference score and total duration
    return routes
      .sort((a, b) => {
        const scoreA = a.preferenceScore * 0.6 + (1 / a.totalDuration) * 0.4;
        const scoreB = b.preferenceScore * 0.6 + (1 / b.totalDuration) * 0.4;
        return scoreB - scoreA;
      })
      .slice(0, 5); // Return top 5 routes
  }

  private generateRouteCombinations(
    tasks: Task[],
    locationOptions: Map<string, Location[]>
  ): Array<Array<{ task: Task; location: Location }>> {
    const combinations: Array<Array<{ task: Task; location: Location }>> = [];
    
    // Generate all possible location combinations for tasks
    const taskLocationPairs = tasks.map(task => {
      const locations = locationOptions.get(task.id) || [];
      return locations.map(location => ({ task, location }));
    });

    // Generate permutations of task orders
    const taskOrders = this.generatePermutations(tasks);
    
    // For each task order, try different location combinations
    for (const taskOrder of taskOrders.slice(0, 10)) { // Limit to prevent explosion
      const orderCombinations = this.buildOrderCombinations(taskOrder, locationOptions);
      combinations.push(...orderCombinations.slice(0, 3));
    }

    return combinations;
  }

  private generatePermutations<T>(array: T[]): T[][] {
    if (array.length <= 1) return [array];
    
    const permutations: T[][] = [];
    
    for (let i = 0; i < array.length; i++) {
      const current = array[i];
      const remaining = array.slice(0, i).concat(array.slice(i + 1));
      const remainingPerms = this.generatePermutations(remaining);
      
      for (const perm of remainingPerms) {
        permutations.push([current, ...perm]);
      }
    }
    
    return permutations;
  }

  private buildOrderCombinations(
    taskOrder: Task[],
    locationOptions: Map<string, Location[]>
  ): Array<Array<{ task: Task; location: Location }>> {
    const combinations: Array<Array<{ task: Task; location: Location }>> = [];
    
    // For each task in order, pick a location
    const buildRecursive = (
      taskIndex: number,
      currentCombination: Array<{ task: Task; location: Location }>
    ) => {
      if (taskIndex >= taskOrder.length) {
        combinations.push([...currentCombination]);
        return;
      }
      
      const task = taskOrder[taskIndex];
      const locations = locationOptions.get(task.id) || [];
      
      for (const location of locations.slice(0, 2)) { // Limit locations per task
        currentCombination.push({ task, location });
        buildRecursive(taskIndex + 1, currentCombination);
        currentCombination.pop();
      }
    };
    
    buildRecursive(0, []);
    return combinations;
  }

  private async calculateRoute(
    startingLocation: Location,
    taskOrder: Array<{ task: Task; location: Location }>
  ): Promise<Route | null> {
    try {
      // Build waypoints for Mapbox Directions API
      const coordinates = [
        [startingLocation.longitude, startingLocation.latitude],
        ...taskOrder.map(item => [item.location.longitude, item.location.latitude])
      ];

      const response = await this.directionsService.getDirections({
        profile: 'driving-traffic',
        waypoints: coordinates.map(coord => ({
          coordinates: coord
        })),
        geometries: 'geojson',
        overview: 'full',
        annotations: ['duration', 'distance', 'traffic']
      }).send();

      const routeData = response.body.routes[0];
      if (!routeData) return null;

      const waypoints = taskOrder.map((item, index) => ({
        location: item.location,
        taskId: item.task.id,
        estimatedDuration: 30, // Default 30 minutes per stop
        order: index + 1
      }));

      return {
        id: `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        waypoints,
        totalDistance: routeData.distance,
        totalDuration: routeData.duration,
        preferenceScore: this.calculatePreferenceScore(taskOrder),
        trafficFactor: this.assessTrafficFactor(routeData),
        estimatedGasCost: this.estimateGasCost(routeData.distance)
      };
    } catch (error) {
      console.error('Route calculation error:', error);
      return null;
    }
  }

  private calculatePreferenceScore(taskOrder: Array<{ task: Task; location: Location }>): number {
    let score = 50; // Base score
    
    taskOrder.forEach(item => {
      const task = item.task;
      const preferences = task.preferences;
      
      // Check if mandatory preferences are satisfied
      const mandatoryPrefs = preferences.filter(p => p.isMandatory);
      const satisfiedMandatory = mandatoryPrefs.filter(p => {
        if (p.type === 'location') {
          return item.location.name.toLowerCase().includes(p.value.toLowerCase()) ||
                 item.location.address.toLowerCase().includes(p.value.toLowerCase());
        }
        if (p.type === 'chain') {
          return item.location.name.toLowerCase().includes(p.value.toLowerCase());
        }
        return false;
      });
      
      // Boost score for satisfied mandatory preferences
      score += satisfiedMandatory.length * 20;
      
      // Check preferred preferences
      const preferredPrefs = preferences.filter(p => !p.isMandatory);
      const satisfiedPreferred = preferredPrefs.filter(p => {
        if (p.type === 'chain') {
          return item.location.name.toLowerCase().includes(p.value.toLowerCase());
        }
        if (p.type === 'category') {
          return item.location.name.toLowerCase().includes(p.value.toLowerCase()) ||
                 item.location.address.toLowerCase().includes(p.value.toLowerCase());
        }
        return false;
      });
      
      // Boost score for satisfied preferred preferences
      score += satisfiedPreferred.length * 10;
    });
    
    return Math.min(100, Math.max(0, score));
  }

  private assessTrafficFactor(routeData: any): 'low' | 'medium' | 'high' {
    if (!routeData.legs) return 'medium';
    
    const totalDuration = routeData.duration;
    const totalDistance = routeData.distance;
    const expectedSpeed = (totalDistance / totalDuration) * 3.6; // km/h
    
    if (expectedSpeed < 20) return 'high';
    if (expectedSpeed < 40) return 'medium';
    return 'low';
  }

  private estimateGasCost(distance: number): number {
    // Rough estimate: $0.15 per mile, convert meters to miles
    const miles = distance * 0.000621371;
    return Math.round(miles * 0.15 * 100) / 100;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}