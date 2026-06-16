# Temperature & Humidity Monitor with MQTT Bridge

**Candidate:** KAWACU RUGIRANEZA Arnaud Kennedy
**GitHub:** https://github.com/kawacukennedy/temperature_mqtt_final.git

---

## Architecture

```
 DHT11                    Arduino Uno                          Python Gateway                    MQTT                      Web Dashboard
 Sensor                   ┌──────────────────┐                (monitor.py)                     Broker                     
──────────                │  firmware.ino    │                ┌──────────────┐           ┌──────────────┐           ┌──────────────────┐
 Temp ──────► Digital 2   │                  │  USB Serial   │ Auto-detect   │   MQTT    │              │  WS      │ dashboard.html   │
 (Pin D2)                 │  16x2 I2C LCD    │──────────────►│ Arduino port  │──────────►│ broker.benax │◄─────────│ (live web UI)   │
                          │  (scrolling name │   9600 baud   │ Parse temp    │  publish  │     .rw      │ subscribe │                  │
                          │   + temp display)│               │ Publish MQTT  │   topic:  │              │          │ served via       │
                          └──────────────────┘               └──────────────┘    rca/    └──────────────┘          │ http.server on   │
                                                                                  year2c/                          │ VPS [free_port]  │
                                                                                  kawacu/                          └──────────────────┘
                                                                                  temperature
```

| Layer            | Technology                                      |
|------------------|-------------------------------------------------|
| **Sensor**       | DHT11 on Digital Pin 2                          |
| **MCU**          | Arduino Uno, reads every 2s, non-blocking LCD   |
| **Serial**       | 9600 baud, raw float values                     |
| **Gateway**      | Python 3 + pyserial + paho-mqtt                 |
| **Broker**       | `broker.benax.rw` (port 1883)                   |
| **Dashboard**    | MQTT over WebSocket → Paho JS → live HTML/CSS   |
| **Hosting**      | VPS `157.173.101.159` — Python http.server      |

---

## Repository Structure

```
temperature_mqtt_final/
├── firmware/
│   └── firmware.ino           # Arduino Uno firmware
├── pc_client/
│   ├── monitor.py             # Python gateway (serial → MQTT)
│   └── requirements.txt       # pyserial, paho-mqtt
├── vps/
│   └── dashboard.html         # Live web dashboard (MQTT WS)
├── push_to_github.sh          # Git automation script
└── README.md                  # This file
```

---

## Hardware Setup

| Component         | Arduino Connection             |
|-------------------|--------------------------------|
| DHT11 Sensor      | VCC → 5V, GND → GND, Signal → D2 |
| LCD I2C Module    | VCC → 5V, GND → GND, SDA → A4, SCL → A5 |

---

## 1. Firmware — `firmware/firmware.ino`

Open in Arduino IDE. Install libraries via **Tools → Manage Libraries**:
- **LiquidCrystal I2C** by Frank de Brabander
- **DHT sensor library** by Adafruit (includes Adafruit Unified Sensor)

Select board: **Arduino Uno**, pick the correct port, and click **Upload**.

### Behaviour
- **Row 0:** Smoothly scrolls the candidate name (non-blocking via `millis()`)
- **Row 1:** Displays `Temp: XX.XX C` (updated every 2s)
- **Serial:** Outputs the raw float temperature at 9600 baud

---

## 2. Python Gateway — `pc_client/monitor.py`

### Install

```bash
cd pc_client
python3 -m venv venv
source venv/bin/activate       # macOS/Linux
pip install -r requirements.txt
```

### Run

```bash
python3 monitor.py
```

The gateway will:
1. Auto-detect the Arduino serial port (looks for CH340/Arduino/CP210x)
2. Connect to `broker.benax.rw:1883`
3. Display each timestamped reading
4. Publish to topic `rca/year2c/kawacu/temperature`

---

## 3. Web Dashboard — `vps/dashboard.html`

A self-contained single-page dashboard that uses the **Paho MQTT JavaScript** client over **WebSockets** to subscribe to real-time temperature data.

- **Broker:** `broker.benax.rw` (WebSocket port **9001**, path `/ws`)
- **Topic:** `rca/year2c/kawacu/temperature`
- **Features:** Live temperature with °C unit, connection status indicator, last-update timestamp

No build step required — serve it directly with any HTTP server.

---

## 4. Deploy Dashboard to VPS

### Step 1 — Find a free port on the VPS

SSH into the VPS and scan for an available port between 8000–9000:

```bash
ssh [vps_user]@157.173.101.159
for port in $(shuf -i 8000-9000); do
    if ! ss -tuln | grep -q ":$port "; then
        echo "Free port: $port"
        break
    fi
done
```

Replace `[vps_user]` with your VPS username (e.g. `user252`).

### Step 2 — Create the target directory

```bash
ssh [vps_user]@157.173.101.159 "mkdir -p /home/[vps_user]/examination"
```

### Step 3 — Upload the dashboard

```bash
scp vps/dashboard.html [vps_user]@157.173.101.159:/home/[vps_user]/examination/
```

### Step 4 — Start the HTTP server in the background

```bash
ssh [vps_user]@157.173.101.159 "cd /home/[vps_user]/examination && nohup python3 -m http.server [FREE_PORT] > server.log 2>&1 &"
```

Replace `[FREE_PORT]` with the port number found in Step 1.

### Step 5 — Access the dashboard

```
http://157.173.101.159:[FREE_PORT]/dashboard.html
```

---

## 5. Git Automation — `push_to_github.sh`

A single-command script to stage, commit, and push the entire repository:

```bash
./push_to_github.sh
```

It will:
1. Initialize git if not already done
2. Set remote to `https://github.com/kawacukennedy/temperature_mqtt_final.git`
3. Stage all files (`git add -A`)
4. Commit with a descriptive message
5. Push to the `main` branch

---

## Quick Reference

| Item                            | Value                                                  |
|---------------------------------|--------------------------------------------------------|
| MQTT Broker (native)            | `broker.benax.rw:1883`                                 |
| MQTT Broker (WebSocket)         | `broker.benax.rw:9001` (path `/ws`)                    |
| MQTT Topic                      | `rca/year2c/kawacu/temperature`                         |
| Serial baud rate                | 9600                                                   |
| DHT11 data pin                  | Digital 2                                              |
| LCD I2C address                 | Auto-detected (0x27 / 0x3F)                            |
| VPS address                     | `157.173.101.159`                                      |
| VPS target directory            | `/home/[vps_user]/examination`                          |
| Live dashboard URL              | `http://157.173.101.159:[PORT]/dashboard.html`          |
| GitHub repository               | https://github.com/kawacukennedy/temperature_mqtt_final.git |

---

## End-to-End Flow

```
1. DHT11 reads temperature every 2s
       │
2. Arduino Uno processes & displays on LCD
       │
3. Arduino sends raw float over USB Serial (9600 baud)
       │
4. monitor.py auto-detects port, reads line, parses float
       │
5. monitor.py publishes to broker.benax.rw topic rca/year2c/kawacu/temperature
       │
6. dashboard.html (Paho JS over WebSocket) receives the update live
       │
7. Browser displays the temperature with °C in real time
```
