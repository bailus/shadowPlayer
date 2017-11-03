/**
 * similar to Kodi's <control type="fixedlist">
 */



import AltImg from "./altimg.js"

import {
	markup2html,
	image2uri
} from "../stringFormat.js"


export const itemLabelNames = [];
const getLabel = label => {
	if (!itemLabelNames.includes(label))
		itemLabelNames.push(label);
	return `item['${ label }']`
};

export const FixedList = {
	props: [
		'id', 'items'
	],
	components: {
		'alt-img': AltImg
	},
	methods: {
		image2uri: image2uri,
		markup2html: markup2html,
		sortItems: items => Object.keys(items).map(key => items[key]).sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset))
	},
	data: {
		
	},
	template: `
		<div class="control fixedlist" :data-id="id">
			<ul>
				<li v-for="item in sortItems(items)" :style="'--item_order: '+item.offset+';'" :data-order="item.offset" :data-row="${ getLabel('Row') }" :data-column="${ getLabel('Column') }">
					<span class="icon"><alt-img :src="image2uri(${ getLabel('Icon') } || ${ getLabel('ActualIcon') } || ${ getLabel('Thumb') })" :alt-src="${ getLabel('Icon') } || ${ getLabel('ActualIcon') } || ${ getLabel('Thumb') }" class="hideWhileLoading"></alt-img></span>
					<span class="label" v-html="markup2html(${ getLabel('Label') })"></span>
					<span class="label2" v-html="markup2html(${ getLabel('Label2') })"></span>
				</li>
			</ul>
		</div>`
}
