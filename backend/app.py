from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
import traceback

app = Flask(__name__)
CORS(app)

@app.route("/get_download_link", methods=["POST"])
def get_download_link():
    try:
        data = request.json
        video_url = data.get("url")
        format_type = data.get("format", "mp4")
        quality = data.get("quality", "best")

        if not video_url:
            return jsonify({"error": "No URL provided"}), 400

        # Force yt_dlp to act like a browser to avoid 403s
        common_opts = {
            "quiet": True,
            "nocheckcertificate": True,
            "skip_download": True,
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept-Language": "en-US,en;q=0.9",
            },
        }

        if format_type == "mp3":
            ydl_opts = {**common_opts, "format": "bestaudio/best"}
        else:
            # Choose quality dynamically
            if quality == "best":
                fmt = "bestvideo+bestaudio/best"
            else:
                try:
                    q = int(quality)
                    fmt = f"bestvideo[height<={q}]+bestaudio/best/best"
                except ValueError:
                    fmt = "bestvideo+bestaudio/best"
            ydl_opts = {**common_opts, "format": fmt}

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            if "entries" in info:
                info = info["entries"][0]

            # Primary URL
            stream_url = info.get("url")

            # Fallback: grab first usable format
            if not stream_url and "formats" in info:
                for f in reversed(info["formats"]):
                    if f.get("url") and f.get("acodec") != "none":
                        stream_url = f["url"]
                        break

            if not stream_url:
                return jsonify({"error": "No direct stream URL found"}), 500

            return jsonify({
                "title": info.get("title", "video"),
                "stream_url": stream_url,
                "ext": info.get("ext", "mp4"),
                "thumbnail": info.get("thumbnail"),
            })

    except Exception as e:
        print("=== ERROR ===")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/", methods=["GET"])
def root():
    return jsonify({"message": "StreamXtract backend is live!"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
