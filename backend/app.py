from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)

@app.route("/get_download_link", methods=["POST"])
def get_download_link():
    data = request.json
    video_url = data.get("url")
    format_type = data.get("format", "mp4")
    quality = data.get("quality", "best")

    if not video_url:
        return jsonify({"error": "No URL provided"}), 400

    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "format": "bestaudio/best" if format_type == "mp3" else f"bestvideo[height<={quality}]+bestaudio/best/best",
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            return jsonify({
                "title": info.get("title"),
                "stream_url": info.get("url"),
                "ext": info.get("ext"),
                "thumbnail": info.get("thumbnail")
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/", methods=["GET"])
def root():
    return jsonify({"message": "StreamXtract backend is live!"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
