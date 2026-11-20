/**
 * Front-end updater for IoT Open Lynx blocks.
 *
 * The server renders the block with the current value; this script refreshes
 * it at the configured interval. Plain DOM, no React, so visitors only
 * download a few hundred bytes.
 */
import { domReady, fieldText, poll } from '../shared/poll';

function setup( el ) {
	let config;
	try {
		config = JSON.parse( el.dataset.config );
	} catch ( e ) {
		return;
	}

	const progress = el.querySelector( '.iot-block-progress' );
	let intervalMs = 0;

	const restartCountdown = () => {
		if ( ! progress ) {
			return;
		}
		progress.style.transition = 'none';
		progress.style.width = '100%';
		// Force a reflow so the transition restarts from 100%.
		// eslint-disable-next-line no-unused-expressions
		progress.offsetWidth;
		progress.style.transition = `width ${ intervalMs }ms linear`;
		progress.style.width = '0%';
	};

	intervalMs = poll( config, {
		onData: ( data ) => {
			el.querySelectorAll( '[data-field]' ).forEach( ( node ) => {
				const text = fieldText( data, node.dataset.field );
				if ( text !== null ) {
					node.textContent = text;
				}
			} );
			el.classList.remove( 'is-error' );
		},
		onError: () => el.classList.add( 'is-error' ),
		onCycle: restartCountdown,
	} );
}

domReady( () => {
	document.querySelectorAll( '.iot-open-lynx[data-config]' ).forEach( setup );
} );
