import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import {
	useBlockProps,
	InspectorControls,
	PanelColorSettings,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	ExternalLink,
	Notice,
	Placeholder,
	Spinner,
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import ServerSideRender from '@wordpress/server-side-render';

const NS = '/iot-open-lynx/v1';

/**
 * Fetches a list from the plugin REST API whenever `path` changes.
 * A null path means "not ready yet".
 *
 * @param {string|null} path REST path.
 * @return {{items: Array|null, error: string|null}} State.
 */
function useList( path ) {
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

export default function Edit( { attributes, setAttributes } ) {
	const {
		lynxId,
		installationId,
		deviceId,
		functionId,
		refreshInterval,
		showValues,
		textColor,
		valueColor,
		backgroundColor,
		valueFontSize,
		functionFontSize,
		deviceFontSize,
		lastUpdatedFontSize,
		lastUpdatedPosition,
	} = attributes;

	const blockProps = useBlockProps();

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

	// Pick the backend automatically when there is only one.
	useEffect( () => {
		if ( ! lynxId && backends.items?.length === 1 ) {
			setAttributes( { lynxId: backends.items[ 0 ].id } );
		}
	}, [ lynxId, backends.items, setAttributes ] );

	const backend = backends.items?.find( ( b ) => b.id === lynxId );
	const toggle = ( key ) => ( value ) =>
		setAttributes( { showValues: { ...showValues, [ key ]: value } } );
	const position =
		lastUpdatedPosition === 'middle' ? 'center' : lastUpdatedPosition;

	const settings = (
		<InspectorControls>
			<PanelBody title={ __( 'Source', 'iot-open-lynx' ) }>
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
						<Notice
							key={ i }
							status="error"
							isDismissible={ false }
						>
							{ s.error }
						</Notice>
					) ) }

				{ backends.items?.length > 1 && (
					<SelectControl
						__nextHasNoMarginBottom
						label={ __( 'Backend', 'iot-open-lynx' ) }
						value={ lynxId }
						options={ options( backends.items ) }
						onChange={ ( value ) =>
							setAttributes( {
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
						label={ __( 'Installation', 'iot-open-lynx' ) }
						value={ installationId }
						options={ options( installations.items ) }
						disabled={ ! installations.items }
						onChange={ ( value ) =>
							setAttributes( {
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
							setAttributes( { deviceId: value, functionId: '' } )
						}
					/>
				) }

				{ lynxId && installationId && deviceId !== '' && (
					<SelectControl
						__nextHasNoMarginBottom
						label={ __( 'Function', 'iot-open-lynx' ) }
						value={ functionId }
						options={ options( functions.items ) }
						disabled={ ! functions.items }
						onChange={ ( value ) =>
							setAttributes( { functionId: value } )
						}
					/>
				) }

				{ backend?.base_uri && installationId && functionId && (
					<div className="iot-open-lynx-links">
						<ExternalLink
							href={ `${ backend.base_uri }/installations/${ installationId }/functions/edit/${ functionId }` }
						>
							{ __(
								'Open function in IoT Open',
								'iot-open-lynx'
							) }
						</ExternalLink>
						{ deviceId && deviceId !== '0' && (
							<ExternalLink
								href={ `${ backend.base_uri }/installations/${ installationId }/devices/edit/${ deviceId }` }
							>
								{ __(
									'Open device in IoT Open',
									'iot-open-lynx'
								) }
							</ExternalLink>
						) }
					</div>
				) }

				<RangeControl
					__nextHasNoMarginBottom
					label={ __(
						'Refresh interval (seconds)',
						'iot-open-lynx'
					) }
					value={ refreshInterval }
					onChange={ ( value ) =>
						setAttributes( { refreshInterval: value || 60 } )
					}
					min={ 10 }
					max={ 600 }
				/>
			</PanelBody>

			<PanelBody title={ __( 'Show', 'iot-open-lynx' ) }>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Value', 'iot-open-lynx' ) }
					checked={ !! showValues.value }
					onChange={ toggle( 'value' ) }
				/>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Function name', 'iot-open-lynx' ) }
					checked={ !! showValues.functionName }
					onChange={ toggle( 'functionName' ) }
				/>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Device name', 'iot-open-lynx' ) }
					checked={ !! showValues.deviceName }
					onChange={ toggle( 'deviceName' ) }
				/>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Installation name', 'iot-open-lynx' ) }
					checked={ !! showValues.installationName }
					onChange={ toggle( 'installationName' ) }
				/>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Last updated', 'iot-open-lynx' ) }
					checked={ !! showValues.lastUpdated }
					onChange={ toggle( 'lastUpdated' ) }
				/>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Countdown to next refresh', 'iot-open-lynx' ) }
					checked={ !! showValues.countdown }
					onChange={ toggle( 'countdown' ) }
				/>
			</PanelBody>
		</InspectorControls>
	);

	const styles = (
		<InspectorControls group="styles">
			<PanelColorSettings
				title={ __( 'Colors', 'iot-open-lynx' ) }
				colorSettings={ [
					{
						value: valueColor,
						onChange: ( color ) =>
							setAttributes( { valueColor: color || '' } ),
						label: __( 'Value', 'iot-open-lynx' ),
					},
					{
						value: textColor,
						onChange: ( color ) =>
							setAttributes( { textColor: color || '' } ),
						label: __( 'Text', 'iot-open-lynx' ),
					},
					{
						value: backgroundColor,
						onChange: ( color ) =>
							setAttributes( { backgroundColor: color || '' } ),
						label: __( 'Background', 'iot-open-lynx' ),
					},
				] }
			/>
			<PanelBody title={ __( 'Font sizes', 'iot-open-lynx' ) }>
				<RangeControl
					__nextHasNoMarginBottom
					label={ __( 'Value', 'iot-open-lynx' ) }
					value={ valueFontSize }
					onChange={ ( val ) =>
						setAttributes( { valueFontSize: val } )
					}
					min={ 12 }
					max={ 120 }
				/>
				<RangeControl
					__nextHasNoMarginBottom
					label={ __( 'Function name', 'iot-open-lynx' ) }
					value={ functionFontSize }
					onChange={ ( val ) =>
						setAttributes( { functionFontSize: val } )
					}
					min={ 8 }
					max={ 40 }
				/>
				<RangeControl
					__nextHasNoMarginBottom
					label={ __(
						'Device and installation name',
						'iot-open-lynx'
					) }
					value={ deviceFontSize }
					onChange={ ( val ) =>
						setAttributes( { deviceFontSize: val } )
					}
					min={ 8 }
					max={ 40 }
				/>
				<RangeControl
					__nextHasNoMarginBottom
					label={ __( 'Last updated', 'iot-open-lynx' ) }
					value={ lastUpdatedFontSize }
					onChange={ ( val ) =>
						setAttributes( { lastUpdatedFontSize: val } )
					}
					min={ 8 }
					max={ 30 }
				/>
				<SelectControl
					__nextHasNoMarginBottom
					label={ __( 'Last updated alignment', 'iot-open-lynx' ) }
					value={ position }
					options={ [
						{ label: __( 'Left', 'iot-open-lynx' ), value: 'left' },
						{
							label: __( 'Center', 'iot-open-lynx' ),
							value: 'center',
						},
						{
							label: __( 'Right', 'iot-open-lynx' ),
							value: 'right',
						},
					] }
					onChange={ ( val ) =>
						setAttributes( { lastUpdatedPosition: val } )
					}
				/>
			</PanelBody>
		</InspectorControls>
	);

	const configured = lynxId && installationId && functionId;

	return (
		<>
			{ settings }
			{ styles }
			<div { ...blockProps }>
				{ configured ? (
					<ServerSideRender
						block="iot-open-lynx/iot-open-block"
						attributes={ attributes }
						httpMethod="POST"
						skipBlockSupportAttributes
						LoadingResponsePlaceholder={ () => (
							<div className="iot-open-lynx-placeholder">
								<Spinner />
							</div>
						) }
					/>
				) : (
					<Placeholder
						icon="chart-line"
						label={ __( 'IoT Open Lynx value', 'iot-open-lynx' ) }
						instructions={ __(
							'Choose installation, device and function in the block settings.',
							'iot-open-lynx'
						) }
					/>
				) }
			</div>
		</>
	);
}
