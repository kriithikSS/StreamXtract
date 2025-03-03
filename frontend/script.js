// Global variable to store download progress
let downloadProgress = null;

// Create progress bar container function
function createProgressBar() {
    // Remove existing progress bar if any
    removeProgressBar();
    
    const container = document.querySelector('.container');
    
    // Create progress container
    downloadProgress = document.createElement('div');
    downloadProgress.className = 'progress-container';
    downloadProgress.innerHTML = `
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
        <div class="progress-text">0%</div>
    `;
    
    // Insert before status element
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
    
    // Add pulse animation when close to completion
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

// Progress polling variables
let progressInterval = null;
let progressCounter = 0;

// Start progress polling
function startProgressPolling(videoURL) {
    // Reset counter
    progressCounter = 0;
    
    // Clear any existing interval
    stopProgressPolling();
    
    // Create a new polling interval
    progressInterval = setInterval(() => {
        // Simulate progress with diminishing returns curve
        // This gives a realistic feeling of progress slowing down as it approaches completion
        if (progressCounter < 95) {
            // Initially fast, then slows down
            const increment = Math.max(0.5, 5 * Math.exp(-progressCounter / 20));
            progressCounter = Math.min(95, progressCounter + increment);
            updateProgressBar(progressCounter);
        }
        
        // Make a real request to check actual progress
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
        // Make a lightweight request to the server to check progress
        const response = await fetch("/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: videoURL })
        });
        
        const data = await response.json();
        
        if (data.progress && !isNaN(data.progress)) {
            // Use the actual progress from the server if it's higher than our estimate
            if (data.progress > progressCounter) {
                progressCounter = data.progress;
                updateProgressBar(progressCounter);
            }
        }
    } catch (error) {
        // Silently fail - we'll continue using the simulated progress
        console.log("Progress check failed, using simulation", error);
    }
}

// Extract YouTube video ID from URL
function extractVideoId(url) {
    if (!url) return null;
    
    // Handle standard YouTube URLs
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// Fetch video details from YouTube (thumbnail and title)
async function fetchVideoDetails(videoId) {
    if (!videoId) return null;
    
    // Initialize elements
    const thumbnailImg = document.getElementById('videoThumbnail');
    const titleDiv = document.getElementById('videoTitle');
    const container = document.getElementById('thumbnailContainer');
    
    try {
        // Set the high-quality thumbnail
        thumbnailImg.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        thumbnailImg.classList.remove('hidden');
        
        // Fetch video info from our backend
        const response = await fetch("/video-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId: videoId })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.title) {
                titleDiv.textContent = data.title;
            } else {
                titleDiv.textContent = "Video found";
            }
        } else {
            titleDiv.textContent = "Video found";
        }
        
        // Show the container with animation
        container.classList.add('visible');
        return true;
    } catch (error) {
        console.error("Error fetching video details:", error);
        return false;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const bestQualityCheckbox = document.getElementById("bestQuality");
    const qualityDropdown = document.getElementById("quality");
    const formatSelect = document.getElementById("format");
    const videoURLInput = document.getElementById("videoURL");
    const thumbnailContainer = document.getElementById("thumbnailContainer");

    // Set up input event listener for video URL
    videoURLInput.addEventListener("input", debounce(function() {
        const url = this.value.trim();
        const videoId = extractVideoId(url);
        
        if (videoId) {
            fetchVideoDetails(videoId);
        } else {
            // Hide thumbnail if URL is not valid
            thumbnailContainer.classList.remove('visible');
        }
    }, 500));
    
    // Define quality options for MP4 and MP3
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

    // Function to update quality options based on format
    function updateQualityOptions() {
        if (!qualityDropdown) return;

        qualityDropdown.innerHTML = ""; // Clear existing options
        const selectedFormat = formatSelect.value;
        const qualities = selectedFormat === "mp3" ? mp3Qualities : mp4Qualities;

        qualities.forEach(option => {
            const opt = document.createElement("option");
            opt.value = option.value;
            opt.textContent = option.text;
            qualityDropdown.appendChild(opt);
        });

        // Automatically select the highest quality if "Best Quality" is checked
        if (bestQualityCheckbox.checked) {
            qualityDropdown.value = qualities[qualities.length - 1].value;
            qualityDropdown.disabled = true;
        } else {
            qualityDropdown.disabled = false;
        }
    }

    // Handle "Always Download Best Quality" checkbox
    bestQualityCheckbox.addEventListener("change", function () {
        updateQualityOptions();
        qualityDropdown.disabled = this.checked;
    });

    // Update quality options when format changes
    formatSelect.addEventListener("change", updateQualityOptions);

    // Initialize quality options on page load
    setTimeout(updateQualityOptions, 100);
    updateQualityOptions();
    
    console.log("✅ Script initialized!");
});

// Debounce function to prevent excessive API calls
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

// Single, combined downloadVideo function
// Single, combined downloadVideo function
async function downloadVideo() {
    const videoURL = document.getElementById("videoURL").value;
    const format = document.getElementById("format").value;
    const bestQuality = document.getElementById("bestQuality").checked;
    let quality = document.getElementById("quality").value;
    const status = document.getElementById("status");
    const downloadButton = document.querySelector('button');

    if (!videoURL) {
        status.innerText = "⚠️ Please enter a YouTube video URL!";
        return;
    }

    // Create and show progress bar
    createProgressBar();
    updateProgressBar(0);
    
    status.innerText = "⏳ Processing download...";
    
    downloadButton.textContent = 'Processing...';
    downloadButton.disabled = true;

    // Ensure correct quality selection
    if (bestQuality) {
        quality = format === "mp3" ? "320k" : "1080";
    }

    try {
        // Start progress polling
        startProgressPolling(videoURL);
        
        const response = await fetch("/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: videoURL, format, quality })
        });
        
        // Stop progress polling
        stopProgressPolling();
        
        // Complete the progress bar
        updateProgressBar(100);
        
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            // Handle playlist downloads
            const result = await response.json();
            if (result.error) throw new Error(result.error);

            if (Array.isArray(result.files)) {
                // For playlists with tokens
                result.files.forEach(file => {
                    const link = document.createElement("a");
                    link.href = `/playlist-download/${file.token}`;
                    link.download = file.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });

                status.innerText = "✅ Playlist downloaded successfully!";
                
                // Remove progress bar after a brief delay
                setTimeout(removeProgressBar, 2000);
            }
        } else {
            // Single file: Download directly from stream
            const blob = await response.blob();
            const fileURL = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = fileURL;

            // Try to extract a filename from the Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'download';
            
            if (contentDisposition) {
                const matches = /filename="?([^"]*)"?/.exec(contentDisposition);
                if (matches && matches[1]) {
                    filename = matches[1];
                } else {
                    filename = `download.${format}`;
                }
            } else {
                filename = `download.${format}`;
            }
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(fileURL);

            status.innerText = "✅ Download complete!";
            
            // Remove progress bar after a brief delay
            setTimeout(removeProgressBar, 2000);
        }
        
        // Reset button
        setTimeout(() => {
            downloadButton.textContent = 'Download';
            downloadButton.disabled = false;
        }, 2000);

    } catch (error) {
        // Stop progress polling on error
        stopProgressPolling();
        
        // Remove progress bar
        removeProgressBar();
        
        status.innerText = "❌ Error occurred!";
        console.error(error);
        
        // Reset button
        downloadButton.textContent = 'Try Again';
        downloadButton.disabled = false;
    }
}