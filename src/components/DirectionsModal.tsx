import React from 'react';
import { X, Navigation, MapPin, ArrowRight } from 'lucide-react';

interface Leg {
  distance: number;
  duration: number;
  steps: Step[];
}

interface Step {
  distance: number;
  duration: number;
  name?: string;
  maneuver: {
    instruction: string;
    type: string;
    modifier?: string;
  };
}

interface DirectionsModalProps {
  legs: Leg[];
  waypoints: Array<{ location: { name: string; address: string } }>;
  onClose: () => void;
}

export const DirectionsModal: React.FC<DirectionsModalProps> = ({ legs, waypoints, onClose }) => {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters: number) => {
    const miles = meters * 0.000621371;
    if (miles >= 1) {
      return `${miles.toFixed(1)} mi`;
    }
    return `${(meters * 3.28084).toFixed(0)} ft`;
  };

  let stepCounter = 0;

  // Handle case where legs data is not available
  if (!legs || legs.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-blue-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Navigation className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Turn-by-Turn Directions</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No turn-by-turn directions available
              </h3>
              <p className="text-gray-500">
                The route data doesn't include detailed navigation steps.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-blue-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Navigation className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Turn-by-Turn Directions</h2>
              <p className="text-sm text-gray-600">{waypoints.length} stops on this route</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {legs.map((leg, legIndex) => {
            // Each leg represents travel TO a destination
            // legIndex + 1 gives us the destination waypoint
            const destinationWaypoint = waypoints[legIndex + 1];

            // Skip if waypoint doesn't exist
            if (!destinationWaypoint) {
              return null;
            }

            return (
              <div key={legIndex} className="mb-8">
                {/* Destination Header */}
                <div className="flex items-start space-x-3 mb-4 pb-4 border-b">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">
                    {legIndex + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800">
                      To: {destinationWaypoint.location.name}
                    </h3>
                    <p className="text-sm text-gray-600">{destinationWaypoint.location.address}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {formatDistance(leg.distance)}
                      </span>
                      <span>•</span>
                      <span>{formatDuration(leg.duration)}</span>
                    </div>
                  </div>
                </div>

              {/* Steps */}
              <div className="space-y-3 ml-5 pl-6 border-l-2 border-gray-200">
                {leg.steps && leg.steps.length > 0 ? (
                  leg.steps.map((step, stepIndex) => {
                    stepCounter++;
                    return (
                      <div key={stepIndex} className="relative">
                        {/* Step number indicator */}
                        <div className="absolute -left-[29px] top-2 w-5 h-5 bg-white border-2 border-blue-400 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600">
                          {stepCounter}
                        </div>

                        {/* Step content */}
                        <div className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{step.maneuver?.instruction || 'Continue'}</p>
                              {step.name && (
                                <p className="text-sm text-gray-600 mt-1">
                                  on <span className="font-medium">{step.name}</span>
                                </p>
                              )}
                            </div>
                            <div className="ml-4 text-right flex-shrink-0">
                              <div className="text-sm font-semibold text-gray-800">
                                {formatDistance(step.distance || 0)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDuration(step.duration || 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500 italic">No detailed steps available for this segment</div>
                )}
              </div>

              {/* Arrow to next destination */}
              {legIndex < legs.length - 1 && (
                <div className="flex items-center justify-center my-6">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <ArrowRight className="w-5 h-5" />
                    <span className="text-sm font-medium">Continue to next stop</span>
                  </div>
                </div>
              )}
            </div>
            );
          })}

          {/* Final Destination */}
          {waypoints.length > legs.length && (
            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-800">
                  Final Destination
                </h3>
                <p className="text-sm text-gray-700 font-medium mt-1">
                  {waypoints[waypoints.length - 1].location.name}
                </p>
                <p className="text-sm text-gray-600">
                  {waypoints[waypoints.length - 1].location.address}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close Directions
          </button>
        </div>
      </div>
    </div>
  );
};
