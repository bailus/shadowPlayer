import Vue from "vue"
import VueTouch from "vue-touch"
import VueSlider from "vue-slider-component"

import { seconds2shortstring } from "./util.js"


const constant = x => y => x
const id = {
	func: x => x,
	none: constant(),
	mult: constant(1),
	add:  constant(0)
}
const none = id.none()

const mapObject = f => x => {
	const o = {}
	Object.keys(x).forEach(key => { o[key] = f(x[key], key, x) })
	return o
}

const pushLimitN = (n=1) => (arr=[]) => x => {
	arr.push(x)
	if (arr.length > n)
		arr.splice(0, 1)
}
const pushLimit = pushLimitN(10)

const is = {}
is.truthy = x => ( x == true )
is.defined = x => ( x !== none )
is.numeric = x => ( !isNaN(parseFloat(x)) && isFinite(x) )
is.lessThanTen = x => ( x < 10 )

const If = cond => (t=id.func, f=id.none) => x => ( cond(x) ? t(x) : f(x) )
Object.assign(If, mapObject(If)(is))

const prefix = a => b => ([ a, b ]).join('')
const suffix = a => b => ([ b, a ]).join('')
const prefixImage = prefix('image://')
const prefixZero = prefix('0')
const toString = x => ''+x
const toNumeric = x => 0+x
const leadingZero = If.numeric(If.lessThanTen(prefixZero, toString), id.func)

const timeObjToSeconds = o => ((((o.hours*60) + o.minutes)*60) + o.seconds)+(o.milliseconds/1e3)
const secondsToTimeObj = s => ({ 'hours': Math.floor(s/3600), 'minutes': Math.floor(s/60)%60, 'seconds': s%60 })

const waitSeconds = t => x => new Promise(resolve => { window.setTimeout(() => resolve(x), 1000*t) })
const waitAnimationFrame = x =>  new Promise(resolve => { window.requestAnimationFrame(() => resolve(x)) })



Vue.use(VueTouch)
VueTouch.registerCustomEvent('dbltap', { type: 'tap', taps: 2 })


export default function ({ get, vfs2uri }) {
	const getActivePlayer = () => get({ 'method': 'Player.GetActivePlayers' }).then(players => players[0])

	const art2uri = If.truthy(vfs => vfs2uri(prefixImage(encodeURIComponent(vfs))), id.func)

	const vm = new Vue({
		el: '#videoPlayer',
		data: {
			labels: {},
			stats: {},
			hideGUI: true,
			hideStats: true,
			currentTime: 0,
			duration: 0,
			speed: 0,
			stopped: true,
			remoteVolume:100,
			deltaHistory: []
		},
		components: {
			vueSlider: VueSlider
		},
		methods: {
			action: a => get({
				method: 'Input.ExecuteAction',
				params: {
					'action': a
				}
			}),
			seek: s => getActivePlayer().then(({ playerid }) => get({
				method: 'Player.Seek',
				params: {
					'playerid': playerid,
					'value': { 'time': secondsToTimeObj(s) }
				}
			})),
			seconds2shortstring: seconds2shortstring,
			log: x => { console.log(x); return x },
			suffix: suffix
		},
		template: `<div id="videoPlayer"
					:class="{ hideGUI: (hideGUI && speed < 1.5 && speed > 0.75), hideStats: hideStats, stopped: stopped }">

				<video id="xbmc-video" autoplay
					:src="labels['Player.File']"
					v-touch:tap="evt => (hideGUI = !hideGUI)"
					v-touch:dbltap="evt => (hideStats = !hideStats)"></video>

				<div class="clock">
					<span class="clockTime">{{ labels['System.Time'] }}</span>
					<span class="finishTime">{{ labels['Player.FinishTime'] }}</span>
				</div>

				<div class="playingNow" v-touch:tap="evt => action('playpause')">
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

				<div class="controls">
					<div class="progressBar">
						<vueSlider :value.sync="currentTime" :max="duration" :disabled="stopped"
							:formatter="seconds2shortstring"
							v-on:callback="seek" :lazy="true" width="100%"
							:speed="0" :tooltip="hideGUI && speed < 1.5 && speed > 0.75 ? 'false' : 'always'"></vueSlider>
					</div>
				</div>

				<div class="volumeControls">
					<div class="volumeControl">
						<vueSlider :value.sync="remoteVolume" :max="100" direction="vertical" tooltip-dir="right" height="100%" tooltip="hover" :formatter="suffix('%')" width="6"></vueSlider>
					</div>
				</div>

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

	const getVolume = () => get({
		'method': 'Application.GetProperties',
		'params': {
			'properties': [ 'volume', 'muted' ]
		}
	}).then(({ volume, muted }) => {
		vm.remoteVolume = volume
		vm.muted = muted
	})




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
	const maxPlaybackRate = 128
	const minPlaybackRate = 1/16
	let timeStep = 1
	let temperature = 1
	let lastTemperature = 1
	let lastPlayerTime = 0
	let lastTime = 0
	let lastLag = none
	const deltaHistory = []
	const pushDelta = pushLimit(vm.deltaHistory)
	const updateTime = ({ time, speed }, startTime) => {

		let localPlaybackRate = If.numeric(id.func, id.mult)(videoElem.playbackRate)
		let localTime = videoElem.currentTime
		if (!is.numeric(localTime)) {
			return
		}

		const lag = (localTime - startTime) / 2
		const remoteTime = timeObjToSeconds(time) + lag
		if (lastLag === none) lastLag = lag

		let delta = remoteTime - localTime
		pushDelta(delta)

		const jitter = (lag - lastLag)/lastLag

		temperature = Math.pow(Math.max(0, Math.min(1, 1 - (1/Math.abs(delta*512)))), 4)
		temperature = Math.abs(1 - (0.9*(1-temperature)))
		temperature = (7*lastTemperature + temperature) / 8

		const maxJitter = temperature + 0.2

		timeStep = 1/4
		let playbackRate = (2*timeStep) / ((-delta*temperature) + (2*timeStep)) * speed

		if (jitter > maxJitter || jitter < -maxJitter) {
			// bad network - don't re-sync
			videoElem.playbackRate = speed
			delta = none
		}
		else if (!is.numeric(playbackRate) || playbackRate >= maxPlaybackRate || playbackRate <= minPlaybackRate) {
			// quick re-sync
			videoElem.currentTime = localTime += delta
			videoElem.playbackRate = speed
			console.log(`jump to ${ localTime } seconds`)
			timeStep = 2
			temperature = 1
		}
		else if (is.numeric(playbackRate)) {
			// smooth re-sync

			temperature = temperature * 0.9

			videoElem.playbackRate = playbackRate
		}

		vm.stats.delta = Math.round(delta * 1e6) / 1e3
		vm.stats.lag = Math.round(lastLag * 2e6) / 1e3
		vm.stats.jitter = Math.round(jitter * 1e3) / 1e3
		vm.stats.temperature = Math.round(temperature * 100)

		vm.currentTime = Math.round(localTime)
		vm.duration = Math.round(videoElem.duration)
		vm.progress = vm.currentTime / vm.duration
		vm.speed = speed

		lastTime = localTime
		lastPlayerTime = remoteTime
		lastLag = (7*lastLag + lag) / 8
		lastTemperature = temperature
	}


	// One loop to rule them all (ie. the game loop)
	const loop = () => {
		Promise.all([
			getLabels().
			then(getActivePlayer).
				then(If.defined(player => {
					const startTime = videoElem.currentTime
					getTime(player).
						then(If.defined(properties => {
							updateTime(properties, startTime)
						}))
					vm.stopped = false
				}, () => {
					//nothing playing
					vm.src = ''
					vm.stats = {}
					vm.currentTime = 0
					vm.duration = 0
					vm.src = ''
					vm.speed = 0
					vm.stopped = true
					videoElem.playbackRate = 0
					timeStep = 1/2
				})).
			then(getVolume)
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
