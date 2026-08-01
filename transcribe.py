
import os
from groq import Groq

client = Groq(api_key = "")
filename = "audio.wav"

with open(filename, "rb") as file:
    transcription = client.audio.transcriptions.create(
      file=(filename, file.read()),
      model="whisper-large-v3",
      temperature=0,
      response_format="verbose_json",
      language="ml",
    )
    print(transcription.text)
      