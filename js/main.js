require('./webtorrent.js')

const shareBtn = document.getElementById('share-url-btn')
const shareUrl = document.getElementById('share-url')

shareBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(shareUrl.value).then(() => {
        shareBtn.dataset.tooltip = 'Copied!'
        shareBtn.classList.add('tooltip-visible')
    }).catch(() => {
        shareBtn.dataset.tooltip = 'Failed to copy'
        shareBtn.classList.add('tooltip-visible')
    })
})

shareBtn.addEventListener('mouseleave', () => {
    shareBtn.dataset.tooltip = 'Copy to clipboard'
    shareBtn.classList.remove('tooltip-visible')
})

shareUrl.value = window.location.href
