# اختيار نسخة بايثون
FROM python:3.9-slim

# تثبيت المتصفح والملفات الضرورية آلياً
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# ضبط مكان العمل وتثبيت المكتبات
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt

# أمر تشغيل السيرفر
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:10000"]
