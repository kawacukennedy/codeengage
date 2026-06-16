#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11
#define LCD_ADDR 0x27

#define TEMP_INTERVAL 2000
#define SCROLL_INTERVAL 350

const char CANDIDATE_NAME[] = "KAWACU RUGIRANEZA Arnaud Kennedy";
const int NAME_LEN = sizeof(CANDIDATE_NAME) - 1;

LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);
DHT dht(DHTPIN, DHTTYPE);

unsigned long lastTempRead = 0;
unsigned long lastScroll = 0;
int scrollIndex = 0;

void tryInitLCD() {
  byte addresses[] = {0x27, 0x3F, 0x20, 0x21, 0x26, 0x38};
  for (int i = 0; i < 6; i++) {
    Wire.beginTransmission(addresses[i]);
    if (Wire.endTransmission() == 0) {
      lcd = LiquidCrystal_I2C(addresses[i], 16, 2);
      lcd.init();
      lcd.backlight();
      return;
    }
  }
  lcd.init();
  lcd.backlight();
}

void setup() {
  Serial.begin(9600);
  dht.begin();
  Wire.begin();
  tryInitLCD();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  Initializing..");
  delay(1000);
}

void loop() {
  unsigned long now = millis();

  if (now - lastTempRead >= TEMP_INTERVAL) {
    lastTempRead = now;

    float t = dht.readTemperature();

    lcd.setCursor(0, 1);
    char buf[17];
    if (isnan(t)) {
      Serial.println("ERR");
      strcpy(buf, "Sensor Error!   ");
    } else {
      Serial.println(t, 2);
      char tempStr[7];
      dtostrf(t, 5, 2, tempStr);
      snprintf(buf, sizeof(buf), "Temp: %s C", tempStr);
      int len = strlen(buf);
      while (len < 16) buf[len++] = ' ';
      buf[16] = '\0';
    }
    lcd.print(buf);
  }

  if (now - lastScroll >= SCROLL_INTERVAL) {
    lastScroll = now;

    lcd.setCursor(0, 0);

    int displayLen = 16;
    char displayBuf[17];

    for (int i = 0; i < displayLen; i++) {
      int srcIdx = (scrollIndex + i) % NAME_LEN;
      displayBuf[i] = CANDIDATE_NAME[srcIdx];
    }
    displayBuf[displayLen] = '\0';

    lcd.print(displayBuf);

    scrollIndex++;
    if (scrollIndex >= NAME_LEN) {
      scrollIndex = 0;
    }
  }
}
