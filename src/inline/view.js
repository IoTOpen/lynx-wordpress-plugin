/**
 * Front-end updater for inline values in running text.
 *
 * Spans that show the same function share one request.
 */
import { domReady, fieldText, poll } from '../shared/poll';

domReady( () => {
	const endpoint = window.iotOpenLynxInline?.endpoint;
	if ( ! endpoint ) {
		return;
	}

	const groups = new Map();
	document
		.querySelectorAll( '.iot-open-lynx-inline[data-lynx-token]' )
		.forEach( ( el ) => {
			const d = el.dataset;
			const key = [
				d.lynxBackend,
				d.lynxInstallation,
				d.lynxFunction,
				d.lynxToken,
			].join( '|' );
			if ( ! groups.has( key ) ) {
				groups.set( key, {
					config: {
						endpoint,
						backend: d.lynxBackend,
						installation: d.lynxInstallation,
						function: d.lynxFunction,
						token: d.lynxToken,
						refresh: 60,
					},
					nodes: [],
				} );
			}
			groups.get( key ).nodes.push( el );
		} );

	groups.forEach( ( { config, nodes } ) => {
		poll( config, {
			onData: ( data ) =>
				nodes.forEach( ( el ) => {
					const text = fieldText(
						data,
						el.dataset.lynxField || 'formatted'
					);
					if ( text !== null ) {
						el.textContent = text;
					}
					el.classList.remove( 'is-error' );
				} ),
			onError: () =>
				nodes.forEach( ( el ) => el.classList.add( 'is-error' ) ),
		} );
	} );
} );
