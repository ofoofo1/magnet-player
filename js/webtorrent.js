function formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    var units = ['B', 'kB', 'MB', 'GB', 'TB']
    var i = Math.floor(Math.log(bytes) / Math.log(1000))
    return parseFloat((bytes / Math.pow(1000, i)).toFixed(1)) + ' ' + units[i]
}

function formatDuration(seconds) {
    if (seconds < 60) return seconds + ' seconds'
    if (seconds < 3600) return Math.round(seconds / 60) + ' minutes'
    if (seconds < 86400) return Math.round(seconds / 3600) + ' hours'
    return Math.round(seconds / 86400) + ' days'
}

// HTML elements
var body = document.body
var progressBar = document.getElementById('progressBar')
var streamedFileName = document.getElementById('streamedFileName')
var numPeers = document.getElementById('numPeers')
var downloaded = document.getElementById('downloaded')
var total = document.getElementById('total')
var remaining = document.getElementById('remaining')
var uploadSpeed = document.getElementById('uploadSpeed')
var downloadSpeed = document.getElementById('downloadSpeed')

var announceList = [
    ['udp://tracker.openbittorrent.com:80'],
    ['udp://tracker.opentrackr.org:1337'],
    ['wss://tracker.openwebtorrent.com'],
    ['wss://tracker.webtorrent.dev'],
    ['wss://tracker.files.fm:7073/announce'],
]

window.WEBTORRENT_ANNOUNCE = announceList
    .map(function (arr) {
        return arr[0]
    })
    .filter(function (url) {
        return url.indexOf('wss://') === 0 || url.indexOf('ws://') === 0
    })

var client = new WebTorrent()
var ready = false

client.on('error', function (err) {
    console.error('ERROR: ' + err.message)
})

// Register service worker and create server for streaming
navigator.serviceWorker.register('sw.min.js', { scope: './' })
    .then(function () {
        return navigator.serviceWorker.ready
    })
    .then(function (registration) {
        var sw = registration.active || registration.installing || registration.waiting
        if (sw.state === 'activated') {
            return registration
        }
        return new Promise(function (resolve) {
            sw.addEventListener('statechange', function () {
                if (sw.state === 'activated') resolve(registration)
            })
        })
    })
    .then(function (controller) {
        client.createServer({ controller: controller })
        ready = true

        // Process any pending downloads
        onHashChange()
    })
    .catch(function (err) {
        console.error('Service worker registration failed:', err)
    })

// Download by form input
document.getElementById('magnet-input').addEventListener('submit', function (e) {
    e.preventDefault()
    if (!ready) return

    var torrentId = document.querySelector('#magnet-input input[name=torrentId]').value

    if (torrentId.length > 0)
        downloadTorrent(torrentId)
})

// Download by URL hash
window.addEventListener('hashchange', onHashChange)
function onHashChange() {
    if (!ready) return
    var hash = decodeURIComponent(window.location.hash.substring(1)).trim()
    if (hash !== '') downloadTorrent(hash)
}

function downloadTorrent(torrentId) {
    console.log('Downloading torrent from ' + torrentId)
    client.add(torrentId, onTorrent)
}

function onTorrent(torrent) {
    torrent.on('warning', console.log)
    torrent.on('error', console.log)

    console.log('Got torrent metadata!')

    // Find largest file
    var largestFile = torrent.files[0]
    for (var i = 1; i < torrent.files.length; i++) {
        if (torrent.files[i].length > largestFile.length)
            largestFile = torrent.files[i]
    }

    // Display name of the file being streamed
    streamedFileName.textContent = largestFile.name

    // Update clipboard share url
    document.getElementById('share-url').value = window.location.origin + window.location.pathname + '#' + torrent.infoHash

    // Stream the file in the browser
    var video = document.createElement('video')
    video.controls = true
    video.autoplay = true
    document.getElementById('output').appendChild(video)
    largestFile.streamTo(video)

    // hide magnet input
    document.getElementById('magnet-input').hidden = true

    // show player
    document.getElementById('hero').style.display = 'block'

    // Trigger statistics refresh
    torrent.on('done', onDone)
    var progressInterval = setInterval(onProgress, 500)
    onProgress()

    // Statistics
    function onProgress() {
        // Peers
        numPeers.textContent = torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers')

        // Progress
        var percent = Math.round(torrent.progress * 100 * 100) / 100
        progressBar.style.width = percent + '%'
        downloaded.textContent = formatBytes(torrent.downloaded)
        total.textContent = formatBytes(torrent.length)

        // Remaining time
        var rem
        if (torrent.done) {
            rem = 'Done'
        } else {
            rem = formatDuration(Math.round(torrent.timeRemaining / 1000))
            rem = rem[0].toUpperCase() + rem.substring(1) + ' remaining'
        }
        remaining.textContent = rem

        // Speed rates
        downloadSpeed.textContent = formatBytes(torrent.downloadSpeed) + '/s'
        uploadSpeed.textContent = formatBytes(torrent.uploadSpeed) + '/s'
    }

    function onDone() {
        clearInterval(progressInterval)
        body.classList.add('is-seed')
        onProgress()
    }
}
