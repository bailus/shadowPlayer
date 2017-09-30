
const eventListenerPreventDefault = f => e => {
	if (e.preventDefault) e.preventDefault() // required by FF + Safari
	f(e)
	return false // required by IE
}


let loadElems = (document) => {
	const elems = {
		container: document.createElement('section'),
		video: document.createElement('video'),
		delta: document.createElement('div'),
		clock: {
			container: document.createElement('div'),
			clockTime: document.createElement('span'),
			finishTime: document.createElement('span')
		},
		now: {
			container: document.createElement('div'),
			text: document.createElement('div'),
			textLineA: document.createElement('div'),
			textLineB: document.createElement('div'),
			title: document.createElement('span'),
			year: document.createElement('span'),
			img: document.createElement('img'),
			show: document.createElement('show'),
			artist: document.createElement('span'),
			album: document.createElement('span'),
			channel: document.createElement('span'),
			productionCode: document.createElement('span')
		},
		next: {
			container: document.createElement('div'),
			text: document.createElement('div'),
			textLineA: document.createElement('div'),
			textLineB: document.createElement('div'),
			title: document.createElement('span'),
			endTime: document.createElement('span')
		}
	}

	elems.container.id = 'videoPlayer'

	elems.clock.container.className = 'clock'
	elems.clock.clockTime.className = 'clockTime'
	elems.clock.finishTime.className = 'finishTime'

	elems.video.autoplay = true
	elems.delta.className = 'delta'

	elems.now.container.className = 'playingNow'
	elems.now.text.className = 'text'
	elems.now.textLineA.className = 'line1'
	elems.now.textLineB.className = 'line2'
	elems.now.title.className = 'title'
	elems.now.year.className = 'year'
	elems.now.img.className = 'thumbnail'
	elems.now.show.className = 'show'
	elems.now.artist.className = 'artist'
	elems.now.album.className = 'album'
	elems.now.productionCode.className = 'productionCode'

	elems.next.container.className = 'playingNext'
	elems.next.text.className = 'text'
	elems.next.textLineA.className = 'line1'
	elems.next.textLineB.className = 'line2'
	elems.next.endTime.className = 'endTime'
	elems.next.title.className = 'title'

	elems.clock.container.append(elems.clock.clockTime)
	elems.clock.container.append(elems.clock.finishTime)

	elems.now.textLineA.append(elems.now.show)
	elems.now.textLineA.append(elems.now.album)
	elems.now.textLineA.append(elems.now.year)
	elems.now.textLineA.append(elems.now.channel)

	elems.now.textLineB.append(elems.now.productionCode)
	elems.now.textLineB.append(elems.now.artist)
	elems.now.textLineB.append(elems.now.title)

	elems.now.text.append(elems.now.textLineA)
	elems.now.text.append(elems.now.textLineB)

	elems.now.container.append(elems.now.img)
	elems.now.container.append(elems.now.text)

	elems.next.textLineA.append(elems.delta)
	elems.next.textLineA.append(elems.next.title)
	elems.next.textLineB.append(elems.next.endTime)

	elems.next.text.append(elems.next.textLineA)
	elems.next.text.append(elems.next.textLineB)

	elems.next.container.append(elems.next.text)

	elems.container.append(elems.video)
	elems.container.append(elems.clock.container)
	elems.container.append(elems.now.container)
	elems.container.append(elems.next.container)


	return elems
}



const init = (elems) => (xbmc) => {

	const waitSeconds = t => x => new Promise(resolve => { window.setTimeout(() => resolve(x), 1000*t) })
	const waitAnimationFrame = x =>  new Promise(resolve => { window.requestAnimationFrame(() => resolve(x)) })

	const prefix = a => b => [ a, b ].join('')
	const prefixPlayer = prefix('Player.')
	const leadingZero = x => (x && (x < 10 ? '0'+x : ''+x))
	const toSeconds = labels => label => {
		const hh = parseInt(labels[`${ label }(hh)`])
		const mm = 60*hh + parseInt(labels[`${ label }(mm)`])
		const ss = 60*mm + parseInt(labels[`${ label }(ss)`])
		return ss
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

	const getLabels = () => xbmc.get({
		'method': 'XBMC.GetInfoLabels',
		'params': {
			'labels': ([  //  http://kodi.wiki/view/InfoLabels
				'Title',
				'Folderpath', 'Filename', 'Filenameandpath',
				'Duration', 'Time',
				'Art(thumb)',
				'FinishTime'

			]).map(prefixPlayer).concat([
				'MusicPlayer.Year', 'VideoPlayer.Year',
				'MusicPlayer.Album', 'MusicPlayer.Artist',
				'VideoPlayer.TVShowTitle', 'VideoPlayer.Season', 'VideoPlayer.Episode',
				'System.Time',
				'VideoPlayer.NextTitle', 'VideoPlayer.NextEndTime',
				'VideoPlayer.ChannelName'
			])
		}
	}).then(labels => {
		labels['VideoPlayer.ProductionCode'] = ([
				leadingZero(labels['VideoPlayer.Season']),
				leadingZero(labels['VideoPlayer.Episode'])
			]).filter(x => x).join('x')

		return labels;
	})

	const ifStringChanged = (cache) => (func) => (hash) => {
		if (cache !== hash) func(hash)
		cache = hash
	}

	const ifVideoChanged = ifStringChanged()
	const ifThumbChanged = ifStringChanged()
	const ifClockTimeChanged = ifStringChanged()
	const ifFinishTimeChanged = ifStringChanged()
	const ifShowChanged = ifStringChanged()
	const ifAlbumChanged = ifStringChanged()
	const ifArtistChanged = ifStringChanged()
	const ifProductionCodeChanged = ifStringChanged()
	const ifChannelChanged = ifStringChanged()

	const ifNextTitleChanged = ifStringChanged()
	const ifNextEndTimeChanged = ifStringChanged()

	const changeProperty = property => object => value => { object[property] = value }
	const changeInnerText = changeProperty('innerText')
	const changeThumb = vfs => { elems.now.img.src = xbmc.vfs2uri(prefixImage(encodeURIComponent(vfs))) }

	const prefixImage = prefix('image://')

	const timeObjToSeconds = o => ((((o.hours*60) + o.minutes)*60) + o.seconds)+(o.milliseconds/1e3)

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

		temperature = Math.pow(1 - Math.max(0, Math.min(1, 1/Math.abs(delta*512))), 2)

		delta = playerTime - elems.video.currentTime
		const playbackRate = (playerTime - lastPlayerTime) / ((elems.video.currentTime - lastTime) / elems.video.playbackRate)

		const adjustedMinDelta = minDelta*playbackRate
		const maxJitter = Math.pow(temperature, 2)/2

		if (jitter > maxJitter || jitter < -maxJitter) {
			// bad network - don't re-sync
			elems.video.playbackRate = speed
			delta = undefined
			temperature = (3*lastTemperature + temperature) / 4
			timeStep = 1/16
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
			timeStep = Math.sqrt(Math.max(1/16, Math.min(1, 1/Math.abs(delta*1024))))/4

			const k = delta * (temperature + lastTemperature) / 2
			temperature = temperature * 0.95

			const t = timeStep * elems.video.playbackRate
			const p = (t+k)/t
			if (isFinite(p))
				elems.video.playbackRate = p*speed
		}

		lastTime = elems.video.currentTime
		lastPlayerTime = playerTime
		lastLag = (7*lastLag + lag) / 8
		lastTemperature = temperature
	}

	const update = (labels) => {
		ifVideoChanged(src => {
			elems.now.title.innerText = labels['Player.Title']
			elems.now.year.innerText = labels['VideoPlayer.Year'] || labels['MusicPlayer.Year']
			elems.video.src = xbmc.vfs2uri(src)
		})(labels['Player.Filenameandpath'])

		ifThumbChanged(changeThumb)(labels['Player.Art(thumb)'])
		ifClockTimeChanged(changeInnerText(elems.clock.clockTime))(labels['System.Time'])
		ifFinishTimeChanged(changeInnerText(elems.clock.finishTime))(labels['Player.FinishTime'])
		ifShowChanged(changeInnerText(elems.now.show))(labels['VideoPlayer.TVShowTitle'])
		ifAlbumChanged(changeInnerText(elems.now.album))(labels['MusicPlayer.Album'])
		ifArtistChanged(changeInnerText(elems.now.artist))(labels['MusicPlayer.Artist'])
		ifProductionCodeChanged(changeInnerText(elems.now.productionCode))(labels['VideoPlayer.ProductionCode'])
		ifChannelChanged(changeInnerText(elems.now.channel))(labels['VideoPlayer.ChannelName'])

		ifNextTitleChanged(changeInnerText(elems.next.title))(labels['VideoPlayer.NextTitle'])
		ifNextEndTimeChanged(changeInnerText(elems.next.endTime))(labels['VideoPlayer.NextEndTime'])

		changeInnerText(elems.delta)(`${ Math.round(delta*1e5) / 1e2 } ms`)
	}


	// attach event handlers to the dom
	elems.video.addEventListener('click', eventListenerPreventDefault(evt => {
		elems.container.classList.toggle('hideGUI')
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


	// Public interface
	return Promise.resolve({
		'elems': elems
	})
}


export default function (document) {
	return init(loadElems(document))
}
