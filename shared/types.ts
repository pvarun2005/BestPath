// Core types for the route optimization application

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  name: string;
}

export interface Task {
  id: string;
  type: 'gym' | 'groceries' | 'restaurant' | 'custom';
  description: string;
  location?: Location;
  preferences: Preference[];
  isMandatory: boolean;
}

export interface Preference {
  id: string;
  type: 'location' | 'chain' | 'category' | 'hours' | 'rating';
  value: string;
  isMandatory: boolean;
  description: string;
}

export interface Route {
  id: string;
  waypoints: Waypoint[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  preferenceScore: number; // 0-100
  estimatedGasCost?: number;
  trafficFactor: 'low' | 'medium' | 'high';
}

export interface Waypoint {
  location: Location;
  taskId: string;
  estimatedDuration: number; // minutes at location
  order: number;
}

export interface UserInput {
  startingLocation: string;
  tasks: string[];
  preferences: Preference[];
  optimizeFor: 'time' | 'distance' | 'preferences' | 'cost';
}

export interface ParsedUserRequest {
  startingLocation: Location;
  tasks: Task[];
  preferences: Preference[];
  optimizeFor: 'time' | 'distance' | 'preferences' | 'cost';
}

export interface RouteOption {
  route: Route;
  ranking: number;
  reasoning: string;
  alternativeLabel: string;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  reasoning?: string;
}