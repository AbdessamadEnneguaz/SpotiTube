# SpotiTube - Local Music Discovery Platform (Zero API Key)

A full-stack, personal media discovery platform inspired by Spotify. It pairs a **Python Flask backend** (with keyless search powered by `yt-dlp` metadata extraction) with a sleek **Vanilla JavaScript frontend** that controls official playback using the **YouTube IFrame Player API**.

---

## 🚀 Step-by-Step Terminal Launch Instructions

### 1. Requirements
- Python 3.8+
- Modern Web Browser (Chrome, Edge, Firefox, Safari)

### 2. Setup Virtual Environment
Open your terminal in this directory:
```bash
# Create a virtual environment
python3 -m venv venv

# Activate it:
# On Linux / macOS:
source venv/bin/activate

# On Windows (cmd.exe):
venv\Scripts\activate.bat

# On Windows (PowerShell):
venv\Scripts\Activate.ps1
```

### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 4. No API Key Required!
No YouTube Data API key is needed. The Python backend searches video IDs and metadata directly using `yt-dlp` (`extract_flat: in_playlist, skip_download: True`), keeping playback 100% compliant via the official YouTube IFrame Player API.

### 5. Start the Local Server
```bash
python app.py
```

### 6. Enjoy SpotiTube
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 🛠 Features & Architecture
- **Zero API Key Needed**: Instant queries for any global or regional tracks (Moroccan Chaabi, Rai, Rap, Pop).
- **Official YouTube IFrame Player**: Audio and video rendering is processed via YouTube's official embedded player (`window.YT.Player`), adhering to terms of service.
- **Custom Spotify Control Interface**: Custom buttons (Play, Pause, Skip, Seekbar, Volume) directly map to YouTube player API methods (`playVideo()`, `pauseVideo()`, `seekTo()`, `setVolume()`).
