// Mock implementation for hackathon demo - replaces Mapbox Directions API with simulated data

import { Route, Location, Task } from '@shared/types';

export class MockRouteOptimizerAgent {
  async generateRoutes(
    startingLocation: Location,
    tasks: Task[],
    locationOptions: Map<string, Location[]>
  ): Promise<Route[]> {
    const routes: Route[] = [];
    
    // Generate 3-5 mock routes with different combinations
    const numRoutes = Math.min(5, Math.max(3, tasks.length));
    
    for (let i = 0; i < numRoutes; i++) {
      const route = this.generateMockRoute(startingLocation, tasks, locationOptions, i);
      routes.push(route);
    }
    
    // Sort by preference score (best first)
    return routes.sort((a, b) => b.preferenceScore - a.preferenceScore);
  }

  private generateMockRoute(
    startingLocation: Location,
    tasks: Task[],
    locationOptions: Map<string, Location[]>,
    routeIndex: number
  ): Route {
    const waypoints = tasks.map((task, index) => {
      const locations = locationOptions.get(task.id) || [];
      const location = locations[routeIndex % locations.length] || locations[0] || {
        latitude: startingLocation.latitude + (Math.random() - 0.5) * 0.1,
        longitude: startingLocation.longitude + (Math.random() - 0.5) * 0.1,
        address: 'Mock Location',
        name: 'Mock Place'
      };

      return {
        location,
        taskId: task.id,
        estimatedDuration: 30, // 30 minutes per stop
        order: index + 1
      };
    });

    // Calculate mock route metrics
    const totalDistance = this.calculateMockDistance(startingLocation, waypoints);
    const totalDuration = this.calculateMockDuration(totalDistance, waypoints);
    const preferenceScore = this.calculateMockPreferenceScore(tasks, routeIndex);
    const trafficFactor = this.getMockTrafficFactor(routeIndex);
    const estimatedGasCost = this.estimateMockGasCost(totalDistance);

    return {
      id: `mock-route-${Date.now()}-${routeIndex}`,
      waypoints,
      totalDistance,
      totalDuration,
      preferenceScore,
      trafficFactor,
      estimatedGasCost
    };
  }

  private calculateMockDistance(startingLocation: Location, waypoints: any[]): number {
    // Mock distance calculation - assume ~5-15km total
    const baseDistance = 8000; // 8km base
    const variation = (Math.random() - 0.5) * 6000; // ±3km variation
    return Math.round(baseDistance + variation);
  }

  private calculateMockDuration(totalDistance: number, waypoints: any[]): number {
    // Mock duration: driving time + stop time
    const drivingTime = (totalDistance / 1000) * 3 * 60; // ~3 minutes per km
    const stopTime = waypoints.length * 30 * 60; // 30 minutes per stop
    return Math.round(drivingTime + stopTime);
  }

  private calculateMockPreferenceScore(tasks: Task[], routeIndex: number): number {
    // Base score with variation based on route index
    const baseScore = 80 - (routeIndex * 10);
    const variation = Math.random() * 20 - 10; // ±10 points
    return Math.max(30, Math.min(100, baseScore + variation));
  }

  private getMockTrafficFactor(routeIndex: number): 'low' | 'medium' | 'high' {
    const factors: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    return factors[routeIndex % factors.length];
  }

  private estimateMockGasCost(distance: number): number {
    // Rough estimate: $0.15 per mile, convert meters to miles
    const miles = distance * 0.000621371;
    return Math.round(miles * 0.15 * 100) / 100;
  }
}