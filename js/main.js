require('./webtorrent.js');

$('#share-url-btn').on('click', function () {
	var text = $('#share-url').val();
	navigator.clipboard.writeText(text).then(function () {
		$('#share-url-btn').attr('title', 'Copied!').tooltip('fixTitle').tooltip('show');
	});
});

$(window).bind("resize", function () {
	fitMagnetInput();
});

$(document).ready(function () {
	$('#share-url').val(window.location.href);
	$('[data-toggle="tooltip"]').tooltip();
	$('#share-url-btn').mouseleave(function () {
		$('#share-url-btn').attr('title', 'Copy to clipboard').tooltip('fixTitle');
	});

	fitMagnetInput();
});

function fitMagnetInput() {
	var formW = $('#magnet-input').width();
	var buttonW = $('#magnet-input button').outerWidth();
	$('#magnet-input input').outerWidth(formW - buttonW);
}
