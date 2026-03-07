require('./webtorrent.js');

var shareBtn = document.getElementById('share-url-btn');
var shareUrl = document.getElementById('share-url');

shareBtn.addEventListener('click', function () {
    navigator.clipboard.writeText(shareUrl.value).then(function () {
        shareBtn.dataset.tooltip = 'Copied!';
        shareBtn.classList.add('tooltip-visible');
    });
});

shareBtn.addEventListener('mouseleave', function () {
    shareBtn.dataset.tooltip = 'Copy to clipboard';
    shareBtn.classList.remove('tooltip-visible');
});

shareUrl.value = window.location.href;
