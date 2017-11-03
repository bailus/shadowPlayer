import { ready } from './browserPromises.js'
import XBMC from './xbmc.js'
import VideoPlayer from './videoPlayer.js'


ready().then(function () { //on document load

	const global = window

	function error({ summary, details }) {
		document.body.innerHTML = `
			<h1>:(</h1>
			<h2>${summary || 'Error'}</h2>
			${details.map(text => `<p>${text}</p>`).join('')}
		`
	}

	const connectToKodi =
		XBMC(window.location.host)
		.catch(e => error({ details: [ 'Could not connect to Kodi', e ] }))

	connectToKodi.then(VideoPlayer)

});
