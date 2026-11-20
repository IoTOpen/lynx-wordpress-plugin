/**
 * Shows the current value of inline values in the editor canvas, without
 * touching the stored content.
 *
 * The span's text is a snapshot from when the value was inserted. Instead of
 * changing the span (rich text would pick up any attribute or text change and
 * save it), this injects a stylesheet into the canvas with one rule per
 * source, matched on the span's data attributes, that hides the snapshot and
 * shows the current value with ::after.
 */
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

import { NS } from '../shared/source';
import { fieldText } from '../shared/poll';

const SELECTOR = '.iot-open-lynx-inline[data-lynx-function]';
const STYLE_ID = 'iot-open-lynx-live';
const REFRESH_MS = 60 * 1000;

/** @type {Map<string, {data: Object|null, fetched: number, pending: boolean}>} */
const cache = new Map();

/**
 * The document that holds the editable content: the editor canvas iframe
 * when there is one, otherwise the admin page itself.
 *
 * @return {Document} Document.
 */
function canvasDocument() {
	const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
	return iframe?.contentDocument?.body ? iframe.contentDocument : document;
}

const cssString = ( text ) =>
	'"' +
	String( text )
		.replace( /\\/g, '\\\\' )
		.replace( /"/g, '\\"' )
		.replace( /[\r\n]+/g, ' ' ) +
	'"';

function load( key ) {
	const entry = cache.get( key ) || {
		data: null,
		fetched: 0,
		pending: false,
	};
	cache.set( key, entry );
	if ( entry.pending || Date.now() - entry.fetched < REFRESH_MS ) {
		return;
	}
	const [ backend, installation, func ] = JSON.parse( key );
	entry.pending = true;
	apiFetch( {
		path: addQueryArgs( `${ NS }/data`, {
			backend,
			installation,
			function: func,
		} ),
	} )
		.then( ( data ) => {
			entry.data = data;
		} )
		.catch( () => {
			// Fall back to the snapshot text.
			entry.data = null;
		} )
		.finally( () => {
			entry.pending = false;
			entry.fetched = Date.now();
			update();
		} );
}

function update() {
	const doc = canvasDocument();
	const rules = new Set();

	doc.querySelectorAll( SELECTOR ).forEach( ( el ) => {
		const { lynxBackend, lynxInstallation, lynxFunction } = el.dataset;
		const field = el.dataset.lynxField || 'formatted';
		const key = JSON.stringify( [
			lynxBackend,
			lynxInstallation,
			lynxFunction,
		] );
		load( key );
		const data = cache.get( key ).data;
		const text = data ? fieldText( data, field ) : null;
		if ( text === null ) {
			return;
		}
		const match =
			'.iot-open-lynx-inline' +
			[
				[ 'backend', lynxBackend ],
				[ 'installation', lynxInstallation ],
				[ 'function', lynxFunction ],
				[ 'field', el.dataset.lynxField ],
			]
				.filter( ( [ , value ] ) => value !== undefined )
				.map(
					( [ name, value ] ) =>
						`[data-lynx-${ name }="${ window.CSS.escape(
							value
						) }"]`
				)
				.join( '' );
		rules.add(
			`${ match }{font-size:0}${ match }::after{content:${ cssString(
				text
			) };font-size:var(--iot-open-lynx-font-size)}`
		);
	} );

	const css = [ ...rules ].join( '\n' );
	let style = doc.getElementById( STYLE_ID );
	if ( ! style ) {
		style = doc.createElement( 'style' );
		style.id = STYLE_ID;
		doc.head.appendChild( style );
	}
	if ( style.textContent !== css ) {
		style.textContent = css;
	}
}

// Picks up new values, a replaced canvas iframe (for example when switching
// device preview) and cache entries that have expired.
window.setInterval( update, 1000 );
update();
