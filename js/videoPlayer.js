import Vue from "vue"

const eventListenerPreventDefault = f => e => {
	if (e.preventDefault) e.preventDefault() // required by FF + Safari
	f(e)
	return false // required by IE
}

const prefix = a => b => [ a, b ].join('')
const leadingZero = x => (x && (x < 10 ? '0'+x : ''+x))
const waitSeconds = t => x => new Promise(resolve => { window.setTimeout(() => resolve(x), 1000*t) })
const waitAnimationFrame = x =>  new Promise(resolve => { window.requestAnimationFrame(() => resolve(x)) })
const timeObjToSeconds = o => ((((o.hours*60) + o.minutes)*60) + o.seconds)+(o.milliseconds/1e3)


export default function (xbmc) {

	const art2uri = (vfs) => xbmc.vfs2uri(prefix('image://')(encodeURIComponent(vfs)))
	const vfs2uri = xbmc.vfs2uri

	const getLabels = () => xbmc.get({
		'method': 'XBMC.GetInfoLabels',
		'params': {
			'labels': [
				'MusicPlayer.Album',
				'MusicPlayer.Artist',
				'MusicPlayer.Year',
				'Player.Art(thumb)',
				'Player.Filenameandpath',
				'Player.FinishTime',
				'Player.Title',
				'System.Time',
				'VideoPlayer.ChannelName',
				'VideoPlayer.NextTitle',
				'VideoPlayer.NextEndTime',
				'VideoPlayer.ProductionCode',
				'VideoPlayer.TVShowTitle',
				'VideoPlayer.Year'
			]
		}
	}).then(labels => {
		labels['VideoPlayer.ProductionCode'] = ([
				leadingZero(labels['VideoPlayer.Season']),
				leadingZero(labels['VideoPlayer.Episode'])
			]).filter(x => x).join('x')

		labels['Player.File'] = vfs2uri(labels['Player.Filenameandpath'])
		labels['Player.Thumb'] = art2uri(labels['Player.Art(thumb)'])

		return labels;
	})

	const vm = new Vue({
		el: '#videoPlayer',
		data: {
			labels: {},
			stats: {}
		},
		template: `<div id="videoPlayer">
				<video id="xbmc-video" autoplay :src="labels['Player.File']"></video>
				<div class="clock">
					<span class="clockTime">{{ labels['System.Time'] }}</span>
					<span class="finishTime">{{ labels['Player.FinishTime'] }}</span>
				</div>
				<div class="playingNow">
					<img class="thumbnail" :src="labels['Player.Thumb']"></img>
					<div class="text">
						<div class="line1">
							<span class="show">{{ labels['VideoPlayer.TVShowTitle'] }}</span>
							<span class="album">{{ labels['MusicPlayer.Album'] }}</span>
							<span class="year">{{ labels['VideoPlayer.Year'] || labels['MusicPlayer.Year'] }}</span>
						</div>
						<div class="line2">
							<span class="productionCode">{{ labels['VideoPlayer.ProductionCode'] }}</span>
							<span class="artist">{{ labels['MusicPlayer.Artist'] }}</span>
							<span class="title">{{ labels['Player.Title'] }}</span>
						</div>
					</div>
				</div>
				<div class="playingNext">
					<div class="text">
						<div class="line1">
						</div>
						<div class="line2">
							<span class="title">{{ labels['Player.NextTitle'] }}</span>
						</div>
					</div>
				</div>
				<dl class="stats">
					<dt>Time Delta</dt>
					<dd>{{ stats.delta }} ms</dd>
					<dt>Lag</dt>
					<dd>{{ stats.lag }} ms</dd>
					<dt>Jitter</dt>
					<dd>{{ stats.jitter }}</dd>
					<dt>Temperature</dt>
					<dd>{{ stats.temperature }}%</dd>
				</dl>
			</div>`
	})




	const elems = {
		video: document.getElementById('xbmc-video')
	}

	const getActivePlayer = () => xbmc.get({ 'method': 'Player.GetActivePlayers' }).then(players => players[0])

	const getTime = ({ playerid, type }) => xbmc.get({
					'method': 'Player.GetProperties',
					'params': {
						'playerid': playerid,
						'properties': [
							'time', 'speed'
						]
					}
				})



	// This is the main function that checks the state of Kodi and updates the DOM accordingly
	const minDelta = 10.24 // seconds. Minimum time delta before jump
	let timeStep = 2
	let lastPlayerTime = 0
	let lastTime = 0
	let delta = 0
	let lastLag = 0
	let temperature = 1
	let lastTemperature = 1
	const updateTime = ({ time, speed }, startTime) => {

		const lag = (elems.video.currentTime - startTime) / 2

		const jitter = (lag - lastLag)/(lag + lastLag)

		const playerTime = timeObjToSeconds(time) + lag

		delta = playerTime - elems.video.currentTime

		temperature = (3*lastTemperature + Math.max(0, Math.min(1, Math.pow(1 - (1/Math.abs(delta*1024)), 2)))) / 4

		const playbackRate = (playerTime - lastPlayerTime) / ((elems.video.currentTime - lastTime) / elems.video.playbackRate)

		const adjustedMinDelta = minDelta*playbackRate
		const maxJitter = Math.pow(temperature, 2) + 0.1

		if (jitter > maxJitter || jitter < -maxJitter) {
			// bad network - don't re-sync
			elems.video.playbackRate = speed
			delta = undefined
			temperature = (lastTemperature + temperature) / 2
			//timeStep = 1/16
		}
		else if (!isFinite(playbackRate) || delta > adjustedMinDelta || delta < -adjustedMinDelta) {
			// quick re-sync
			elems.video.currentTime += delta
			elems.video.playbackRate = speed
			console.log(`jump to ${ elems.video.currentTime + delta } seconds`)
			timeStep = 2
			temperature = 1
		}
		else if (isFinite(playbackRate)) {
			// smooth re-sync
			timeStep = Math.sqrt(Math.max(1/16, Math.min(1, 1/Math.abs(delta*1024))))/2

			const k = delta * (temperature + lastTemperature) / 2
			temperature = temperature * 0.9

			const t = timeStep * elems.video.playbackRate
			const p = (t+k)/t
			if (isFinite(p))
				elems.video.playbackRate = p*speed
		}

		vm.stats.delta = Math.round(delta * 1e6) / 1e3
		vm.stats.lag = Math.round(lag * 2e6) / 1e3
		vm.stats.jitter = Math.round(jitter * 1e3) / 1e3
		vm.stats.temperature = Math.round(temperature * 100)

		lastTime = elems.video.currentTime
		lastPlayerTime = playerTime
		lastLag = (7*lastLag + lag) / 8
		lastTemperature = temperature
	}

	const update = (labels) => {
		vm.labels = labels
	}


	// attach event handlers to the dom
	elems.video.addEventListener('click', eventListenerPreventDefault(evt => {
		document.getElementById('videoPlayer').classList.toggle('hideGUI')
	}))


	// One loop to rule them all (ie. the game loop)
	const loop = () => {
		let startTime = 0
		Promise.resolve().
		then(getActivePlayer).
		then(player => {
			startTime = elems.video.currentTime
			return player
		}).
		then(getTime).
		then(properties => updateTime(properties, startTime)).
		then(getLabels).
		then(waitAnimationFrame).
		then(update).
		then(success => {
				waitSeconds(timeStep)().then(loop)
			},
			error => {
				console.error(error)
				waitSeconds(1)().then(loop)
			})
	}
	loop()


}
