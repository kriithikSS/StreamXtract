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

        # ✅ Handle mp3 vs mp4 separately
        if format_type == "mp3":
            ydl_opts = {
                "quiet": True,
                "nocheckcertificate": True,
                "skip_download": True,
                "format": "bestaudio/best",
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                }],
            }
        else:
            # ✅ If user chooses “best”, don’t use a numeric filter
            if quality == "best":
                video_format = "bestvideo+bestaudio/best"
            else:
                # ✅ Only use height filter when it's numeric (e.g., 720, 1080)
                try:
                    int_quality = int(quality)
                    video_format = f"bestvideo[height<={int_quality}]+bestaudio/best/best"
                except ValueError:
                    video_format = "bestvideo+bestaudio/best"

            ydl_opts = {
                "quiet": True,
                "nocheckcertificate": True,
                "skip_download": True,
                "format": video_format,
            }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
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
