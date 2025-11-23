import { SpoonOSAgent } from './SpoonOSAgent';
import { Location, Task } from '@shared/types';
import mbxClient from '@mapbox/mapbox-sdk';
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';
// import mbxPlaces from '@mapbox/mapbox-sdk/services/places';

export class LocationFinderAgent extends SpoonOSAgent {
  private geocodingService: any;
  // private placesService: any; // Not available in current SDK version

  constructor(geminiApiKey: string, geminiApiUrl: string, mapboxAccessToken: string) {
    super({ geminiApiKey, geminiApiUrl });
    
    const baseClient = mbxClient({ accessToken: mapboxAccessToken });
    this.geocodingService = mbxGeocoding(baseClient);
    // this.placesService = mbxPlaces(baseClient); // Not available in current SDK version
  }

  async findStartingLocation(locationString: string): Promise<Location> {
    try {
      const response = await this.geocodingService.forwardGeocode({
        query: locationString,
        limit: 1
      }).send();

      if (response.body.features.length === 0) {
        throw new Error(`Could not find location: ${locationString}`);
      }

      const feature = response.body.features[0];
      return {
        latitude: feature.center[1],
        longitude: feature.center[0],
        address: feature.place_name,
        name: feature.text
      };
    } catch (error) {
      throw new Error(`Geocoding failed for ${locationString}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findLocationsForTask(task: Task, userLocation: Location): Promise<Location[]> {
    let searchQuery = '';
    
    // Build search query based on task type and preferences
    if (task.preferences.length > 0) {
      // Check for specific location preferences
      const locationPref = task.preferences.find(p => p.type === 'location' && p.isMandatory);
      if (locationPref) {
        searchQuery = locationPref.value;
      } else {
        // Build query from task description and preferences
        const chainPrefs = task.preferences.filter(p => p.type === 'chain');
        const categoryPrefs = task.preferences.filter(p => p.type === 'category');
        
        if (chainPrefs.length > 0) {
          searchQuery = chainPrefs.map(p => p.value).join(' ');
        } else if (categoryPrefs.length > 0) {
          searchQuery = `${task.description} ${categoryPrefs.map(p => p.value).join(' ')}`;
        } else {
          searchQuery = task.description;
        }
      }
    } else {
      searchQuery = task.description;
    }

    return this.searchNearbyLocations(searchQuery, userLocation, task.type);
  }

  private async searchNearbyLocations(query: string, userLocation: Location, taskType: string): Promise<Location[]> {
    try {
      // Use Mapbox Geocoding API with proximity to find nearby locations
      const response = await this.geocodingService.forwardGeocode({
        query: query,
        proximity: [userLocation.longitude, userLocation.latitude],
        limit: 5
      }).send();

      return response.body.features.map((feature: any) => ({
        latitude: feature.center[1],
        longitude: feature.center[0],
        address: feature.place_name,
        name: feature.text
      }));
    } catch (error) {
      throw new Error(`Search failed for ${query}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateMandatoryPreferences(tasks: Task[], userLocation: Location): Promise<boolean> {
    for (const task of tasks) {
      const mandatoryPrefs = task.preferences.filter(p => p.isMandatory);
      
      for (const pref of mandatoryPrefs) {
        if (pref.type === 'location') {
          try {
            await this.findStartingLocation(pref.value);
          } catch (error) {
            throw new Error(`Mandatory preference not found: ${pref.value}`);
          }
        }
      }
    }
    return true;
  }
}