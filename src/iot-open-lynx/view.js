/**
 * Front-end updater for IoT Open Lynx blocks.
 *
 * The server renders the block with the current value; this script refreshes
 * it at the configured interval. Plain DOM, no React, so visitors only
 * download a few hundred bytes.
 */

function setup( el ) {
	let config;
	try {
		config = JSON.parse( el.dataset.config );
	} catch ( e ) {
		return;
	}

	const intervalMs = Math.max( 10, Number( config.refresh ) || 60 ) * 1000;
	const progress = el.querySelector( '.iot-block-progress' );
	let timer = null;
	let lastFetch = 0;

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

	const apply = ( data ) => {
		el.querySelectorAll( '[data-field]' ).forEach( ( node ) => {
			const value = data[ node.dataset.field ];
			if ( node.dataset.field === 'formatted' ) {
				node.textContent =
					value !== undefined && value !== null && value !== ''
						? value
						: '–';
			} else if ( value !== undefined && value !== null ) {
				node.textContent = value;
			}
		} );
	};

	const refresh = async () => {
		lastFetch = Date.now();
		const url = new URL( config.endpoint, window.location.href );
		url.searchParams.set( 'backend', config.backend );
		url.searchParams.set( 'installation', config.installation );
		url.searchParams.set( 'function', config.function );
		url.searchParams.set( 'token', config.token );
		try {
			const response = await window.fetch( url, {
				credentials: 'omit',
			} );
			if ( ! response.ok ) {
				throw new Error( `HTTP ${ response.status }` );
			}
			apply( await response.json() );
			el.classList.remove( 'is-error' );
		} catch ( e ) {
			el.classList.add( 'is-error' );
		}
		restartCountdown();
	};

	const schedule = () => {
		window.clearInterval( timer );
		timer = window.setInterval( () => {
			if ( ! document.hidden ) {
				refresh();
			}
		}, intervalMs );
	};

	// Catch up immediately when a hidden tab becomes visible again.
	document.addEventListener( 'visibilitychange', () => {
		if ( ! document.hidden && Date.now() - lastFetch >= intervalMs ) {
			refresh();
			schedule();
		}
	} );

	// The server-rendered value may come from a page cache, so refresh once now.
	refresh();
	schedule();
}

function init() {
	document.querySelectorAll( '.iot-open-lynx[data-config]' ).forEach( setup );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
