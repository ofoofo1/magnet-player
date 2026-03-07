function formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const units = ['B', 'kB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1000))
    return parseFloat((bytes / Math.pow(1000, i)).toFixed(1)) + ' ' + units[i]
}

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds} seconds`
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`
    return `${Math.round(seconds / 86400)} days`
}

// HTML elements
const progressBar = document.getElementById('progressBar')
const streamedFileName = document.getElementById('streamedFileName')
const numPeers = document.getElementById('numPeers')
const downloaded = document.getElementById('downloaded')
const total = document.getElementById('total')
const remaining = document.getElementById('remaining')
const uploadSpeed = document.getElementById('uploadSpeed')
const downloadSpeed = document.getElementById('downloadSpeed')

const announceList = [
    ['udp://tracker.openbittorrent.com:80'],
    ['udp://tracker.opentrackr.org:1337'],
    ['wss://tracker.openwebtorrent.com'],
    ['wss://tracker.webtorrent.dev'],
    ['wss://tracker.files.fm:7073/announce'],
]

window.WEBTORRENT_ANNOUNCE = announceList
    .map(arr => arr[0])
    .filter(url => url.startsWith('wss://') || url.startsWith('ws://'))

const client = new WebTorrent()
let ready = false

client.on('error', err => {
    console.error(`ERROR: ${err.message}`)
})

// Register service worker and create server for streaming
navigator.serviceWorker.register('sw.min.js', { scope: './' })
    .then(() => navigator.serviceWorker.ready)
    .then(registration => {
        const sw = registration.active || registration.installing || registration.waiting
        if (sw.state === 'activated') return registration
        return new Promise(resolve => {
            sw.addEventListener('statechange', () => {
                if (sw.state === 'activated') resolve(registration)
            })
        })
    })
    .then(controller => {
        client.createServer({ controller })
        ready = true
        onHashChange()
    })
    .catch(err => {
        console.error('Service worker registration failed:', err)
        document.getElementById('magnet-input').querySelector('input').placeholder = 'Error: streaming not supported in this browser'
    })

// Download by form input
document.getElementById('magnet-input').addEventListener('submit', e => {
    e.preventDefault()
    if (!ready) return

    const torrentId = document.querySelector('#magnet-input input[name=torrentId]').value
    if (torrentId.length > 0) downloadTorrent(torrentId)
})

// Download by URL hash
window.addEventListener('hashchange', onHashChange)
function onHashChange() {
    if (!ready) return
    const hash = decodeURIComponent(window.location.hash.substring(1)).trim()
    if (hash !== '') downloadTorrent(hash)
}

function downloadTorrent(torrentId) {
    client.add(torrentId, onTorrent)
}

function onTorrent(torrent) {
    torrent.on('warning', console.log)
    torrent.on('error', console.log)

    // Find largest file
    let largestFile = torrent.files[0]
    for (let i = 1; i < torrent.files.length; i++) {
        if (torrent.files[i].length > largestFile.length)
            largestFile = torrent.files[i]
    }

    // Display name of the file being streamed
    streamedFileName.textContent = largestFile.name

    // Update clipboard share url
    document.getElementById('share-url').value = `${window.location.origin}${window.location.pathname}#${torrent.infoHash}`

    // Stream the file in the browser
    const video = document.createElement('video')
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
    setInterval(onProgress, 500)
    onProgress()

    function onProgress() {
        numPeers.textContent = `${torrent.numPeers} ${torrent.numPeers === 1 ? 'peer' : 'peers'}`

        const percent = Math.round(torrent.progress * 100 * 100) / 100
        progressBar.style.width = `${percent}%`
        downloaded.textContent = formatBytes(torrent.downloaded)
        total.textContent = formatBytes(torrent.length)

        let rem
        if (torrent.done) {
            rem = 'Done'
        } else {
            rem = formatDuration(Math.round(torrent.timeRemaining / 1000))
            rem = `${rem[0].toUpperCase()}${rem.substring(1)} remaining`
        }
        remaining.textContent = rem

        downloadSpeed.textContent = `${formatBytes(torrent.downloadSpeed)}/s`
        uploadSpeed.textContent = `${formatBytes(torrent.uploadSpeed)}/s`
    }

    function onDone() {
        document.body.classList.add('is-seed')
        onProgress()
    }
}
