# CV-JD Matching API

API để so sánh CV và Job Description sử dụng OpenAI để phân tích và đánh giá độ phù hợp.

## Tính năng

- Upload và phân tích file CV (PDF/DOCX)
- Upload và phân tích file Job Description (PDF/DOCX)
- So sánh CV với JD và tính điểm phù hợp
- Đưa ra gợi ý cải thiện

## Cài đặt và chạy

### 1. Clone dự án
```bash
git clone <repository-url>
cd cv_match
```

### 2. Tạo file .env
```bash
cp .env.example .env
```

Sửa file `.env` và thêm OpenAI API key:
```
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### 3. Chạy bằng Docker
```bash
docker-compose up --build
```

API sẽ chạy tại: http://localhost:8000

## API Endpoints

### 1. Upload CV
```
POST /upload/cv
Content-Type: multipart/form-data
Body: file (PDF hoặc DOCX)
```

### 2. Upload Job Description
```
POST /upload/jd
Content-Type: multipart/form-data
Body: file (PDF hoặc DOCX)
```

### 3. So sánh CV và JD
```
POST /compare
Content-Type: application/json
Body: {
  "cv_data": {...},
  "jd_data": {...}
}
```

### 4. API Documentation
Swagger UI: http://localhost:8000/docs

## Cấu trúc dự án

```
cv_match/
├── app/
│   ├── models/
│   │   └── schemas.py          # Pydantic models
│   ├── services/
│   │   ├── file_processor.py   # Xử lý file PDF/DOCX
│   │   ├── openai_service.py   # Tích hợp OpenAI
│   │   └── comparison_service.py # Logic so sánh
│   └── main.py                 # FastAPI app
├── uploads/                    # Thư mục lưu file tạm
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

## Ví dụ sử dụng

1. Upload CV và nhận structured data
2. Upload JD và nhận structured data  
3. Gọi API compare với data từ bước 1,2 để nhận kết quả so sánh

Kết quả so sánh bao gồm:
- Điểm phù hợp tổng thể (0-1)
- Chi tiết về kỹ năng khớp/thiếu
- Đánh giá kinh nghiệm và học vấn
- Gợi ý cải thiện