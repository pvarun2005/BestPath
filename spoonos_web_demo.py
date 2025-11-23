#!/usr/bin/env python3
"""
SpoonOS Web Demo - Multi-Agent Route Optimizer
Web interface for the authentic SpoonOS route optimization system
"""

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import asyncio
import json
from datetime import datetime
from spoonos_route_optimizer import RouteOptimizationService

app = Flask(__name__)
CORS(app)

# Global service instance
route_service = RouteOptimizationService()

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🥄 SpoonOS Multi-Agent Route Optimizer</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .main-content {
            padding: 40px;
        }
        
        .input-section {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
        }
        
        input, textarea, select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        textarea {
            resize: vertical;
            min-height: 100px;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .results-section {
            display: none;
        }
        
        .route-card {
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            transition: border-color 0.3s ease;
        }
        
        .route-card:hover {
            border-color: #667eea;
        }
        
        .route-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 15px;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .route-title {
            font-size: 1.3rem;
            font-weight: 700;
            color: #2c3e50;
        }
        
        .route-stats {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #667eea;
        }
        
        .stat-label {
            font-size: 0.9rem;
            color: #6c757d;
        }
        
        .preference-score {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: 600;
        }
        
        .stops-list {
            margin-top: 20px;
        }
        
        .stop-item {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f1f3f4;
        }
        
        .stop-item:last-child {
            border-bottom: none;
        }
        
        .stop-icon {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 15px;
        }
        
        .stop-icon.mandatory {
            background: #dc3545;
        }
        
        .stop-icon.preferred {
            background: #ffc107;
        }
        
        .stop-icon.optional {
            background: #28a745;
        }
        
        .stop-name {
            font-weight: 600;
            color: #2c3e50;
        }
        
        .stop-category {
            margin-left: auto;
            background: #e9ecef;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            color: #6c757d;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
        }
        
        .workflow-info {
            background: #d1ecf1;
            color: #0c5460;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .main-content {
                padding: 20px;
            }
            
            .route-header {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .route-stats {
                justify-content: space-between;
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🥄 SpoonOS Multi-Agent Route Optimizer</h1>
            <p>Authentic implementation using real SpoonOS patterns from XSpoonAi/spoon-core</p>
        </div>
        
        <div class="main-content">
            <div class="input-section">
                <h2>🎯 Plan Your Route</h2>
                <form id="routeForm">
                    <div class="form-group">
                        <label for="naturalInput">Describe your errands in natural language:</label>
                        <textarea id="naturalInput" placeholder="e.g., I need to go grocery shopping, stop by the bank, and get gas on my way home..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="timeConstraint">Time Constraint:</label>
                        <select id="timeConstraint">
                            <option value="anytime">Anytime</option>
                            <option value="within 1 hour">Within 1 hour</option>
                            <option value="within 2 hours">Within 2 hours</option>
                            <option value="within 3 hours">Within 3 hours</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="maxDistance">Maximum Distance (miles):</label>
                        <input type="number" id="maxDistance" value="15" min="1" max="50">
                    </div>
                    
                    <button type="submit" class="btn" id="submitBtn">🚀 Optimize Route</button>
                </form>
            </div>
            
            <div id="loadingSection" class="loading" style="display: none;">
                <div class="spinner"></div>
                <p>🥄 SpoonOS agents are working on your route optimization...</p>
            </div>
            
            <div id="errorSection" class="error" style="display: none;"></div>
            
            <div id="resultsSection" class="results-section">
                <div id="workflowInfo" class="workflow-info"></div>
                <div id="routeResults"></div>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('routeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const loadingSection = document.getElementById('loadingSection');
            const errorSection = document.getElementById('errorSection');
            const resultsSection = document.getElementById('resultsSection');
            
            // Show loading state
            submitBtn.disabled = true;
            loadingSection.style.display = 'block';
            errorSection.style.display = 'none';
            resultsSection.style.display = 'none';
            
            try {
                const formData = {
                    natural_language_input: document.getElementById('naturalInput').value,
                    user_preferences: {
                        time_constraint: document.getElementById('timeConstraint').value,
                        max_distance: parseInt(document.getElementById('maxDistance').value),
                        priority_weights: {
                            mandatory: 1.0,
                            preferred: 0.7,
                            optional: 0.3
                        },
                        avoid_traffic: true
                    }
                };
                
                const response = await fetch('/optimize', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                displayResults(result);
                
            } catch (error) {
                console.error('Error:', error);
                errorSection.textContent = `Error: ${error.message}`;
                errorSection.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                loadingSection.style.display = 'none';
            }
        });
        
        function displayResults(data) {
            const workflowInfo = document.getElementById('workflowInfo');
            const routeResults = document.getElementById('routeResults');
            const resultsSection = document.getElementById('resultsSection');
            
            // Display workflow information
            workflowInfo.innerHTML = `
                <strong>🥄 SpoonOS Workflow Completed!</strong><br>
                Workflow ID: ${data.workflow_id}<br>
                Locations Found: ${data.locations_found}<br>
                Route Options Generated: ${data.route_options.length}
            `;
            
            // Display route options
            routeResults.innerHTML = data.route_options.map(route => `
                <div class="route-card">
                    <div class="route-header">
                        <div class="route-title">${route.id}</div>
                        <div class="route-stats">
                            <div class="stat">
                                <div class="stat-value">${route.total_time_minutes}</div>
                                <div class="stat-label">Minutes</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${route.total_distance_miles}</div>
                                <div class="stat-label">Miles</div>
                            </div>
                            <div class="stat">
                                <div class="preference-score">${route.preference_score.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="stops-list">
                        ${generateStopsList(route)}
                    </div>
                </div>
            `).join('');
            
            resultsSection.style.display = 'block';
        }
        
        function generateStopsList(route) {
            const priorityBreakdown = route.priority_breakdown;
            return `
                <div style="margin-bottom: 15px;">
                    <strong>Priority Breakdown:</strong> 
                    ${priorityBreakdown.mandatory} mandatory, 
                    ${priorityBreakdown.preferred} preferred, 
                    ${priorityBreakdown.optional} optional
                </div>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <span style="display: flex; align-items: center; gap: 5px;">
                        <span class="stop-icon mandatory"></span> Mandatory
                    </span>
                    <span style="display: flex; align-items: center; gap: 5px;">
                        <span class="stop-icon preferred"></span> Preferred
                    </span>
                    <span style="display: flex; align-items: center; gap: 5px;">
                        <span class="stop-icon optional"></span> Optional
                    </span>
                </div>
            `;
        }
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/optimize', methods=['POST'])
def optimize_route():
    try:
        data = request.json
        natural_language_input = data.get('natural_language_input', '')
        user_preferences = data.get('user_preferences', {})
        
        # Run the SpoonOS async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(
            route_service.optimize_route(natural_language_input, user_preferences)
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🥄 Starting SpoonOS Multi-Agent Route Optimizer Web Demo...")
    print("📱 Open http://localhost:5000 in your browser")
    app.run(debug=True, port=5000)