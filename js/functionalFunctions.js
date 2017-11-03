/**
 * Various useful functions for functional programming in js
 */



export const compose = f => g => x => f(g(x))

export const mapArray = f => a => Array.prototype.map.call(a, f)
export const flattenArray = a => Array.prototype.concat.apply([], a)
export const bindArray = f => compose(flattenArray)(mapArray(f))

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
	notEmpty: x => ( x !== undefined && x.length > 0 ),
	defined: x => ( x !== id.none ),
	numeric: x => ( !isNaN(parseFloat(x)) && isFinite(x) ),
	lessThanTen: x => ( x < 10 ),
	object: x => ( typeof x === 'object' && x !== null )
}

export const If = cond => (t=id.func, f=id.none) => x => ( cond(x) ? t(x) : f(x) )
Object.assign(If, mapObject(If)(is))


export const range = (from, to) => {
	const a = [];
	for (let i = from; i < to+1; i++)
		a.push(i);
	return a;
};