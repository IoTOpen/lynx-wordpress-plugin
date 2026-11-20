/**
 * Shared editor UI for picking a Lynx source:
 * backend → installation → device → function.
 *
 * Used by the block's inspector and by the inline value format.
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import { Notice, SelectControl } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

export const NS = '/iot-open-lynx/v1';

/**
 * Fetches a list from the plugin REST API whenever `path` changes.
 * A null path means "not ready yet".
 *
 * @param {string|null} path REST path.
 * @return {{items: Array|null, error: string|null}} State.
 */
export function useList( path ) {
	const [ state, setState ] = useState( { items: null, error: null } );

	useEffect( () => {
		if ( ! path ) {
			setState( { items: null, error: null } );
			return;
		}
		let cancelled = false;
		setState( { items: null, error: null } );
		apiFetch( { path } )
			.then( ( items ) => {
				if ( ! cancelled ) {
					setState( {
						items: Array.isArray( items ) ? items : [],
						error: null,
					} );
				}
			} )
			.catch( ( err ) => {
				if ( ! cancelled ) {
					setState( {
						items: [],
						error:
							err?.message ||
							__( 'Could not load data.', 'iot-open-lynx' ),
					} );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ path ] );

	return state;
}

function options( items, extra = [] ) {
	return [
		{ label: __( '— Select —', 'iot-open-lynx' ), value: '' },
		...( items || [] ).map( ( item ) => ( {
			label: item.name || `#${ item.id }`,
			value: String( item.id ),
		} ) ),
		...extra,
	];
}

/**
 * Loads the lists needed for a source selection.
 *
 * @param {Object} source                Current selection.
 * @param {string} source.lynxId         Backend id.
 * @param {string} source.installationId Installation id.
 * @param {string} source.deviceId       Device id, '0' for all functions.
 * @return {Object} List states for backends, installations, devices and functions.
 */
export function useSourceLists( { lynxId, installationId, deviceId } ) {
	const backends = useList( `${ NS }/backends` );
	const installations = useList(
		lynxId
			? addQueryArgs( `${ NS }/installations`, { backend: lynxId } )
			: null
	);
	const devices = useList(
		lynxId && installationId
			? addQueryArgs( `${ NS }/devices`, {
					backend: lynxId,
					installation: installationId,
			  } )
			: null
	);
	const functions = useList(
		lynxId && installationId && deviceId !== ''
			? addQueryArgs( `${ NS }/functions`, {
					backend: lynxId,
					installation: installationId,
					device: deviceId || 0,
			  } )
			: null
	);
	return { backends, installations, devices, functions };
}

/**
 * Select controls for backend, installation, device and function.
 *
 * @param {Object}   props          Props.
 * @param {Object}   props.source   Current selection ({lynxId, installationId, deviceId, functionId}).
 * @param {Function} props.onChange Called with the changed keys.
 * @param {Object}   props.lists    Result of useSourceLists().
 * @return {Element} Controls.
 */
export function SourceControls( { source, onChange, lists } ) {
	const { lynxId, installationId, deviceId, functionId } = source;
	const { backends, installations, devices, functions } = lists;

	// Pick the backend automatically when there is only one.
	useEffect( () => {
		if ( ! lynxId && backends.items?.length === 1 ) {
			onChange( { lynxId: backends.items[ 0 ].id } );
		}
	}, [ lynxId, backends.items, onChange ] );

	return (
		<>
			{ backends.items?.length === 0 && ! backends.error && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'No backends configured. Add one under Settings → IoT Open Lynx.',
						'iot-open-lynx'
					) }
				</Notice>
			) }
			{ [ backends, installations, devices, functions ]
				.filter( ( s ) => s.error )
				.map( ( s, i ) => (
					<Notice key={ i } status="error" isDismissible={ false }>
						{ s.error }
					</Notice>
				) ) }

			{ backends.items?.length > 1 && (
				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Backend', 'iot-open-lynx' ) }
					value={ lynxId }
					options={ options( backends.items ) }
					onChange={ ( value ) =>
						onChange( {
							lynxId: value,
							installationId: '',
							deviceId: '',
							functionId: '',
						} )
					}
				/>
			) }

			{ lynxId && (
				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Installation', 'iot-open-lynx' ) }
					value={ installationId }
					options={ options( installations.items ) }
					disabled={ ! installations.items }
					onChange={ ( value ) =>
						onChange( {
							installationId: value,
							deviceId: '',
							functionId: '',
						} )
					}
				/>
			) }

			{ lynxId && installationId && (
				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Device', 'iot-open-lynx' ) }
					value={ deviceId }
					options={ options( devices.items, [
						{
							label: __(
								'All functions (no device)',
								'iot-open-lynx'
							),
							value: '0',
						},
					] ) }
					disabled={ ! devices.items }
					onChange={ ( value ) =>
						onChange( { deviceId: value, functionId: '' } )
					}
				/>
			) }

			{ lynxId && installationId && deviceId !== '' && (
				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Function', 'iot-open-lynx' ) }
					value={ functionId }
					options={ options( functions.items ) }
					disabled={ ! functions.items }
					onChange={ ( value ) => onChange( { functionId: value } ) }
				/>
			) }
		</>
	);
}
