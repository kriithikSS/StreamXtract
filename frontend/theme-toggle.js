document.addEventListener("DOMContentLoaded", function () {
    // Add theme toggle HTML to the container
    const container = document.querySelector('.container');
    const themeSwitch = document.createElement('div');
    themeSwitch.className = 'theme-switch-wrapper';
    themeSwitch.innerHTML = `
        <label class="theme-switch" for="checkbox">
            <input type="checkbox" id="checkbox" />
            <span class="slider"></span>
        </label>
        <span class="theme-icon">🌙</span>
    `;
    container.appendChild(themeSwitch);

    const checkbox = document.getElementById('checkbox');
    const themeIcon = document.querySelector('.theme-icon');
    
    // ✅ Check for saved theme preference or use device preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        checkbox.checked = currentTheme === 'light';
        themeIcon.textContent = currentTheme === 'light' ? '☀️' : '🌙';
    } else {
        const prefersDark = prefersDarkScheme.matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        checkbox.checked = !prefersDark;
        themeIcon.textContent = prefersDark ? '🌙' : '☀️';
    }

    // ✅ Function to toggle between light and dark themes
    function switchTheme(e) {
        const newTheme = e.target.checked ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeIcon.textContent = newTheme === 'light' ? '☀️' : '🌙';
    }

    // ✅ Add event listener to the theme toggle
    checkbox.addEventListener('change', switchTheme);
    
    // ✅ Add "quality badge" for the best quality checkbox
    const bestQualityCheckbox = document.getElementById('bestQuality');
    const bestQualityLabel = bestQualityCheckbox.parentElement;

    const qualityBadge = document.createElement('span');
    qualityBadge.className = 'quality-badge';
    qualityBadge.textContent = 'BEST QUALITY';
    bestQualityLabel.appendChild(qualityBadge);

    // ✅ Show/hide the badge dynamically
    bestQualityCheckbox.addEventListener('change', function () {
        qualityBadge.style.opacity = this.checked ? '1' : '0';
    });

    // ✅ Add animation to the download button
    const downloadButton = document.querySelector('button');
    downloadButton.addEventListener('mouseover', function () {
        this.style.boxShadow = '0 5px 15px rgba(255, 0, 0, 0.3)';
    });

    downloadButton.addEventListener('mouseout', function () {
        this.style.boxShadow = 'none';
    });

    // ✅ Enhance existing functionality in script.js
    const originalDownloadVideo = window.downloadVideo;
    window.downloadVideo = async function () {
        downloadButton.textContent = 'Processing...';
        downloadButton.disabled = true;

        try {
            await originalDownloadVideo();

            // ✅ Animate success
            setTimeout(() => {
                downloadButton.textContent = 'Download Complete!';
                setTimeout(() => {
                    downloadButton.textContent = 'Download';
                    downloadButton.disabled = false;
                }, 2000);
            }, 500);

        } catch (error) {
            console.error("Download Error:", error);
            downloadButton.textContent = 'Try Again';
            downloadButton.disabled = false;
        }
    };

    // ✅ Subtle animation to input fields on focus
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', function () {
            this.style.transform = 'scale(1.02)';
        });

        input.addEventListener('blur', function () {
            this.style.transform = 'scale(1)';
        });
    });

    console.log("✅ Theme Toggle & UI Enhancements Loaded!");
});
