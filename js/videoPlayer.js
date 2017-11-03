import Vue from "vue"
import VueTouch from "vue-touch"
import VueSlider from "vue-slider-component"
import VueIcon from "vue-icon-component"

import AltImg from "./vue-components/altimg.js"
import { FixedList, itemLabelNames } from "./vue-components/fixedlist.js"
import { InfoBox, infoboxLabelNames } from "./vue-components/infobox.js"

import {} from "./stringFormat.js"

import {
	If, is, id,
	bindArray, mapArray,
	range
} from "./functionalFunctions.js"

import {
	markup2html,
	image2uri,
	timeObjToSeconds,
	secondsToTimeObj,
	seconds2shortstring,
	prefix, suffix
} from "./stringFormat.js"

import {
	waitSeconds
} from "./browserPromises.js"

Vue.use(VueTouch);
VueTouch.registerCustomEvent('dbltap', { type: 'tap', taps: 2 });

const templateLabelNames = [];
const getLabel = label => {
	if (!templateLabelNames.includes(label))
		templateLabelNames.push(label);
	return `menuLabels['${ label }']`
};

let media2uri = id.func

const vm = new Vue({
	el: '#videoPlayer',
	data: {
		labels: {},
		stats: {},
		hideStats: true,
		currentTime: 0,
		duration: 0,
		speed: 0,
		stopped: true,
		remoteVolume:100,
		remoteMute:false,
		localVolume:100,
		localMute:true,
		menuLabels:{items:[]}
	},
	components: {
		'slider': VueSlider,
		'icon': VueIcon,
		'alt-img': AltImg,
		'fixedlist': FixedList,
		'infobox': InfoBox
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
		setRemoteVolume: async v => {
			vm.remoteVolume = await get({
				method: 'Application.SetVolume',
				params: {
					'volume': v
				}
			})
		},
		setLocalVolume: v => {
			videoElem.volume = v/100
		},
		remoteMuteToggle: async () => {
			vm.remoteMute = await get({
				method: 'Application.SetMute',
				params: {
					'mute': !vm.remoteMute
				}
			})
		},
		seconds2shortstring: seconds2shortstring,
		log: x => { console.log(x); return x },
		suffix: suffix,
		toggle: key => () => { vm[key] = !vm[key]; return vm[key] },
		image2uri: image2uri,
		markup2html: markup2html,
	},
	template: `
			<div id="videoPlayer"
					:data-currentWindow="${ getLabel('System.CurrentWindow') }"
					:data-currentControl="${ getLabel('System.CurrentControl') }"
					:data-currentControlId="${ getLabel('System.CurrentControlId') }"
					:class="{ hideStats: hideStats, stopped: stopped }">

				<section class="loading">
					
				</section>

				<header>
					<section class="left">
						<div class="title">
							<span class="currentWindow" v-if="${ getLabel('System.CurrentWindow') }">{{ ${ getLabel('System.CurrentWindow') } }}</span>
							<span class="folderName" v-if="${ getLabel('Container.FolderName') }" v-html="markup2html(${ getLabel('Container.FolderName') })"></span>
						</div>
						<div class="title2">
							<span class="sort">{{ ${ getLabel('Container.SortMethod') } }}</span>
						</div>
					</section>
					<section class="playingNow" v-show="!stopped">
						<div class="title">
							<span class="artist">{{ ${ getLabel('MusicPlayer.Artist') } }}</span>
							<span class="label">{{ ${ getLabel('Player.Title') } }}</span>
							<span class="year">{{ ${ getLabel('VideoPlayer.Year') } || ${ getLabel('MusicPlayer.Year') } }}</span>
						</div>
						<div class="title2">
							<span class="productionCode">{{ ${ getLabel('VideoPlayer.ProductionCode') } }}</span>
							<span class="show">{{ ${ getLabel('VideoPlayer.TVShowTitle') } }}</span>
							<span class="album">{{ ${ getLabel('MusicPlayer.Album') } }}</span>
						</div>
					</section>
					<section class="right">
						<div class="clockTime">{{ ${ getLabel('System.Time') } }}</div>
						<div class="finishTime" v-show="!stopped">{{ ${ getLabel('Player.FinishTime') } }}</div>
					</section>
				</header>

				<section class="media">
					<video id="xbmc-video" autoplay :muted="localMute"
						:src="labels['Player.File']"
						v-touch:dbltap="evt => (hideStats = !hideStats)"></video>
				</section>

				<section class="osd">
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

					<div class="controls" v-show="!stopped">
						<div class="progressBar">
							<slider :value.sync="currentTime" :lazy="true" v-on:callback="seek"
								:formatter="seconds2shortstring"
								:tooltip="speed < 1.5 && speed > 0.75 ? 'false' : 'always'"
								:max="duration" :speed="0"
								width="100%"></slider>
						</div>
						<div class="button">
							<icon label="Play/Pause" v-touch:tap="evt => action('playpause')" scale="1.6">
								<icon name="play" v-show="speed === 0 || stopped"></icon>
								<icon name="pause" v-show="speed > 0 && !stopped" scale="0.8"></icon>
							</icon>
						</div>
					</div>

					<div class="volumeControls">
						<div class="volumeControl remote">
							<slider :value.sync="remoteVolume" v-on:callback="setRemoteVolume"
								:formatter="suffix('%')" :disabled="remoteMute"
								tooltip="hover"
								:max="100"
								direction="vertical" tooltip-dir="right"
								width="6" height="100%"></slider>
							<div class="iconBox">
								<icon label="Remote Volume" v-touch:tap="remoteMuteToggle">
									<icon name="television" scale="1.5"></icon>
									<icon name="ban" v-show="remoteMute" scale="2"></icon>
								</icon>
							</div>
						</div>
						<div class="volumeControl local">
							<slider :value.sync="localVolume" v-on:callback="setLocalVolume"
								:formatter="suffix('%')" :disabled="localMute"
								tooltip="hover"
								:max="100"
								direction="vertical"
								width="6" height="100%"></slider>
							<div class="iconBox">
								<icon label="Local Volume" v-touch:tap="toggle('localMute')">
									<icon name="mobile" scale="1.75"></icon>
									<icon name="ban" v-show="localMute" scale="2"></icon>
								</icon>
							</div>
						</div>
					</div>
				</section>

				<section class="menu" :data-view="menuLabels.ViewMode">
					<infobox :item="menuLabels.items[0]"></infobox>
					<fixedlist :id="${ getLabel('System.CurrentControlId') }" :items="menuLabels.items"></fixedlist>
				</section>

				<footer>
				</footer>

			</div>`
});



export default function ({ get }) {
	const getActivePlayer = () => get({ 'method': 'Player.GetActivePlayers' }).then(players => players[0]);

	media2uri = async path => {
		try {
			const url = new URL(path)
			if (url.protocol === 'http:' || url.protocol === 'https:')
				return path
		} catch(e) {}

		const { details } = await get({
			'method': 'Files.PrepareDownload',
			'params': {
				'path': path
			}
		})
		return prefix('/')(details.path)
	}

	let videoElem = document.getElementById('xbmc-video');


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
	}).then(async labels => {
		labels['Player.File'] = await media2uri(labels['Player.Filenameandpath']);
		labels['Player.Thumb'] = image2uri(labels['Player.Art(thumb)']);

		vm.labels = labels;
	});

	const getVolume = async function() {
		let o = await get({
			'method': 'Application.GetProperties',
			'params': {
				'properties': [ 'volume', 'muted' ]
			}
		});
		vm.remoteVolume = o.volume;
		vm.remoteMute = o.muted;
	};




	const getTime = ({ playerid, type }) => get({
		'method': 'Player.GetProperties',
		'params': {
			'playerid': playerid,
			'properties': [
				'time', 'speed'
			]
		}
	});

	const getContainer = (containerId='') => get({
		'method': 'XBMC.GetInfoLabels',
		'params': {
			'labels': [].
					concat(mapArray(prefix(`Container(${ containerId  }).`))([
						'NumItems',
						'CurrentItem'
					])).
					concat(mapArray(prefix(`Container().`))([
						'NumItems',
						'CurrentItem'
					])).
					concat(templateLabelNames)
		}
	});

	const getListItems = (containerId='') => offsets => {
		const o = {
			'method': 'XBMC.GetInfoLabels',
			'params': {
			'labels': bindArray(offset => mapArray(prefix(`Container(${ containerId  }).ListItem(${ offset }).`))(itemLabelNames.concat(infoboxLabelNames)))(offsets)
			}
		};
		return get(o);
	};

	const getSystemLabels = () => get({
		'method': 'XBMC.GetInfoLabels',
		'params': {
			'labels': [
				'System.CurrentWindow',
				'System.CurrentControl',
				'System.CurrentControlId'
			]
		}
	});

	const getBooleans = () => get({
		'method': 'XBMC.GetInfoBooleans',
		'params': {
			'booleans': [
				'System.IsFullscreen',
				'System.CurrentControlId',
				'Container.HasParent'
			]
		}
	});


	const getContainerItems = async (n=7) => {
		const booleans = await getBooleans();
		const system = await getSystemLabels();
		let controlId = system['System.CurrentControlId'];
		const container = await getContainer(controlId);

		if (container[`Container(${ controlId }).CurrentItem`] === '')
			controlId = '';

		const pos = parseInt(container[`Container(${ controlId }).CurrentItem`]) || parseInt(container[`Container().CurrentItem`]);
		const numItems = parseInt(container[`Container(${ controlId }).NumItems`]) || parseInt(container[`Container().NumItems`]);
		const h = booleans['Container.HasParent'] ? 0 : 1;
		container.offsets = range( Math.max(-pos+h, -n), Math.min(numItems-pos, n) );

		let itemLabels = [];
		if (container.offsets.length > 0)
			itemLabels = await getListItems(controlId)(container.offsets);
		
		const items = {};
		Object.keys(itemLabels).forEach(key => {
			const offset = key.match(/.*\(.*\).*\((.*)\)/)[1];
			if (items[offset] === undefined)
				items[offset] = {};
			const k = key.split('.')[2];
			const value = itemLabels[key];
			items[offset][k] = value;
		})
		Object.keys(items).forEach(offset => {
			items[offset].offset = offset;
		})
		container.itemLabels = itemLabels;
		container.items = items;
		container.system = system;
		container.booleans = booleans;

		vm.menuLabels = container;
		return container;
	}


	const maxPlaybackRate = 128;
	const minPlaybackRate = 1/16;
	let timeStep = 1;
	let temperature = 1;
	let lastTemperature = 1;
	let lastPlayerTime = 0;
	let lastTime = 0;
	let lastLag = id.none;
	const updateTime = ({ time, speed }, startTime) => {

		let localPlaybackRate = If.numeric(id.func, id.mult)(videoElem.playbackRate);
		let localTime = videoElem.currentTime;
		if (!is.numeric(localTime)) {
			return
		}

		const lag = (localTime - startTime) / 2;
		const remoteTime = timeObjToSeconds(time) + lag;
		if (lastLag === id.none) lastLag = lag;

		let delta = remoteTime - localTime;

		const jitter = (lag - lastLag)/lastLag;

		temperature = Math.pow(Math.max(0, Math.min(1, 1 - (1/Math.abs(delta*512)))), 4);
		temperature = Math.abs(1 - (0.9*(1-temperature)));
		temperature = (7*lastTemperature + temperature) / 8;

		const maxJitter = temperature + 0.2;

		timeStep = 1/4;
		let playbackRate = (2*timeStep) / ((-delta*temperature) + (2*timeStep)) * speed;

		if (jitter > maxJitter || jitter < -maxJitter) {
			// bad network - don't re-sync
			videoElem.playbackRate = speed;
			delta = id.none
		}
		else if (!is.numeric(playbackRate) || playbackRate >= maxPlaybackRate || playbackRate <= minPlaybackRate) {
			// quick re-sync
			videoElem.currentTime = localTime += delta;
			videoElem.playbackRate = speed;
			console.log(`jump to ${ localTime } seconds`);
			timeStep = 2;
			temperature = 1;
		}
		else if (is.numeric(playbackRate)) {
			// smooth re-sync

			temperature = temperature * 0.9;

			videoElem.playbackRate = playbackRate;
		}

		vm.stats.delta = Math.round(delta * 1e6) / 1e3;
		vm.stats.lag = Math.round(lastLag * 2e6) / 1e3;
		vm.stats.jitter = Math.round(jitter * 1e3) / 1e3;
		vm.stats.temperature = Math.round(temperature * 100);

		vm.currentTime = Math.round(localTime);
		vm.duration = Math.round(videoElem.duration);
		vm.progress = vm.currentTime / vm.duration;
		vm.speed = speed;

		lastTime = localTime;
		lastPlayerTime = remoteTime;
		lastLag = (7*lastLag + lag) / 8;
		lastTemperature = temperature
	};


	// Game Loops

	// Video Player loop
	const loop = () => {
		getLabels().
		then(getActivePlayer).
		then(If.object(player => {
			videoElem = document.getElementById('xbmc-video');
			const startTime = videoElem.currentTime;
			getTime(player).
				then(If.defined(properties => {
					updateTime(properties, startTime);
				}));
			vm.stopped = false;
		}, () => {
			//nothing playing
			vm.src = '';
			vm.stats = {};
			vm.currentTime = 0;
			vm.duration = 0;
			vm.src = '';
			vm.speed = 0;
			vm.stopped = true;
			videoElem.playbackRate = 0;
			timeStep = 1/2;
		})).
		then(success => {
				waitSeconds(timeStep)().then(loop);
			},
			error => {
				console.error(error);
				waitSeconds(1)().then(loop);
			});
	};
	loop();


	// The other loop
	const menuLoop = () => {
		Promise.all([
			getVolume(),
			getContainerItems()
		]).
		then(success => {
				waitSeconds(0.1)().then(menuLoop);
			},
			error => {
				console.error(error);
				waitSeconds(1)().then(menuLoop);
			})
	};
	menuLoop();

}
