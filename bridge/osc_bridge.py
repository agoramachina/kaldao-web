#!/usr/bin/env python3
"""
OSC Bridge: Arduino Bluetooth → WebSocket OSC Bridge
Receives data from Arduino over Bluetooth and forwards as OSC messages via WebSocket
"""

import asyncio
import json
import logging
import serial
import serial.tools.list_ports
import websockets
from pythonosc import osc_message_builder
from pythonosc.osc_message import OscMessage
import argparse
import sys
import time
import re
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class OSCBridge:
    def __init__(self, 
                 bluetooth_port: str = None,
                 websocket_port: int = 8080,
                 baud_rate: int = 9600):
        
        self.bluetooth_port = bluetooth_port
        self.websocket_port = websocket_port
        self.baud_rate = baud_rate
        self.serial_connection: Optional[serial.Serial] = None
        self.websocket_clients = set()
        self.running = False
        
        # Parameter mapping: Arduino analog pin → OSC address
        self.pin_mappings = {
            0: '/pot1',    # A0 → /pot1 (fly_speed)
            1: '/pot2',    # A1 → /pot2 (rotation_speed)  
            2: '/pot3',    # A2 → /pot3 (kaleidoscope_segments)
            3: '/pot4',    # A3 → /pot4 (truchet_radius)
            4: '/pot5',    # A4 → /pot5 (zoom_level)
            5: '/pot6',    # A5 → /pot6 (color_intensity)
            6: '/pot7',    # A6 → /pot7 (contrast)
            7: '/pot8',    # A7 → /pot8 (center_fill_radius)
        }

    def find_arduino_port(self) -> Optional[str]:
        """Auto-detect Arduino Bluetooth port"""
        logger.info("Scanning for Arduino Bluetooth ports...")
        
        ports = serial.tools.list_ports.comports()
        arduino_keywords = [
            'arduino', 'bluetooth', 'rfcomm', 'tty.', 'cu.', 
            'hc-05', 'hc-06', 'esp32'
        ]
        
        for port in ports:
            port_info = f"{port.device} - {port.description}".lower()
            logger.info(f"Found port: {port.device} - {port.description}")
            
            if any(keyword in port_info for keyword in arduino_keywords):
                logger.info(f"Arduino-like port detected: {port.device}")
                return port.device
                
        # Fallback to common Bluetooth serial ports
        common_ports = ['/dev/rfcomm0', '/dev/ttyUSB0', 'COM3', 'COM4', 'COM5']
        for port in common_ports:
            try:
                test_serial = serial.Serial(port, self.baud_rate, timeout=1)
                test_serial.close()
                logger.info(f"Found working port: {port}")
                return port
            except:
                continue
                
        return None

    def init_bluetooth(self) -> bool:
        """Initialize Bluetooth serial connection"""
        if not self.bluetooth_port:
            self.bluetooth_port = self.find_arduino_port()
            
        if not self.bluetooth_port:
            logger.error("No Arduino Bluetooth port found")
            logger.info("Available ports:")
            for port in serial.tools.list_ports.comports():
                logger.info(f"  {port.device} - {port.description}")
            return False
            
        try:
            logger.info(f"Connecting to {self.bluetooth_port} at {self.baud_rate} baud...")
            self.serial_connection = serial.Serial(
                self.bluetooth_port,
                self.baud_rate,
                timeout=2.0,
                write_timeout=2.0
            )
            
            # Wait for Arduino to initialize
            time.sleep(2)
            
            # Clear any initial data
            self.serial_connection.flushInput()
            
            logger.info(f"✓ Connected to Arduino on {self.bluetooth_port}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to {self.bluetooth_port}: {e}")
            return False

    def parse_arduino_data(self, line: str) -> Optional[tuple]:
        """Parse Arduino data format: 'pin:value' or JSON"""
        line = line.strip()
        if not line:
            return None
            
        try:
            # Format 1: "pin:value" (e.g., "0:512")
            if ':' in line and line.count(':') == 1:
                pin_str, value_str = line.split(':')
                pin = int(pin_str)
                value = int(value_str)
                
                # Convert Arduino analog reading (0-1023) to normalized float (0.0-1.0)
                normalized_value = value / 1023.0
                return (pin, normalized_value)
                
            # Format 2: JSON (e.g., {"pin": 0, "value": 512})
            elif line.startswith('{'):
                data = json.loads(line)
                pin = int(data['pin'])
                value = int(data['value'])
                normalized_value = value / 1023.0
                return (pin, normalized_value)
                
        except (ValueError, KeyError, json.JSONDecodeError) as e:
            logger.debug(f"Failed to parse line '{line}': {e}")
            
        return None

    def create_osc_message(self, address: str, value: float) -> bytes:
        """Create OSC message bytes"""
        try:
            builder = osc_message_builder.OscMessageBuilder(address)
            builder.add_arg(value)
            message = builder.build()
            return message.dgram
        except Exception as e:
            logger.error(f"Failed to create OSC message: {e}")
            return b''

    async def handle_websocket_client(self, websocket, path):
        """Handle new WebSocket client connection"""
        logger.info(f"New WebSocket client connected: {websocket.remote_address}")
        self.websocket_clients.add(websocket)
        
        try:
            await websocket.wait_closed()
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.websocket_clients.discard(websocket)
            logger.info(f"WebSocket client disconnected: {websocket.remote_address}")

    async def broadcast_osc_message(self, osc_bytes: bytes):
        """Broadcast OSC message to all connected WebSocket clients"""
        if not self.websocket_clients:
            return
            
        # Send as binary WebSocket message
        disconnected = set()
        for client in self.websocket_clients:
            try:
                await client.send(osc_bytes)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(client)
            except Exception as e:
                logger.error(f"Error sending to WebSocket client: {e}")
                disconnected.add(client)
                
        # Clean up disconnected clients
        self.websocket_clients -= disconnected

    async def read_arduino_data(self):
        """Continuously read and process Arduino data"""
        logger.info("Starting Arduino data reader...")
        
        while self.running:
            try:
                if self.serial_connection and self.serial_connection.in_waiting > 0:
                    line = self.serial_connection.readline().decode('utf-8', errors='ignore')
                    
                    parsed = self.parse_arduino_data(line)
                    if parsed:
                        pin, value = parsed
                        
                        if pin in self.pin_mappings:
                            osc_address = self.pin_mappings[pin]
                            
                            # Create and broadcast OSC message
                            osc_bytes = self.create_osc_message(osc_address, value)
                            if osc_bytes:
                                await self.broadcast_osc_message(osc_bytes)
                                logger.debug(f"Sent OSC: {osc_address} = {value:.3f}")
                        else:
                            logger.debug(f"Unmapped pin {pin}: {value:.3f}")
                            
                await asyncio.sleep(0.01)  # 100Hz polling rate
                
            except serial.SerialException as e:
                logger.error(f"Serial error: {e}")
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Unexpected error in Arduino reader: {e}")
                await asyncio.sleep(1)

    async def start_bridge(self):
        """Start the OSC bridge server"""
        logger.info("Starting OSC Bridge...")
        logger.info(f"WebSocket server will run on ws://localhost:{self.websocket_port}")
        
        if not self.init_bluetooth():
            logger.error("Failed to initialize Bluetooth connection")
            return False
            
        self.running = True
        
        # Start WebSocket server
        websocket_server = websockets.serve(
            self.handle_websocket_client,
            "localhost",
            self.websocket_port
        )
        
        logger.info(f"✓ OSC Bridge running on ws://localhost:{self.websocket_port}")
        logger.info("Parameter mappings:")
        for pin, address in self.pin_mappings.items():
            logger.info(f"  A{pin} → {address}")
        logger.info("Ready for connections!")
        
        # Run WebSocket server and Arduino reader concurrently
        try:
            await asyncio.gather(
                websocket_server,
                self.read_arduino_data()
            )
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        finally:
            self.running = False
            if self.serial_connection:
                self.serial_connection.close()

def main():
    parser = argparse.ArgumentParser(description='OSC Bridge: Arduino Bluetooth → WebSocket')
    parser.add_argument('--port', '-p', type=str, help='Bluetooth serial port (auto-detect if not specified)')
    parser.add_argument('--baud', '-b', type=int, default=9600, help='Baud rate (default: 9600)')
    parser.add_argument('--websocket', '-w', type=int, default=8080, help='WebSocket port (default: 8080)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Create and run bridge
    bridge = OSCBridge(
        bluetooth_port=args.port,
        websocket_port=args.websocket,
        baud_rate=args.baud
    )
    
    try:
        asyncio.run(bridge.start_bridge())
    except KeyboardInterrupt:
        logger.info("Bridge stopped by user")
    except Exception as e:
        logger.error(f"Bridge failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()