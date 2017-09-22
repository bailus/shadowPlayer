
const eventListenerPreventDefault = f => e => {
	if (e.preventDefault) e.preventDefault() // required by FF + Safari
	f(e)
	return false // required by IE
}


const loadElems = (document) => {
	const elems = {
		container: document.createElement('section'),
		video: document.createElement('video'),
		info: document.createElement('div'),
		infoText: document.createElement('div'),
		infoTextLineA: document.createElement('div'),
		infoTextLineB: document.createElement('div'),
		title: document.createElement('span'),
		year: document.createElement('span'),
		img: document.createElement('img'),
		clock: document.createElement('div'),
		clockTime: document.createElement('span'),
		finishTime: document.createElement('span'),
		show: document.createElement('show'),
		artist: document.createElement('span'),
		album: document.createElement('span'),
		productionCode: document.createElement('span')
	}

	elems.container.id = 'videoPlayer'
	elems.video.autoplay = true
	elems.info.className = 'info'
	elems.infoText.className = 'infoText'
	elems.infoTextLineA.className = 'line1'
	elems.infoTextLineB.className = 'line2'
	elems.title.className = 'title'
	elems.year.className = 'year'
	elems.img.className = 'thumbnail'
	elems.clock.className = 'clock'
	elems.clockTime.className = 'clockTime'
	elems.finishTime.className = 'finishTime'
	elems.show.className = 'show'
	elems.artist.className = 'artist'
	elems.album.className = 'album'
	elems.productionCode.className = 'productionCode'


	elems.clock.append(elems.clockTime)
	elems.clock.append(elems.finishTime)

	elems.infoTextLineA.append(elems.show)
	elems.infoTextLineA.append(elems.album)
	elems.infoTextLineA.append(elems.year)

	elems.infoTextLineB.append(elems.productionCode)
	elems.infoTextLineB.append(elems.artist)
	elems.infoTextLineB.append(elems.title)

	elems.infoText.append(elems.infoTextLineA)
	elems.infoText.append(elems.infoTextLineB)

	elems.info.append(elems.img)
	elems.info.append(elems.infoText)

	elems.container.append(elems.video)
	elems.container.append(elems.clock)
	elems.container.append(elems.info)


	return elems
}


const init = (elems) => (xbmc) => {

	const waitSeconds = t => x => new Promise(resolve => { window.setTimeout(() => resolve(x), 1000*t) })
	const waitAnimationFrame = x =>  new Promise(resolve => { window.requestAnimationFrame(() => resolve(x)) })

	const prefix = a => b => [ a, b ].join('')
	const prefixPlayer = prefix('Player.')

	const getLabels = () => xbmc.get({
		'method': 'XBMC.GetInfoLabels',
		'params': {
			'labels': ([  //  http://kodi.wiki/view/InfoLabels
				'Title',
				'Folderpath', 'Filename', 'Filenameandpath',
				'Duration(hh)', 'Duration(mm)', 'Duration(ss)', 
				'Time(hh)', 'Time(mm)', 'Time(ss)',
				'Art(thumb)',
				'FinishTime'

			]).map(prefixPlayer).concat([
				'MusicPlayer.Year', 'VideoPlayer.Year',
				'MusicPlayer.Album', 'MusicPlayer.Artist',
				'VideoPlayer.TVShowTitle', 'VideoPlayer.Season', 'VideoPlayer.Episode',
				'System.Time'
			])
		}
	})

	const leadingZero = x => x && (x < 10 ? '0'+x : ''+x)
	const formatLabels = labels => {
		const toSeconds = (label) => {
			const hh = parseInt(labels[`${ label }(hh)`])
			const mm = 60*hh + parseInt(labels[`${ label }(mm)`])
			const ss = 60*mm + parseInt(labels[`${ label }(ss)`])
			return ss
		};

		([ 'DurationInSeconds', 'Time' ]).forEach(x => { const y = prefixPlayer(x); labels[y] = toSeconds(y) });

		labels['VideoPlayer.ProductionCode'] = ([
				leadingZero(labels['VideoPlayer.Season']),
				leadingZero(labels['VideoPlayer.Episode'])
			]).filter(x => x).join('x')

		return labels;
	}

	const getBooleans = () => xbmc.get({
		'method': 'XBMC.GetInfoBooleans',
		'params': {
			'booleans': ([  //  https://github.com/xbmc/xbmc/blob/master/xbmc/GUIInfoManager.cpp
				'HasMedia',
				'Playing', 'Paused', 'Rewinding', 'Forwarding',
				'Muted',
				'HasAudio', 'HasVideo', 
				'IsInternetStream',
			]).map(prefixPlayer)
		}
	})

	const formatBooleans = booleans => {
		booleans['Player.Status'] =
				booleans['Player.Paused'] ? 'paused' :
				booleans['Player.Playing'] ? 'playing' :
				'stopped'
		return booleans
	}


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

	const changeProperty = property => object => value => { object[property] = value }
	const changeInnerText = changeProperty('innerText')
	const changeThumb = vfs => { elems.img.src = xbmc.vfs2uri(prefixImage(encodeURIComponent(vfs))) }

	const prefixImage = prefix('image://')


	// This is the main function that checks the state of Kodi and updates the DOM accordingly
	const maxDelta = 1.0
	const update = ([ labels, booleans ]) => {

		ifVideoChanged(src => {
			elems.title.innerText = labels['Player.Title']
			elems.year.innerText = labels['VideoPlayer.Year'] || labels['MusicPlayer.Year']
			elems.video.src = xbmc.vfs2uri(src)
		})(labels['Player.Filenameandpath'])

		ifThumbChanged(changeThumb)(labels['Player.Art(thumb)'])

		const playerTime = labels['Player.Time']
		const delta = playerTime - elems.video.currentTime 
		if (delta > maxDelta || delta < -maxDelta) {
			elems.video.currentTime = playerTime
		}

		ifClockTimeChanged(changeInnerText(elems.clockTime))(labels['System.Time'])
		ifFinishTimeChanged(changeInnerText(elems.finishTime))(labels['Player.FinishTime'])
		ifShowChanged(changeInnerText(elems.show))(labels['VideoPlayer.TVShowTitle'])
		ifAlbumChanged(changeInnerText(elems.album))(labels['MusicPlayer.Album'])
		ifArtistChanged(changeInnerText(elems.artist))(labels['MusicPlayer.Artist'])
		ifProductionCodeChanged(changeInnerText(elems.productionCode))(labels['VideoPlayer.ProductionCode'])

	}


	// attach event handlers to the dom
	elems.video.addEventListener('click', eventListenerPreventDefault(evt => {
		elems.container.classList.toggle('hideGUI')
	}))


	// One loop to rule them all (ie. the game loop)
	const loop = () => {
		Promise.all([
			getLabels().then(formatLabels),
			getBooleans().then(formatBooleans)
		]).
		then(waitAnimationFrame).
		then(update).
		then(success => {
			waitSeconds(0.1)().then(loop)
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
