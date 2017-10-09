/* Various useful functions */


// Promise that resolves when the DOM is loaded
// Credit to Jake Archibald
// https://github.com/jakearchibald/svgomg/blob/master/src/js/page/utils.js#L7
export const ready = () => new Promise(resolve => {
	const check = () => {
		if (document.readyState !== 'loading')
			resolve()
	}
	document.addEventListener('readystatechange', check)
	check()
})

export const compose = f => g => x => f(g(x))

export const mapArray = f => a => Array.prototype.map.call(a, f)
export const flattenArray = a => Array.prototype.concat.apply([], a)
export const bindArray = f => compose(flattenArray, mapArray(f))

export const mapObject = f => x => {
	const o = {}
	Object.keys(x).forEach(key => { o[key] = f(x[key], key, x) })
	return o
}

export const constant = x => y => x
export const id = {
	func: x => x,
	none: constant(),
	mult: constant(1),
	add:  constant(0)
}


export const pushLimitN = (n=1) => (arr=[]) => x => {
	arr.push(x)
	if (arr.length > n)
		arr.splice(0, 1)
}

export const is = {
	truthy: x => ( x == true ),
	defined: x => ( x !== id.none ),
	numeric: x => ( !isNaN(parseFloat(x)) && isFinite(x) ),
	lessThanTen: x => ( x < 10 ),
	object: x => ( typeof x === 'object' && x !== null )
}

export const If = cond => (t=id.func, f=id.none) => x => ( cond(x) ? t(x) : f(x) )
Object.assign(If, mapObject(If)(is))

export const prefix = a => b => ([ a, b ]).join('')
export const suffix = a => b => ([ b, a ]).join('')
export const toString = x => ''+x
export const toNumeric = x => 0+x

export const waitSeconds = t => x => new Promise(resolve => { window.setTimeout(() => resolve(x), 1000*t) })
export const waitAnimationFrame = x =>  new Promise(resolve => { window.requestAnimationFrame(() => resolve(x)) })
