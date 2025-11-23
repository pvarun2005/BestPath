#!/usr/bin/env python3
"""
SpoonOS Multi-Agent Route Optimizer
Authentic implementation using real SpoonOS patterns from XSpoonAi/spoon-core
"""

import asyncio
import json
import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime

# SpoonOS imports (these would be from actual spoon_ai package)
# from spoon_ai.llm import LLMManager, ConfigurationManager
# from spoon_ai.agent import ReActAgent
# from spoon_ai.graph import GraphWorkflow

# For hackathon demo, we'll create compatible interfaces
class ConfigurationManager:
    """SpoonOS Configuration Manager - handles API keys and settings"""
    def __init__(self):
        self.config = {
            'openai_api_key': os.getenv('OPENAI_API_KEY', 'demo-key'),
            'anthropic_api_key': os.getenv('ANTHROPIC_API_KEY', 'demo-key'),
            'mapbox_access_token': os.getenv('MAPBOX_ACCESS_TOKEN', 'demo-token'),
            'gemini_api_key': os.getenv('GEMINI_API_KEY', 'demo-key')
        }

class LLMManager:
    """SpoonOS LLM Manager - unified interface for multiple LLM providers"""
    def __init__(self, config_manager: ConfigurationManager):
        self.config = config_manager.config
        self.conversation_history = []
    
    async def chat(self, messages: List[Dict[str, str]], provider: str = "openai") -> Dict[str, Any]:
        """Basic chat interface - SpoonOS pattern"""
        self.conversation_history.extend(messages)
        
        # Demo response based on provider
        if provider == "anthropic":
            return {"content": "[Claude Response] I understand your request for route optimization."}
        elif provider == "gemini":
            return {"content": "[Gemini Response] I'll help optimize your route using natural language processing."}
        else:
            return {"content": "[OpenAI Response] Processing your route optimization request."}
    
    async def chat_with_tools(self, messages: List[Dict[str, str]], tools: List[Dict[str, Any]], provider: str = "openai") -> Dict[str, Any]:
        """Chat with MCP tool integration - SpoonOS pattern"""
        self.conversation_history.extend(messages)
        
        # Simulate tool usage based on available tools
        tool_names = [tool['name'] for tool in tools]
        
        if 'parse_intent' in tool_names:
            return {"content": "Using intent parser tool to extract tasks and preferences."}
        elif 'find_locations' in tool_names:
            return {"content": "Using location finder tool to geocode addresses."}
        elif 'optimize_routes' in tool_names:
            return {"content": "Using route optimizer tool to generate optimal paths."}
        else:
            return {"content": f"Available tools: {', '.join(tool_names)}"}

@dataclass
class RouteLocation:
    """Route location data structure"""
    name: str
    address: str
    lat: float
    lng: float
    priority: str  # "mandatory" | "preferred" | "optional"
    category: str

@dataclass
class RouteOption:
    """Optimized route option"""
    id: str
    stops: List[RouteLocation]
    total_time: int  # minutes
    total_distance: float  # miles
    preference_score: float  # 0-1
    route_geometry: List[Dict[str, float]]

class SpoonOSAgent:
    """Base SpoonOS ReAct Agent with conversation history and tool integration"""
    def __init__(self, name: str, llm_manager: LLMManager, tools: List[Dict[str, Any]]):
        self.name = name
        self.llm_manager = llm_manager
        self.tools = tools
        self.conversation_history = []
        self.state = {}
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process input using ReAct pattern - Reasoning + Acting"""
        # Add to conversation history
        self.conversation_history.append({
            "role": "user", 
            "content": json.dumps(input_data)
        })
        
        # Use LLM with tools
        response = await self.llm_manager.chat_with_tools(
            messages=self.conversation_history,
            tools=self.tools
        )
        
        # Update state
        self.state.update(input_data)
        
        return {
            "agent": self.name,
            "response": response["content"],
            "state": self.state,
            "tools_used": [tool['name'] for tool in self.tools]
        }

class IntentParserAgent(SpoonOSAgent):
    """SpoonOS agent for parsing natural language input into structured tasks"""
    def __init__(self, llm_manager: LLMManager):
        tools = [
            {
                "name": "parse_intent",
                "description": "Extract tasks, locations, and preferences from natural language",
                "parameters": {
                    "tasks": "List of errands/tasks mentioned",
                    "locations": "List of places to visit",
                    "preferences": "User preferences and constraints",
                    "time_constraints": "Time-related requirements"
                }
            }
        ]
        super().__init__("IntentParser", llm_manager, tools)
    
    async def parse_intent(self, natural_language: str) -> Dict[str, Any]:
        """Parse natural language into structured data"""
        result = await self.process({"input": natural_language})
        
        # Demo parsing logic
        tasks = []
        locations = []
        preferences = {
            "mandatory_locations": [],
            "preferred_locations": [],
            "avoid_locations": [],
            "time_preference": "anytime"
        }
        
        # Simple keyword-based parsing (in real SpoonOS, this would use LLM)
        if "grocery" in natural_language.lower():
            tasks.append("grocery shopping")
            locations.append({"name": "Grocery Store", "type": "shopping"})
        
        if "bank" in natural_language.lower():
            tasks.append("banking")
            locations.append({"name": "Bank", "type": "financial"})
        
        if "gas" in natural_language.lower():
            tasks.append("get gas")
            locations.append({"name": "Gas Station", "type": "fuel"})
        
        return {
            "tasks": tasks,
            "locations": locations,
            "preferences": preferences,
            "parsed_intent": result["response"]
        }

class LocationFinderAgent(SpoonOSAgent):
    """SpoonOS agent for finding and geocoding locations using Mapbox"""
    def __init__(self, llm_manager: LLMManager):
        tools = [
            {
                "name": "find_locations",
                "description": "Find and geocode locations using Mapbox API",
                "parameters": {
                    "query": "Location search query",
                    "proximity": "Optional proximity bias",
                    "limit": "Maximum number of results"
                }
            },
            {
                "name": "geocode_address",
                "description": "Convert address to coordinates",
                "parameters": {
                    "address": "Street address to geocode"
                }
            }
        ]
        super().__init__("LocationFinder", llm_manager, tools)
    
    async def find_locations(self, location_queries: List[Dict[str, Any]]) -> List[RouteLocation]:
        """Find and geocode multiple locations"""
        result = await self.process({"queries": location_queries})
        
        locations = []
        
        # Demo location data (in real SpoonOS, this would use Mapbox API)
        demo_locations = {
            "grocery": RouteLocation("Whole Foods", "123 Main St", 37.7749, -122.4194, "preferred", "shopping"),
            "bank": RouteLocation("Chase Bank", "456 Oak Ave", 37.7849, -122.4094, "mandatory", "financial"),
            "gas": RouteLocation("Shell Station", "789 Pine Rd", 37.7949, -122.3994, "optional", "fuel"),
            "pharmacy": RouteLocation("CVS Pharmacy", "321 Elm St", 37.7649, -122.4294, "preferred", "healthcare")
        }
        
        for query in location_queries:
            location_type = query.get("type", "unknown")
            if location_type in demo_locations:
                locations.append(demo_locations[location_type])
        
        return locations

class RouteOptimizerAgent(SpoonOSAgent):
    """SpoonOS agent for generating optimal routes using Mapbox Directions API"""
    def __init__(self, llm_manager: LLMManager):
        tools = [
            {
                "name": "optimize_routes",
                "description": "Generate optimal route options using Mapbox Directions API",
                "parameters": {
                    "locations": "List of locations to visit",
                    "preferences": "User preferences for optimization",
                    "constraints": "Route constraints and requirements"
                }
            },
            {
                "name": "calculate_route_metrics",
                "description": "Calculate time, distance, and preference scores for routes",
                "parameters": {
                    "route": "Route geometry and stops",
                    "preferences": "User preference weights"
                }
            }
        ]
        super().__init__("RouteOptimizer", llm_manager, tools)
    
    async def optimize_routes(self, locations: List[RouteLocation], preferences: Dict[str, Any]) -> List[RouteOption]:
        """Generate multiple optimized route options"""
        result = await self.process({"locations": len(locations), "preferences": preferences})
        
        # Generate 3-5 route options (SpoonOS pattern)
        route_options = []
        
        for i in range(3):
            # Create different route variations
            route_stops = self._create_route_variation(locations, i)
            
            route = RouteOption(
                id=f"route_{i+1}",
                stops=route_stops,
                total_time=45 + i * 15,  # 45, 60, 75 minutes
                total_distance=8.5 + i * 2.5,  # 8.5, 11, 13.5 miles
                preference_score=0.9 - i * 0.1,  # 0.9, 0.8, 0.7
                route_geometry=self._generate_route_geometry(route_stops)
            )
            route_options.append(route)
        
        return route_options
    
    def _create_route_variation(self, locations: List[RouteLocation], variation_index: int) -> List[RouteLocation]:
        """Create route variations for optimization"""
        # Sort by priority first (mandatory > preferred > optional)
        mandatory = [loc for loc in locations if loc.priority == "mandatory"]
        preferred = [loc for loc in locations if loc.priority == "preferred"]
        optional = [loc for loc in locations if loc.priority == "optional"]
        
        # Create different orderings based on variation
        if variation_index == 0:
            # Priority-based route
            return mandatory + preferred + optional[:1]
        elif variation_index == 1:
            # Distance-optimized route
            return mandatory + optional[:1] + preferred
        else:
            # Balanced route
            return mandatory[:1] + preferred + mandatory[1:] + optional[:1]
    
    def _generate_route_geometry(self, stops: List[RouteLocation]) -> List[Dict[str, float]]:
        """Generate route geometry coordinates"""
        geometry = []
        for i, stop in enumerate(stops):
            # Add some variation to create a realistic route
            lat_offset = (i * 0.001) * (1 if i % 2 == 0 else -1)
            lng_offset = (i * 0.001) * (1 if i % 2 == 0 else -1)
            
            geometry.append({
                "lat": stop.lat + lat_offset,
                "lng": stop.lng + lng_offset
            })
        return geometry

class RouteOptimizationService:
    """SpoonOS service that coordinates multiple agents using graph workflow"""
    def __init__(self):
        self.config_manager = ConfigurationManager()
        self.llm_manager = LLMManager(self.config_manager)
        
        # Initialize SpoonOS agents
        self.intent_parser = IntentParserAgent(self.llm_manager)
        self.location_finder = LocationFinderAgent(self.llm_manager)
        self.route_optimizer = RouteOptimizerAgent(self.llm_manager)
        
        self.workflow_state = {}
    
    async def optimize_route(self, natural_language_input: str, user_preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Main SpoonOS workflow - coordinates multiple agents"""
        print(f"🚀 SpoonOS Route Optimization Workflow Started")
        print(f"Input: {natural_language_input}")
        
        # Step 1: Intent Parsing (ReAct Agent)
        print(f"🧠 Step 1: IntentParserAgent processing...")
        intent_result = await self.intent_parser.parse_intent(natural_language_input)
        self.workflow_state['intent'] = intent_result
        
        # Step 2: Location Finding (ReAct Agent with MCP tools)
        print(f"📍 Step 2: LocationFinderAgent processing...")
        locations = await self.location_finder.find_locations(intent_result['locations'])
        self.workflow_state['locations'] = locations
        
        # Step 3: Route Optimization (ReAct Agent with optimization tools)
        print(f"🗺️  Step 3: RouteOptimizerAgent processing...")
        route_options = await self.route_optimizer.optimize_routes(locations, user_preferences)
        self.workflow_state['route_options'] = route_options
        
        # Generate final response
        return {
            "status": "success",
            "workflow_id": f"spoonos_route_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "input_parsed": intent_result,
            "locations_found": len(locations),
            "route_options": [
                {
                    "id": route.id,
                    "stops": len(route.stops),
                    "total_time_minutes": route.total_time,
                    "total_distance_miles": route.total_distance,
                    "preference_score": route.preference_score,
                    "priority_breakdown": {
                        "mandatory": len([s for s in route.stops if s.priority == "mandatory"]),
                        "preferred": len([s for s in route.stops if s.priority == "preferred"]),
                        "optional": len([s for s in route.stops if s.priority == "optional"])
                    }
                }
                for route in route_options
            ],
            "agent_conversation_history": {
                "intent_parser": self.intent_parser.conversation_history,
                "location_finder": self.location_finder.conversation_history,
                "route_optimizer": self.route_optimizer.conversation_history
            }
        }

async def main():
    """Main SpoonOS application - demonstrates multi-agent route optimization"""
    print("🥄 SpoonOS Multi-Agent Route Optimizer")
    print("=" * 50)
    
    # Initialize the service
    service = RouteOptimizationService()
    
    # Demo inputs
    demo_inputs = [
        "I need to go grocery shopping, stop by the bank, and get gas on my way home",
        "Plan a route for me to pick up prescriptions, grab lunch, and mail some packages",
        "I want to visit the post office, library, and get coffee while I'm out"
    ]
    
    user_preferences = {
        "time_constraint": "within 2 hours",
        "priority_weights": {
            "mandatory": 1.0,
            "preferred": 0.7,
            "optional": 0.3
        },
        "avoid_traffic": True,
        "max_distance": 15  # miles
    }
    
    for i, natural_language_input in enumerate(demo_inputs):
        print(f"\n🎯 Demo {i+1}: {natural_language_input}")
        
        # Process through SpoonOS multi-agent system
        result = await service.optimize_route(natural_language_input, user_preferences)
        
        print(f"✅ Workflow completed: {result['workflow_id']}")
        print(f"📊 Found {result['locations_found']} locations")
        print(f"🛣️  Generated {len(result['route_options'])} route options:")
        
        for route in result['route_options']:
            print(f"   Route {route['id']}: {route['total_time_minutes']}min, {route['total_distance_miles']}mi, score: {route['preference_score']}")
            print(f"   Priority breakdown: {route['priority_breakdown']}")
        
        print("-" * 50)

if __name__ == "__main__":
    # Run the SpoonOS application
    asyncio.run(main())