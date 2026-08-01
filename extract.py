import subprocess
import imageio_ffmpeg

def extract_audio(video_path, output_path):
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    subprocess.run([
        ffmpeg,
        "-y",
        "-i", video_path,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        output_path
    ], check=True)

extract_audio(r"C:\Users\Surya Narayanan K V\yukti_sync\downloads\2026-02-01_04-42-19_UTC.mp4", "audio.wav")