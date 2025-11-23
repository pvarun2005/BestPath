// Mock implementation for hackathon demo - replaces Mapbox API calls with simulated data

import { Location, Task } from '@shared/types';

export class MockLocationFinderAgent {
  private mockLocations = {
    'santa clara': {
      latitude: 37.3541,
      longitude: -121.9552,
      address: 'Santa Clara, CA, USA',
      name: 'Santa Clara'
    },
    'san jose': {
      latitude: 37.3382,
      longitude: -121.8863,
      address: 'San Jose, CA, USA',
      name: 'San Jose'
    },
    'palo alto': {
      latitude: 37.4419,
      longitude: -122.1430,
      address: 'Palo Alto, CA, USA',
      name: 'Palo Alto'
    }
  };

  private mockPlaces = {
    gym: [
      { name: '24 Hour Fitness', address: '123 Main St, San Jose, CA' },
      { name: 'LA Fitness', address: '456 Oak Ave, Santa Clara, CA' },
      { name: 'Planet Fitness', address: '789 Pine St, San Jose, CA' }
    ],
    groceries: [
      { name: 'Costco Fremont', address: '1000 Costco Dr, Fremont, CA' },
      { name: 'Safeway', address: '200 Safeway Blvd, Santa Clara, CA' },
      { name: 'Whole Foods', address: '300 Organic Way, San Jose, CA' }
    ],
    restaurant: [
      { name: 'Curry House Indian Restaurant', address: '111 Spice Ln, San Jose, CA' },
      { name: 'Taco Bell Mexican', address: '222 Taco St, Santa Clara, CA' },
      { name: 'Pizza Palace', address: '333 Pizza Ave, San Jose, CA' }
    ],
    pharmacy: [
      { name: 'CVS Pharmacy', address: '444 Health St, Palo Alto, CA' },
      { name: 'Walgreens', address: '555 Drug Ave, San Jose, CA' }
    ],
    coffee: [
      { name: 'Starbucks', address: '666 Coffee Ln, San Jose, CA' },
      { name: 'Peet\'s Coffee', address: '777 Bean St, Santa Clara, CA' }
    ],
    bank: [
      { name: 'Bank of America', address: '888 Finance Blvd, Palo Alto, CA' },
      { name: 'Wells Fargo', address: '999 Money Ave, San Jose, CA' }
    ]
  };

  async findStartingLocation(locationString: string): Promise<Location> {
    const lowerLocation = locationString.toLowerCase();
    
    // Find matching location
    for (const [key, location] of Object.entries(this.mockLocations)) {
      if (lowerLocation.includes(key)) {
        return location;
      }
    }
    
    // Default to Santa Clara if not found
    return this.mockLocations['santa clara'];
  }

  async findLocationsForTask(task: Task, userLocation: Location): Promise<Location[]> {
    const taskType = task.type;
    const places = this.mockPlaces[taskType as keyof typeof this.mockPlaces] || [];
    
    // Filter based on preferences
    const filteredPlaces = this.filterByPreferences(places, task.preferences);
    
    // Convert to Location format with random coordinates around the area
    return filteredPlaces.map((place, index) => ({
      latitude: userLocation.latitude + (Math.random() - 0.5) * 0.02,
      longitude: userLocation.longitude + (Math.random() - 0.5) * 0.02,
      address: place.address,
      name: place.name
    }));
  }

  private filterByPreferences(places: Array<{name: string, address: string}>, preferences: any[]): Array<{name: string, address: string}> {
    if (preferences.length === 0) return places;
    
    const mandatoryPrefs = preferences.filter(p => p.isMandatory);
    
    if (mandatoryPrefs.length > 0) {
      // Filter by mandatory preferences
      return places.filter(place => {
        return mandatoryPrefs.some(pref => {
          if (pref.type === 'location' || pref.type === 'chain') {
            return place.name.toLowerCase().includes(pref.value.toLowerCase());
          }
          return false;
        });
      });
    }
    
    return places;
  }

  async validateMandatoryPreferences(tasks: Task[], userLocation: Location): Promise<boolean> {
    // For mock data, always return true
    return true;
  }
}