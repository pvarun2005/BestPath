import React, { useState } from 'react';
import { X, Check, MapPin, Clock, Star, DollarSign } from 'lucide-react';
import { RouteOption } from '@shared/types';
import { DirectionsModal } from './DirectionsModal';

interface RouteDisplayProps {
  routeOption: RouteOption;
  isBest?: boolean;
}

export const RouteDisplay: React.FC<RouteDisplayProps> = ({ routeOption, isBest = false }) => {
  const { route, ranking, reasoning, alternativeLabel } = routeOption;
  const [showDirections, setShowDirections] = useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log('Route object:', route);
    console.log('Route has legs?', 'legs' in route);
    console.log('Route.legs value:', route.legs);
  }, [route]);
  
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
    return `${miles.toFixed(1)} mi`;
  };

  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 border-2 ${
      isBest ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-white' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isBest ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'
          }`}>
            {alternativeLabel}
          </div>
          {isBest && (
            <div className="flex items-center text-yellow-600">
              <Star className="w-4 h-4 fill-current" />
              <span className="ml-1 text-sm font-medium">Recommended</span>
            </div>
          )}
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-800">
            #{ranking}
          </div>
        </div>
      </div>

      {/* Route Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
          <div className="text-sm text-gray-600">Total Time</div>
          <div className="text-lg font-semibold text-gray-800">
            {formatDuration(route.totalDuration)}
          </div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <MapPin className="w-6 h-6 text-green-600 mx-auto mb-1" />
          <div className="text-sm text-gray-600">Distance</div>
          <div className="text-lg font-semibold text-gray-800">
            {formatDistance(route.totalDistance)}
          </div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <Star className="w-6 h-6 text-purple-600 mx-auto mb-1" />
          <div className="text-sm text-gray-600">Preference Score</div>
          <div className="text-lg font-semibold text-gray-800">
            {route.preferenceScore}%
          </div>
        </div>
      </div>

      {/* Route Steps */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-800 mb-3">Route Steps:</h4>
        <div className="space-y-3">
          {route.waypoints.map((waypoint, index) => (
            <div key={waypoint.taskId} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-800">{waypoint.location.name}</div>
                <div className="text-sm text-gray-600">{waypoint.location.address}</div>
                {/* 
                *<div className="text-xs text-gray-500 mt-1"> }
                  *Estimated stop: {waypoint.estimatedDuration} minutes
                </div>
                */}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Info */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            {route.estimatedGasCost && (
              <div className="flex items-center text-gray-600">
                <DollarSign className="w-4 h-4 mr-1" />
                ~${route.estimatedGasCost} gas
              </div>
            )}
            
            <div className={`flex items-center ${getTrafficColor(route.trafficFactor)}`}>
              <div className={`w-2 h-2 rounded-full mr-1 ${
                route.trafficFactor === 'low' ? 'bg-green-500' :
                route.trafficFactor === 'medium' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}></div>
              {route.trafficFactor} traffic
            </div>
          </div>
        </div>
        
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{reasoning}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 mt-4">
        <button
          onClick={() => setShowDirections(true)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Get Directions
        </button>
        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
          Save Route
        </button>
      </div>

      {/* Directions Modal */}
      {showDirections && (
        <DirectionsModal
          legs={route.legs || []}
          waypoints={route.waypoints}
          onClose={() => setShowDirections(false)}
        />
      )}
    </div>
  );
};