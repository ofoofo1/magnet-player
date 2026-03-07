var moment = require('moment')
var prettyBytes = require('pretty-bytes')

// HTML elements
var $body = $('body')
var $progressBar = $('#progressBar')
var $streamedFileName = $('#streamedFileName')
var $numPeers = $('#numPeers')
var $downloaded = $('#downloaded')
var $total = $('#total')
var $remaining = $('#remaining')
var $uploadSpeed = $('#uploadSpeed')
var $downloadSpeed = $('#downloadSpeed')

var announceList = [
['udp://tracker.openbittorrent.com:80'],
['udp://tracker.opentrackr.org:1337'],
['wss://tracker.openwebtorrent.com'],
['wss://tracker.webtorrent.dev'],
['wss://tracker.files.fm:7073/announce'],
]

global.WEBTORRENT_ANNOUNCE = announceList
.map(function (arr) {
	return arr[0]
})
.filter(function (url) {
	return url.indexOf('wss://') === 0 || url.indexOf('ws://') === 0
})

var client = new WebTorrent()
var ready = false

client.on('error', function(err) {
	console.error('ERROR: ' + err.message)
})

// Register service worker and create server for streaming
navigator.serviceWorker.register('sw.min.js', { scope: './' })
	.then(function () {
		return navigator.serviceWorker.ready
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
$('form').submit(function(e) {
	e.preventDefault() // Prevent page refresh

	var torrentId = $('form input[name=torrentId]').val()

	if (torrentId.length > 0)
		downloadTorrent(torrentId)
})

// Download by URL hash
window.addEventListener('hashchange', onHashChange)
function onHashChange () {
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
	$streamedFileName.text(largestFile.name)

	// Update clipboard share url
	$('#share-url').val('https://ferrolho.github.io/magnet-player/#' + torrent.infoHash);

	// Stream the file in the browser
	var video = document.createElement('video')
	video.controls = true
	video.autoplay = true
	document.getElementById('output').appendChild(video)
	largestFile.streamTo(video)

	// hide magnet input
	$('#magnet-input').slideUp()

	// show player
	$('#hero').slideDown()

	// Trigger statistics refresh
	torrent.on('done', onDone)
	setInterval(onProgress, 500)
	onProgress()

	// Statistics
	function onProgress () {
		// Peers
		$numPeers.text(torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers'))

		// Progress
		var percent = Math.round(torrent.progress * 100 * 100) / 100
		$progressBar.width(percent + '%')
		$downloaded.text(prettyBytes(torrent.downloaded))
		$total.text(prettyBytes(torrent.length))

		// Remaining time
		var remaining
		if (torrent.done) {
			remaining = 'Done'
		} else {
			remaining = moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize()
			remaining = remaining[0].toUpperCase() + remaining.substring(1) + ' remaining'
		}
		$remaining.text(remaining)

		// Speed rates
		$downloadSpeed.text(prettyBytes(torrent.downloadSpeed) + '/s')
		$uploadSpeed.text(prettyBytes(torrent.uploadSpeed) + '/s')
	}

	function onDone () {
		$body.addClass('is-seed')
		onProgress()
	}
}
