// Global variable to store download progress
let downloadProgress = null;
let progressInterval = null;
let progressCounter = 0;

// Create progress bar container function
function createProgressBar() {
    removeProgressBar();
    const container = document.querySelector('.container');
    downloadProgress = document.createElement('div');
    downloadProgress.className = 'progress-container';
    downloadProgress.innerHTML = `
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
        <div class="progress-text">0%</div>
    `;
    const statusElement = document.getElementById('status');
    container.insertBefore(downloadProgress, statusElement);
    return downloadProgress;
}

// Update progress bar function
function updateProgressBar(percent) {
    if (!downloadProgress) return;
    const progressFill = downloadProgress.querySelector('.progress-fill');
    const progressText = downloadProgress.querySelector('.progress-text');
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${Math.round(percent)}%`;
    if (percent > 90) {
        progressFill.classList.add('pulse');
    } else {
        progressFill.classList.remove('pulse');
    }
}

// Remove progress bar function
function removeProgressBar() {
    if (downloadProgress && downloadProgress.parentNode) {
        downloadProgress.parentNode.removeChild(downloadProgress);
        downloadProgress = null;
    }
}

// Start progress polling
function startProgressPolling(videoURL) {
    progressCounter = 0;
    stopProgressPolling();
    progressInterval = setInterval(() => {
        if (progressCounter < 95) {
            const increment = Math.max(0.5, 5 * Math.exp(-progressCounter / 20));
            progressCounter = Math.min(95, progressCounter + increment);
            updateProgressBar(progressCounter);
        }
        checkActualProgress(videoURL);
    }, 200);
}

// Stop progress polling
function stopProgressPolling() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

// Check actual progress from the server
async function checkActualProgress(videoURL) {
    try {
        const response = await fetch("/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: videoURL })
        });
        const data = await response.json();
        if (data.progress && !isNaN(data.progress) && data.progress > progressCounter) {
            progressCounter = data.progress;
            updateProgressBar(progressCounter);
        }
    } catch (error) {
        console.log("Progress check failed, using simulation", error);
    }
}

// Extract YouTube video ID from URL
function extractVideoId(url) {
    if (!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// Fetch video details from YouTube
async function fetchVideoDetails(videoId) {
    if (!videoId) return null;
    const thumbnailImg = document.getElementById('videoThumbnail');
    const titleDiv = document.getElementById('videoTitle');
    const container = document.getElementById('thumbnailContainer');
    try {
        thumbnailImg.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        thumbnailImg.classList.remove('hidden');
        const response = await fetch("/video-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId: videoId })
        });
        if (response.ok) {
            const data = await response.json();
            titleDiv.textContent = data.title || "Video found";
        } else {
            titleDiv.textContent = "Video found";
        }
        container.classList.add('visible');
        return true;
    } catch (error) {
        console.error("Error fetching video details:", error);
        return false;
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Initialize page elements and events
document.addEventListener("DOMContentLoaded", function () {
    const bestQualityCheckbox = document.getElementById("bestQuality");
    const qualityDropdown = document.getElementById("quality");
    const formatSelect = document.getElementById("format");
    const videoURLInput = document.getElementById("videoURL");
    const thumbnailContainer = document.getElementById("thumbnailContainer");

    const mp4Qualities = [
        { value: "360", text: "360p" },
        { value: "720", text: "720p" },
        { value: "1080", text: "1080p" }
    ];
    const mp3Qualities = [
        { value: "128k", text: "128kbps" },
        { value: "192k", text: "192kbps" },
        { value: "320k", text: "320kbps" }
    ];

    function updateQualityOptions() {
        if (!qualityDropdown) return;
        qualityDropdown.innerHTML = "";
        const selectedFormat = formatSelect.value;
        const qualities = selectedFormat === "mp3" ? mp3Qualities : mp4Qualities;

        // Add "Best Quality" option
        const bestOption = document.createElement("option");
        bestOption.value = "best";
        bestOption.textContent = "Best Quality";
        qualityDropdown.appendChild(bestOption);

        qualities.forEach(option => {
            const opt = document.createElement("option");
            opt.value = option.value;
            opt.textContent = option.text;
            qualityDropdown.appendChild(opt);
        });

        if (bestQualityCheckbox.checked) {
            qualityDropdown.value = "best";
            qualityDropdown.disabled = true;
        } else {
            qualityDropdown.disabled = false;
        }
    }

    bestQualityCheckbox.addEventListener("change", function () {
        updateQualityOptions();
        qualityDropdown.disabled = this.checked;
    });
    formatSelect.addEventListener("change", updateQualityOptions);

    videoURLInput.addEventListener("input", debounce(function() {
        const url = this.value.trim();
        const videoId = extractVideoId(url);
        if (videoId) fetchVideoDetails(videoId);
        else thumbnailContainer.classList.remove('visible');
    }, 500));

    setTimeout(updateQualityOptions, 100);
    updateQualityOptions();
});

// Download video/audio function
async function downloadVideo() {
  const videoURL = document.getElementById("videoURL").value;
  const format = document.getElementById("format").value;
  const quality = document.getElementById("quality").value;
  const bestQuality = document.getElementById("bestQuality").checked;
  const status = document.getElementById("status");
  const button = document.querySelector("button");

  if (!videoURL) {
    status.textContent = "⚠️ Please enter a YouTube URL!";
    return;
  }

  status.textContent = "⏳ Fetching download link...";
  button.disabled = true;

  try {
    const response = await fetch("http://127.0.0.1:5000/get_download_link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: videoURL,
        format,
        quality: bestQuality ? "best" : quality
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    // Direct browser download
    const a = document.createElement("a");
    a.href = data.stream_url;
    a.download = `${data.title || "video"}.${data.ext || format}`;
    a.target = "_blank";
    a.click();

    status.textContent = "✅ Ready! Your browser will start the download.";
  } catch (err) {
    console.error(err);
    status.textContent = "❌ Error fetching link!";
  } finally {
    button.disabled = false;
  }
}

