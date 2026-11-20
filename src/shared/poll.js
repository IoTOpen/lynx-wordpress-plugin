/**
 * Polls the public /data route for one signed backend/installation/function
 * combination. Pauses while the tab is hidden and catches up when it is shown.
 *
 * @param {Object}   config              Source and signature; also has a `function` key with the function id.
 * @param {string}   config.endpoint     URL of the /data route.
 * @param {string}   config.backend      Backend id.
 * @param {number}   config.installation Installation id.
 * @param {string}   config.token        Signature from the server.
 * @param {number}   config.refresh      Interval in seconds (min 10).
 * @param {Object}   handlers            Callbacks.
 * @param {Function} handlers.onData     Called with the response data.
 * @param {Function} handlers.onError    Called when a request fails.
 * @param {Function} [handlers.onCycle]  Called after every request.
 * @return {number} The interval in milliseconds.
 */
export function poll( config, { onData, onError, onCycle } ) {
	const intervalMs = Math.max( 10, Number( config.refresh ) || 60 ) * 1000;
	let timer = null;
	let lastFetch = 0;

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
			onData( await response.json() );
		} catch ( e ) {
			onError( e );
		}
		if ( onCycle ) {
			onCycle();
		}
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

	return intervalMs;
}

/**
 * Text to show for a field, with a dash for a missing value.
 *
 * @param {Object} data  Response data.
 * @param {string} field Field name.
 * @return {string|null} Text, or null to leave the node unchanged.
 */
export function fieldText( data, field ) {
	const value = data[ field ];
	if ( field === 'formatted' ) {
		return value !== undefined && value !== null && value !== ''
			? String( value )
			: '–';
	}
	return value !== undefined && value !== null ? String( value ) : null;
}

/**
 * Runs `fn` once the DOM is ready.
 *
 * @param {Function} fn Callback.
 */
export function domReady( fn ) {
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', fn );
	} else {
		fn();
	}
}
