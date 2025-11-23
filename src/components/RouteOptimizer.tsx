import React, { useState } from 'react';
import { Send, MapPin, Route, Settings, Star, Clock, DollarSign } from 'lucide-react';
import { RouteOption } from '@shared/types';
import { PreferencePanel } from './PreferencePanel';
import { RouteDisplay } from './RouteDisplay';
import { toast } from 'sonner';

export const RouteOptimizer: React.FC = () => {
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [showPreferences, setShowPreferences] = useState(false);
  const [parsedRequest, setParsedRequest] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInput.trim()) {
      toast.error('Please enter your route requirements');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/routes/optimize-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userInput }),
      });

      const result = await response.json();

      if (result.success) {
        setRouteOptions(result.routes);
        setParsedRequest(result.parsedRequest);
        toast.success('Route optimization complete!');
      } else {
        toast.error(result.error || 'Failed to optimize route');
      }
    } catch (error) {
      console.error('Route optimization error:', error);
      toast.error('Failed to connect to route optimization service');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleInputs = [
    "I want to go to the gym, get groceries at Costco Fremont, and eat at an Indian restaurant. I'm in Santa Clara, CA.",
    "Need to run errands: go to 24/7 fitness gym, shop at Safeway, and find a coffee shop. I'm in San Jose.",
    "I want to visit a pharmacy, get lunch at a Mexican restaurant, and go to the bank. I'm in Palo Alto."
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Route className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">BestPath Route Optimizer</h1>
          </div>
          <p className="text-lg text-gray-600">
            Tell us where you want to go and we'll find the best route for your errands
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="userInput" className="block text-sm font-medium text-gray-700 mb-2">
                Describe your route requirements
              </label>
              <textarea
                id="userInput"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Example: I want to go to the gym, get groceries at Costco Fremont, and eat at an Indian restaurant. I'm in Santa Clara, CA. Prefer 24/7 fitness gyms."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Optimize Route
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreferences(!showPreferences)}
                  className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Preferences
                </button>
              </div>

              <div className="text-sm text-gray-500">
                Powered by AI + Mapbox
              </div>
            </div>
          </form>

          {/* Example Inputs */}
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {exampleInputs.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setUserInput(example)}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Example {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preference Panel */}
        {showPreferences && parsedRequest && (
          <PreferencePanel
            parsedRequest={parsedRequest}
            onClose={() => setShowPreferences(false)}
          />
        )}

        {/* Results Section */}
        {routeOptions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Optimized Routes</h2>
              <div className="text-sm text-gray-600">
                Found {routeOptions.length} route options
              </div>
            </div>

            {routeOptions.map((routeOption, index) => (
              <RouteDisplay
                key={routeOption.route.id}
                routeOption={routeOption}
                isBest={index === 0}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {routeOptions.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              No routes to display yet
            </h3>
            <p className="text-gray-500">
              Enter your route requirements above to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};