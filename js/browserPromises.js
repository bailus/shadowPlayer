/**
 * Promise-based API wrappers for various asynchronous browser (DOM) features
 */



export const waitSeconds = t => x => new Promise(resolve => { window.setTimeout(() => resolve(x), 1000*t) })
export const waitAnimationFrame = x =>  new Promise(resolve => { window.requestAnimationFrame(() => resolve(x)) })



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