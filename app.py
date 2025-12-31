import os
from flask import Flask, request, jsonify
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
import time

app = Flask(__name__)

@app.route('/extract', methods=['GET'])
def extract():
    movie_url = request.args.get('url')
    if not movie_url:
        return jsonify({"error": "No URL provided"}), 400

    options = uc.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    try:
        driver = uc.Chrome(options=options)
        driver.get(movie_url)
        time.sleep(8) 
        
        # محاولة صيد رابط الفيديو من وسم video
        video = driver.find_element(By.TAG_NAME, "video")
        link = video.get_attribute("src")
        
        return jsonify({"direct_link": link, "status": "success"})
    except Exception as e:
        return jsonify({"error": str(e), "status": "failed"})
    finally:
        try:
            driver.quit()
        except:
            pass

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
