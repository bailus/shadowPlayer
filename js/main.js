import 'babel-polyfill'
import 'whatwg-fetch'
import { ready } from './util.js'
import XBMC from './xbmc.js'
import Handlebars from 'handlebars'
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

	const videoLoad = Promise.resolve(VideoPlayer)

	const videoPlayer = Promise.all([ videoLoad, connectToKodi ])
	.then(([ videoConnect, xbmc ]) => videoConnect(xbmc))

});
