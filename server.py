#!/usr/bin/env python3
"""
Simple local server for testing the betting app
Run with: python simple_server.py
"""

import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs
import threading
import time

PORT = 3000
BETS_FILE = 'bets.json'

class BettingHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='.', **kwargs)
    
    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/bets':
            self.handle_get_bets()
        else:
            # Serve static files
            super().do_GET()
    
    def do_POST(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/bets':
            self.handle_post_bet()
        else:
            self.send_error(404)
    
    def handle_get_bets(self):
        try:
            if os.path.exists(BETS_FILE):
                with open(BETS_FILE, 'r', encoding='utf-8') as f:
                    bets = json.load(f)
            else:
                bets = []
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(bets).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_post_bet(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            new_bet = json.loads(post_data.decode('utf-8'))
            
            # Load existing bets
            if os.path.exists(BETS_FILE):
                with open(BETS_FILE, 'r', encoding='utf-8') as f:
                    bets = json.load(f)
            else:
                bets = []
            
            # Add timestamp and ID if missing
            if 'id' not in new_bet:
                new_bet['id'] = f"bet_{int(time.time())}_{len(bets)}"
            if 'placedAt' not in new_bet:
                new_bet['placedAt'] = time.strftime('%Y-%m-%dT%H:%M:%S.000Z')
            
            # Add the new bet
            bets.append(new_bet)
            
            # Save back to file
            with open(BETS_FILE, 'w', encoding='utf-8') as f:
                json.dump(bets, f, indent=2, ensure_ascii=False)
            
            self.send_response(201)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(new_bet).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == "__main__":
    # Initialize bets file if it doesn't exist
    if not os.path.exists(BETS_FILE):
        with open(BETS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
        print(f"Created {BETS_FILE}")
    
    with socketserver.TCPServer(("", PORT), BettingHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")
            httpd.shutdown()