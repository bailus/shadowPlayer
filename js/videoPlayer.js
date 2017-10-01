import Vue from "vue"

const nullFunc = x => undefined
const isDefined = x => x !== undefined

const iif = cond => (t, f=nullFunc) => x => cond(x) ? t(x) : f(x)
const maybe = iif(isDefined)

const waitSeconds = t => x => new Promise(resolve => { window.setTimeout(() => resolve(x), 1000*t) })
const waitAnimationFrame = x =>  new Promise(resolve => { window.requestAnimationFrame(() => resolve(x)) })

const prefix = a => b => [ a, b ].join('')
const leadingZero = x => (x && (x < 10 ? '0'+x : ''+x))

const timeObjToSeconds = o => ((((o.hours*60) + o.minutes)*60) + o.seconds)+(o.milliseconds/1e3)


export default function ({ get, vfs2uri }) {

	const art2uri = (vfs) => vfs2uri(prefix('image://')(encodeURIComponent(vfs)))

	const vm = new Vue({
		el: '#videoPlayer',
		data: {
			labels: {},
			stats: {},
			hideGUI: true,
			hideStats: true
		},
		template: `<div id="videoPlayer"
					:class="{ hideGUI: hideGUI, hideStats: hideStats }"
					v-on:click="hideGUI = !hideGUI"
					v-on:dblclick="hideStats = !hideStats">

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


	const getLabels = () => get({
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

		vm.labels = labels
	})




	const getActivePlayer = () => get({ 'method': 'Player.GetActivePlayers' }).then(players => players[0])

	const getTime = ({ playerid, type }) => get({
			'method': 'Player.GetProperties',
			'params': {
				'playerid': playerid,
				'properties': [
					'time', 'speed'
				]
			}
		})



	const videoElem = document.getElementById('xbmc-video')
	const minDelta = 2.56 // seconds. Minimum time delta before jump
	let timeStep = 2
	let lastPlayerTime = 0
	let lastTime = 0
	let delta = 0
	let lastLag = 0
	let temperature = 1
	let lastTemperature = 1
	let lastPlaybackRate = 1
	const updateTime = ({ time, speed }, startTime) => {

		const lag = (videoElem.currentTime - startTime) / 2
		const jitter = (lag - lastLag)/lastLag

		const playerTime = timeObjToSeconds(time) + lag

		delta = playerTime - videoElem.currentTime
		temperature = (7*lastTemperature + Math.max(0, Math.min(1, Math.pow(1 - (1/Math.abs(delta*512)), 4)))) / 8

		let playbackRate = (lastPlaybackRate + (playerTime - lastPlayerTime) / ((videoElem.currentTime - lastTime) / videoElem.playbackRate)) / 2

		const adjustedMinDelta = minDelta*playbackRate
		const maxJitter = Math.sqrt(Math.abs(temperature)) + 0.1

		if (jitter > maxJitter || jitter < -maxJitter) {
			// bad network - don't re-sync
			videoElem.playbackRate = playbackRate = (lastPlaybackRate + playbackRate) / 2
			delta = undefined
			timeStep = 1/16
		}
		else if (!isFinite(playbackRate) || delta > adjustedMinDelta || delta < -adjustedMinDelta) {
			// quick re-sync
			videoElem.currentTime += delta
			videoElem.playbackRate = lastPlaybackRate = speed
			console.log(`jump to ${ videoElem.currentTime + delta } seconds`)
			timeStep = 1
			temperature = 1
		}
		else if (isFinite(playbackRate)) {
			// smooth re-sync
			timeStep = 1/4

			const k = delta * (temperature + lastTemperature) / 2
			temperature = temperature * 0.9

			const t = timeStep * playbackRate
			const p = (t+k)/t
			if (isFinite(p))
				videoElem.playbackRate = p*speed
		}

		vm.stats.delta = Math.round(delta * 1e6) / 1e3
		vm.stats.lag = Math.round(lastLag * 2e6) / 1e3
		vm.stats.jitter = Math.round(jitter * 1e3) / 1e3
		vm.stats.temperature = Math.round(temperature * 100)

		lastTime = videoElem.currentTime
		lastPlayerTime = playerTime
		lastLag = (3*lastLag + lag) / 4
		lastTemperature = temperature
		if (isFinite(playbackRate))
			lastPlaybackRate = playbackRate
	}


	// One loop to rule them all (ie. the game loop)
	const loop = () => {
		Promise.all([
			getLabels().
			then(getActivePlayer).
				then(maybe(player => {
					const startTime = videoElem.currentTime
					getTime(player).
						then(maybe(properties => {
							updateTime(properties, startTime)
						}))
				}), () => {
					//nothing playing
					vm.src = undefined
				})
		]).
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
