/**
 * img element that loads a second src image if the first can't be loaded
 */



const requestAnimationFrame = f => window.requestAnimationFrame(() => window.requestAnimationFrame(f)) //needed for fadeIn animation

export default {
	props: [ 'src', 'altSrc' ],
	methods: {
		onError: e => {
			const dataset = e.target.dataset
			if (dataset.altSrc !== undefined && dataset.altSrc !== '') {
				e.target.src = dataset.altSrc
				if (dataset.altSrc !== e.target.src) {
					dataset.altSrc = e.target.src
				} else {
					dataset.altSrc = ''
				}
			}
		},
		onLoad: e => {
			const dataset = e.target.dataset
			requestAnimationFrame(() => {
				delete dataset.altSrc
			})
		}
	},
	template: `<img :src.sync="src" :data-alt-src.sync="altSrc" @error="onError" @load="onLoad"></img>`
}