import whisper
import tempfile
import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import subprocess 
from fastapi.responses import Response

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Загружаем модель Whisper...")
model = whisper.load_model("base")
print("Модель загружена!")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = Form("ru")):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        result = model.transcribe(tmp_path, language=language)
        return {"text": result["text"], "segments": result["segments"]}
    finally:
        os.unlink(tmp_path)

@app.post("/extract-audio")
async def extract_audio(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_video:
        content = await file.read()
        tmp_video.write(content)
        tmp_video_path = tmp_video.name

    tmp_audio_path = tmp_video_path.replace(".mp4", ".mp3")

    try:
        subprocess.run([
            "ffmpeg", "-i", tmp_video_path,
            "-vn",           
            "-acodec", "mp3",
            "-q:a", "2",   
            tmp_audio_path
        ], check=True, capture_output=True)

        with open(tmp_audio_path, "rb") as f:
            audio_data = f.read()

        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={"Content-Disposition": f"attachment; filename=audio.mp3"}
        )
    finally:
        os.unlink(tmp_video_path)
        if os.path.exists(tmp_audio_path):
            os.unlink(tmp_audio_path)