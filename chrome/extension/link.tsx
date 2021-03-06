import storage from '../../extension/storage'

const searchParams = new URLSearchParams(window.location.search)

const sourceUrl = searchParams.get('sourceurl')
if (sourceUrl) {
    storage.getSync(items => {
        const serverUrls = items.serverUrls || []
        serverUrls.push(sourceUrl)
        storage.setSync({
            serverUrls: [...new Set([...serverUrls, 'https://sourcegraph.com'])],
            serverUserId: searchParams.get('userId') || items.serverUserId,
        })
    })
}
