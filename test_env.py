#!/usr/bin/env python3
import os
from dotenv import load_dotenv

# Load .env
load_dotenv()

print(f"GEMINI_API_URL from env: {os.getenv('GEMINI_API_URL')}")
print(f"SUDO_API_KEY from env: {os.getenv('SUDO_API_KEY')}")
print(f"MAPBOX_ACCESS_TOKEN from env: {os.getenv('MAPBOX_ACCESS_TOKEN')}")
