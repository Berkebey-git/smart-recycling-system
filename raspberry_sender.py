"""
Bu dosya ne işe yarar:
Raspberry Pi üzerinde çalışarak geri dönüşüm verisini backend API'ye belirli aralıklarla gönderir.
"""

import random
import time
import requests

# Bu değişken ne yapar:
# Backend API adresini tutar. Backend farklı cihazdaysa IP adresini buna göre değiştirin.
API_URL = "http://127.0.0.1:5000/api/data"


# Bu fonksiyon ne yapar:
# Sensör verisini simüle etmek için rastgele type, weight ve fillLevel üretir.
def generate_mock_sensor_data():
    waste_type = random.choice(["plastic", "paper", "glass"])
    weight = round(random.uniform(0.1, 3.0), 2)
    fill_level = random.randint(0, 100)

    return {
        "type": waste_type,
        "weight": weight,
        "fillLevel": fill_level,
    }


# Bu fonksiyon ne yapar:
# Üretilen veriyi backend'e POST isteği ile gönderir ve sunucu yanıtını ekrana yazdırır.
def send_data_to_api():
    data = generate_mock_sensor_data()

    try:
        response = requests.post(API_URL, json=data, timeout=5)

        print("Gonderilen veri:", data)
        print("Durum kodu:", response.status_code)
        print("Sunucu yaniti:", response.json())
        print("-" * 50)
    except requests.RequestException as error:
        # Burada ne yapılıyor:
        # Ağ hatası veya sunucuya erişim sorunu olursa program çökmemesi için hata yakalanır.
        print("Istek hatasi:", error)
        print("-" * 50)


# Bu bölüm ne yapar:
# Program sürekli çalışır, her 5 saniyede bir veriyi API'ye gönderir.
if __name__ == "__main__":
    while True:
        send_data_to_api()
        time.sleep(5)
