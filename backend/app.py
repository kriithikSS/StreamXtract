from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
import traceback

app = Flask(__name__)
CORS(app)  # allow frontend calls from Vercel

@app.route("/get_download_link", methods=["POST"])
def get_download_link():
    try:
        data = request.json
        video_url = data.get("url")
        format_type = data.get("format", "mp4")
        quality = data.get("quality", "best")

        if not video_url:
            return jsonify({"error": "No URL provided"}), 400

        # yt_dlp settings for lightweight info extraction
        if format_type == "mp3":
            ydl_opts = {
                "quiet": True,
                "nocheckcertificate": True,
                "format": "bestaudio/best",
                "skip_download": True,
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                }],
            }
        else:
            video_format = (
                "bestvideo+bestaudio/best"
                if quality == "best"
                else f"bestvideo[height<={quality}]+bestaudio/best/best"
            )
            ydl_opts = {
                "quiet": True,
                "nocheckcertificate": True,
                "format": video_format,
                "skip_download": True,
            }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)

            # Handle playlists
            if "entries" in info:
                info = info["entries"][0]

            stream_url = info.get("url")
            if not stream_url:
                return jsonify({"error": "No direct stream URL found"}), 500

            return jsonify({
                "title": info.get("title", "video"),
                "stream_url": stream_url,
                "ext": info.get("ext", "mp4"),
                "thumbnail": info.get("thumbnail")
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
