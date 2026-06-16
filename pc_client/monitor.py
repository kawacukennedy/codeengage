#!/usr/bin/env python3

import sys
import time
import datetime
import serial
import serial.tools.list_ports
import paho.mqtt.client as mqtt

MQTT_BROKER = "broker.benax.rw"
MQTT_PORT = 1883
MQTT_TOPIC = "rca/year2c/kawacu/temperature"
MQTT_KEEPALIVE = 60

SERIAL_BAUD = 9600
RECONNECT_DELAY = 5


def auto_detect_port():
    keywords = ["arduino", "ch340", "usb-serial", "usb serial", "cp210x", "ftdi"]
    ports = serial.tools.list_ports.comports()

    for port in ports:
        desc = (port.description + " " + (port.manufacturer or "")).lower()
        vid = port.vid
        for kw in keywords:
            if kw in desc:
                return port.device
        if vid is not None:
            return port.device

    return None


def find_serial():
    port = auto_detect_port()
    if port:
        print(f"[SERIAL] Auto-detected: {port}")
        return port

    print("[SERIAL] Auto-detection failed.")
    print("Available ports:")
    for p in serial.tools.list_ports.comports():
        print(f"  {p.device} - {p.description}")
    return input("Enter port manually (e.g., COM3 or /dev/ttyUSB0): ").strip()


def on_mqtt_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[MQTT] Connected to broker ({MQTT_BROKER}).")
    else:
        print(f"[MQTT] Connection failed (rc={rc}). Retrying...")


def on_mqtt_disconnect(client, userdata, rc):
    print(f"[MQTT] Disconnected (rc={rc}). Reconnecting...")


def main():
    mqtt_client = mqtt.Client()
    mqtt_client.on_connect = on_mqtt_connect
    mqtt_client.on_disconnect = on_mqtt_disconnect
    mqtt_client.reconnect_delay_set(min_delay=1, max_delay=30)

    ser = None
    mqtt_connected = False

    while True:
        if ser is None:
            port = find_serial()
            try:
                ser = serial.Serial(port, SERIAL_BAUD, timeout=2)
                print(f"[SERIAL] Opened {port} at {SERIAL_BAUD} baud.")
            except Exception as e:
                print(f"[SERIAL] Error opening {port}: {e}")
                print(f"[SERIAL] Retrying in {RECONNECT_DELAY}s...")
                ser = None
                time.sleep(RECONNECT_DELAY)
                continue

        if not mqtt_connected:
            try:
                mqtt_client.connect(MQTT_BROKER, MQTT_PORT, MQTT_KEEPALIVE)
                mqtt_client.loop_start()
                mqtt_connected = True
            except Exception as e:
                print(f"[MQTT] Connection error: {e}")
                print(f"[MQTT] Retrying in {RECONNECT_DELAY}s...")
                time.sleep(RECONNECT_DELAY)
                continue

        try:
            line = ser.readline()
        except Exception as e:
            print(f"[SERIAL] Read error: {e}. Reconnecting...")
            try:
                ser.close()
            except Exception:
                pass
            ser = None
            time.sleep(RECONNECT_DELAY)
            continue

        if not line:
            continue

        raw = line.strip()
        if not raw:
            continue

        try:
            temp = float(raw)
        except ValueError:
            continue

        timestamp = datetime.datetime.now().isoformat(sep=" ", timespec="seconds")
        print(f"[{timestamp}] Temp = {temp:.2f} C")

        if mqtt_connected:
            try:
                mqtt_client.publish(MQTT_TOPIC, f"{temp:.2f}")
            except Exception as e:
                print(f"[MQTT] Publish error: {e}")
                mqtt_connected = False


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[EXIT] Shutting down.")
        sys.exit(0)
