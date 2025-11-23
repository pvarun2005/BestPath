# BestPath

What is Best Path: BestPath is an AI driven application that lets users describe their errands or goals in natural language—like “I need groceries, gas, and a gym near San Ramon”—and automatically generates the optimal route using real-time data. Unlike traditional map apps, you don’t need exact addresses or manual reordering, and unlike pure LLMs, BestPath uses live geographic data for accurate, actionable navigation.

How was Trae AI used: After designing the requirements of my application along with the general user workflow, I used the Solo Builder mode to help create a prototype or a base. After doing that, I switched to the Solo Coder mode which I used to help debug and iterate through my design. Even as I was deploying the application locally, you can see that the tab is labeled My Trae Project with the Trae Logo. 

Sudo Developer API: I used sudo developer toolkit to use and get free gemini credits in my application. It helped power the natural language understanding from the user prompt, parse the prompt, and even help find locations of places.

Mapbox API: I used this api to help get location data along with helping optimize the routes between the desired places

SpoonOS: SpoonOS is being integrated in my project to help coordinate between different agents such as: IntentParserAgent - reasons about user goals, LocationFinderAgent - intelligently finds matching locations, RouteOptimizerAgent - considers tradeoffs (time vs preferences vs cost vs type of transport), PreferenceAgent - learns and remembers user preferences as the user interacts with the application

Demo Video: https://app.screencastify.com/watch/Cb2TJI6Jzkzniaa10YJV?checkOrg=7770ee4d-d83f-478b-9d21-3cf335a986e8
```
