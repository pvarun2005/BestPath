import { Link } from 'react-router-dom';
import { Route, ArrowRight, MapPin, Clock, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Route className="w-12 h-12 text-blue-600 mr-4" />
            <h1 className="text-5xl font-bold text-gray-800">
              BestPath
            </h1>
          </div>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            AI-powered route optimization for your daily errands. Just tell us what you need to do and where you are - 
            we'll find the most efficient route that matches your preferences.
          </p>
          
          <Link
            to="/optimizer"
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            Start Optimizing Your Route
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Route className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Natural Language Input
            </h3>
            <p className="text-gray-600">
              Just describe what you want to do in plain English. Our AI understands your needs and preferences.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Smart Location Finding
            </h3>
            <p className="text-gray-600">
              Automatically finds the best locations near you, respecting your mandatory and preferred choices.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Multi-Agent Optimization
            </h3>
            <p className="text-gray-600">
              Our AI agents work together to find the most efficient routes, considering time, distance, and your preferences.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Describe Your Errands</h4>
              <p className="text-sm text-gray-600">
                Tell us what you need to do and your location in natural language.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">AI Parses Your Request</h4>
              <p className="text-sm text-gray-600">
                Our AI agents extract tasks, locations, and preferences from your input.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Find Optimal Routes</h4>
              <p className="text-sm text-gray-600">
                Multiple AI agents collaborate to find the best route options.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-yellow-600">4</span>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Choose Your Route</h4>
              <p className="text-sm text-gray-600">
                Review ranked options with explanations and pick your preferred route.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Ready to Optimize Your Errands?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join the future of route planning with AI-powered optimization.
          </p>
        </div>
      </div>
    </div>
  );
}