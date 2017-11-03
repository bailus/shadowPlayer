/**
 * used to display details of the currently selected item
 */



import AltImg from "./altimg.js"

import {
	markup2html,
	image2uri
} from "../stringFormat.js"


export const infoboxLabelNames = [];
const getLabel = label => {
	if (!infoboxLabelNames.includes(label))
		infoboxLabelNames.push(label);
	return `item['${ label }']`
};


export const InfoBox = {
	props: [
		'item'
	],
	components: {
		'alt-img': AltImg
	},
	methods: {
		image2uri: image2uri,
		markup2html: markup2html
	},
	template: `
		<aside class="info">
			<div class="thumb">
				<alt-img v-if="item !== undefined" class="fadeIn" :src="image2uri(${ getLabel('Icon') } || ${ getLabel('ActualIcon') } || ${ getLabel('Thumb') })" :alt-src="${ getLabel('Icon') } || ${ getLabel('ActualIcon') } || ${ getLabel('Thumb') }"></alt-img>
			</div>
			<div class="title" v-if="item">
				<span v-html="markup2html(${ getLabel('Title') } || ${ getLabel('Label') })"></span>
			</div>
			<div class="tagline" v-if="item && ${ getLabel('Tagline') }">
				<span v-html="markup2html(${ getLabel('Tagline') })"></span>
			</div>
			<div class="plot" v-if="item">
				<span v-html="markup2html(${ getLabel('Plot') })"></span>
			</div>
		</aside>`
}
