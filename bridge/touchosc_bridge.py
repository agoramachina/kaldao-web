#!/usr/bin/env python3
"""
TouchOSC Bridge: UDP OSC → WebSocket Bridge
Receives OSC messages from TouchOSC via UDP and forwards to browser via WebSocket

Usage:
    python touchosc_bridge.py --osc-port 47803 --websocket-port 8080
"""

import asyncio
import websockets
import argparse
from pythonosc import dispatcher, server, osc_message_builder
from pythonosc.osc_message import OscMessage
import threading
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TouchOSCBridge:
    def __init__(self, osc_port=47803, websocket_port=8080):
        self.osc_port = osc_port
        self.websocket_port = websocket_port
        self.websocket_clients = set()
        self.running = False
        
    async def websocket_handler(self, websocket, path):
        """Handle WebSocket client connections"""
        logger.info(f"WebSocket client connected: {websocket.remote_address}")
        self.websocket_clients.add(websocket)
        
        try:
            await websocket.wait_closed()
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.websocket_clients.discard(websocket)
            logger.info(f"WebSocket client disconnected")

    async def broadcast_osc_message(self, osc_bytes):
        """Broadcast OSC message to all WebSocket clients"""
        if not self.websocket_clients:
            return
            
        disconnected = set()
        for client in self.websocket_clients:
            try:
                await client.send(osc_bytes)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(client)
            except Exception as e:
                logger.error(f"Error sending to WebSocket client: {e}")
                disconnected.add(client)
                
        self.websocket_clients -= disconnected

    def osc_message_handler(self, address, *args):
        """Handle incoming OSC messages from TouchOSC"""
        try:
            logger.info(f"Received OSC: {address} = {args}")
            
            # Create OSC message
            builder = osc_message_builder.OscMessageBuilder(address)
            for arg in args:
                builder.add_arg(arg)
            message = builder.build()
            
            # Forward to WebSocket clients
            asyncio.create_task(self.broadcast_osc_message(message.dgram))
            
        except Exception as e:
            logger.error(f"Error handling OSC message: {e}")

    def start_osc_server(self):
        """Start UDP OSC server in separate thread"""
        disp = dispatcher.Dispatcher()
        # Handle all OSC addresses
        disp.map("/*", self.osc_message_handler, needs_reply_address=False)
        
        osc_server = server.ThreadingOSCUDPServer(
            ("0.0.0.0", self.osc_port), disp
        )
        
        logger.info(f"OSC Server listening on UDP port {self.osc_port}")
        logger.info(f"Configure TouchOSC to send to: {self.get_local_ip()}:{self.osc_port}")
        
        osc_server.serve_forever()

    def get_local_ip(self):
        """Get local IP address for TouchOSC configuration"""
        import socket
        try:
            # Connect to a remote address to determine local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except:
            return "localhost"

    async def start_bridge(self):
        """Start the complete bridge system"""
        logger.info("Starting TouchOSC → WebSocket Bridge")
        
        # Start OSC server in background thread
        osc_thread = threading.Thread(target=self.start_osc_server, daemon=True)
        osc_thread.start()
        
        # Start WebSocket server
        websocket_server = websockets.serve(
            self.websocket_handler,
            "localhost", 
            self.websocket_port
        )
        
        logger.info(f"WebSocket server running on ws://localhost:{self.websocket_port}")
        logger.info("Bridge ready! Configure TouchOSC and connect browser.")
        
        self.running = True
        await websocket_server
        
def main():
    parser = argparse.ArgumentParser(description='TouchOSC → WebSocket Bridge')
    parser.add_argument('--osc-port', type=int, default=47803, 
                        help='UDP port to receive OSC from TouchOSC (default: 47803)')
    parser.add_argument('--websocket-port', type=int, default=8080,
                        help='WebSocket port for browser connection (default: 8080)')
    
    args = parser.parse_args()
    
    bridge = TouchOSCBridge(args.osc_port, args.websocket_port)
    
    try:
        asyncio.run(bridge.start_bridge())
    except KeyboardInterrupt:
        logger.info("Bridge stopped by user")

if __name__ == "__main__":
    main()