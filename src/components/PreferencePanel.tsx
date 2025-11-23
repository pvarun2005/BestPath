import React from 'react';
import { X, MapPin, Star, Clock, Check, Plus } from 'lucide-react';

interface PreferencePanelProps {
  parsedRequest: any;
  onClose: () => void;
}

export const PreferencePanel: React.FC<PreferencePanelProps> = ({ parsedRequest, onClose }) => {
  const tasks = parsedRequest?.tasks || [];
  const preferences = parsedRequest?.preferences || [];

  const getPreferenceIcon = (type: string) => {
    switch (type) {
      case 'location':
        return <MapPin className="w-4 h-4" />;
      case 'chain':
        return <Star className="w-4 h-4" />;
      case 'hours':
        return <Clock className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const getPreferenceColor = (isMandatory: boolean) => {
    return isMandatory 
      ? 'bg-red-100 text-red-800 border-red-200' 
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Route Preferences</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Tasks Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Tasks</h3>
            <div className="space-y-2">
              {tasks.map((task: any, index: number) => (
                <div key={task.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 capitalize">{task.type}</div>
                    <div className="text-sm text-gray-600">{task.description}</div>
                  </div>
                  {task.isMandatory && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                      Mandatory
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Preferences</h3>
            {preferences.length > 0 ? (
              <div className="space-y-2">
                {preferences.map((pref: any, index: number) => (
                  <div key={pref.id || index} className={`flex items-center space-x-3 p-3 rounded-lg border ${getPreferenceColor(pref.isMandatory)}`}>
                    <div className="flex-shrink-0">
                      {getPreferenceIcon(pref.type)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium capitalize">{pref.type}</div>
                      <div className="text-sm">{pref.description}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {pref.isMandatory ? (
                        <span className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded-full flex items-center">
                          <Check className="w-3 h-3 mr-1" />
                          Required
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
                          Preferred
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No specific preferences detected
              </div>
            )}
          </div>
          {/* Optimization Goal */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Optimization Goal</h3>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-800 font-medium capitalize">
                  {parsedRequest?.optimizeFor || 'preferences'} optimized
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            <p className="mb-2">💡 <strong>Tip:</strong> Use specific location names for mandatory preferences (e.g., "Costco Santa Clara") and general terms for flexible preferences (e.g., "24/7 gym").</p>
            <p>🤖 These preferences were automatically extracted from your input and can be edited before route generation.</p>
          </div>
        </div>
      </div>
    </div>
  );
};