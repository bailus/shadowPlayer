
const eventListenerPreventDefault = f => e => {
	if (e.preventDefault) e.preventDefault() // required by FF + Safari
	f(e)
	return false // required by IE
}


let loadElems = (document) => {
	const elems = {
		container: document.createElement('section'),
		video: document.createElement('video'),
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

	const getTime = () => xbmc.get({
		'method': 'XBMC.GetInfoLabels',
		'params': {
			'labels': ([  //  http://kodi.wiki/view/InfoLabels
				'Time(hh)', 'Time(mm)', 'Time(ss)',

			]).map(prefixPlayer)
		}
	}).then(labels => {
		labels['Player.Time'] = toSeconds(labels)('Player.Time')
		return labels;
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


	// This is the main function that checks the state of Kodi and updates the DOM accordingly
	const maxDelta = 0.5
	let lag = 0
	let lastDelta = 0
	const updateTime = (labels, startTime) => {
		lag = (lag + elems.video.currentTime - startTime) / 4
		const playerTime = labels['Player.Time'] + lag
		const newDelta = playerTime - elems.video.currentTime
		const delta = (newDelta*3 + lastDelta) / 4
		lastDelta = newDelta
		if (delta > maxDelta || delta < -maxDelta) {
			elems.video.currentTime = playerTime
		}

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
	}


	// attach event handlers to the dom
	elems.video.addEventListener('click', eventListenerPreventDefault(evt => {
		elems.container.classList.toggle('hideGUI')
	}))


	// One loop to rule them all (ie. the game loop)
	const loop = () => {
		let startTime = elems.video.currentTime
		Promise.resolve().
		then(getTime).
		then(labels => updateTime(labels, startTime)).
		then(getLabels).
		then(waitAnimationFrame).
		then(update).
		then(success => {
				waitSeconds(1)().then(loop)
			},
			error => {
				console.error(error)
				waitSeconds(10)().then(loop)
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
