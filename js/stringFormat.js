/**
 * String formatting functions
 */



import {
	If, id
} from "./functionalFunctions.js"



const tags = {
	'COLOR': 'color:$1',
	'B': 'font-weight:bold',
	'UPPERCASE': 'text-transform:capitalize',
	'I': 'font-style:italic'
}

const tagsSelfClosing = {
	'CR': "\n"
}

export const markup2html = l => {
	Object.keys(tags).forEach(key => {
		l = l.replace(new RegExp(`\\[${ key } ?(.*?)\\]`, 'gi'), `<span style="${ tags[key] }">`)
		l = l.replace(new RegExp(`\\[\/${ key }\\]`, 'gi'), '</span>')
	})
	Object.keys(tagsSelfClosing).forEach(key => {
		l = l.replace(new RegExp(`\\[${ key } ?(.*?)\\]`, 'gi'), tagsSelfClosing[key])
	})
	return l
}



export const vfs2uri = (isImage) => If.notEmpty((vfs, type) => {
	let vfsUrl = undefined
	let isRelative = false
	try {
		vfsUrl = new URL(vfs)
	} catch(e) { //relative URL
		return new URL(vfs, new URL('skin.estuary/media/', window.location.href).href).href
	}

	const vfsProtocol = vfsUrl.protocol

	if (!isImage && vfsProtocol === 'http:' || vfsProtocol === 'https:' || vfsProtocol === 'pvr:') {
		return vfs;
	}

	let path = '/vfs/'
	if (vfsProtocol === 'file:' || vfsProtocol === 'image:' || vfsProtocol === 'http:' || vfsProtocol === 'resource:' || vfsProtocol === 'special:') {
		path = '/image/'
	}

	return new URL(encodeURIComponent(vfs), new URL(path, window.location.href).href).href
})

export const image2uri = vfs2uri(true)
export const media2uri = vfs2uri(false)



export const timeObjToSeconds = o => ((((o.hours*60) + o.minutes)*60) + o.seconds) + (o.milliseconds/1e3)
export const secondsToTimeObj = s => ({ 'hours': Math.floor(s/3600), 'minutes': Math.floor(s/60)%60, 'seconds': s%60 })

export function seconds2shortstring (seconds) {
	const format = n => (n < 10 ? '0' : '')+Math.floor(n)

	const s = Math.abs(seconds)
	const h = s >= 3600 && Math.floor(s/3600)
	const mm = format((s%3600)/60)
	const ss = format(s%60)

	return (seconds < 0 ? '-' : '') +
		(h === false ? '' : `${h}:`) + `${mm}:${ss}`
}



export const prefix = a => b => ([ a, b ]).join('')
export const suffix = a => b => ([ b, a ]).join('')

export const toString = x => ''+x
export const toNumeric = x => 0+x

export const prefixImage = prefix('image://')
export const prefixZero = prefix('0')

export const leadingZero = If.numeric(If.lessThanTen(prefixZero, toString), id.func)