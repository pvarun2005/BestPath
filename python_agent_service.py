#!/usr/bin/env python3
import os
from dotenv import load_dotenv
import json
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# Load .env if present
load_dotenv()

SUDO_API_KEY = os.getenv("SUDO_API_KEY", "")
SUDO_URL = os.getenv("GEMINI_API_URL", "https://sudoapp.dev/api/v1/chat/completions")

def sudo_chat(messages, model="gemini-2.0-flash"):
    if not SUDO_API_KEY:
        return {"error": "SUDO_API_KEY not configured"}
    headers = {
        "Authorization": f"Bearer {SUDO_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
    }
    r = requests.post(SUDO_URL, headers=headers, json=payload, timeout=30)
    if r.status_code != 200:
        return {"error": f"HTTP {r.status_code}", "body": r.text}
    data = r.json()
    return data

@app.route("/health")
def health():
    return jsonify({
        "success": True,
        "sudo": "configured" if SUDO_API_KEY else "not configured",
    })

@app.route("/intent", methods=["POST"])
def intent():
    body = request.json or {}
    text = body.get("text", "")
    system = (
        "You are a task parser. Extract starting location, tasks, and preferences."
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": text},
    ]
    data = sudo_chat(messages)
    if "error" in data:
        return jsonify({"success": False, "error": data["error"], "body": data.get("body")}), 400
    content = (
        data.get("choices", [{}])[0].get("message", {}).get("content", "")
    )
    return jsonify({"success": True, "content": content, "raw": data})

@app.route("/optimize", methods=["POST"])
def optimize():
    body = request.json or {}
    text = body.get("text", "")
    messages = [{"role": "user", "content": text}]
    data = sudo_chat(messages)
    if "error" in data:
        return jsonify({"success": False, "error": data["error"], "body": data.get("body")}), 400
    content = (
        data.get("choices", [{}])[0].get("message", {}).get("content", "")
    )
    return jsonify({"success": True, "content": content, "raw": data})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
