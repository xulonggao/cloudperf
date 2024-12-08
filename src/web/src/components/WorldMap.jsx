import { memo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { scaleLinear } from 'd3-scale';
import { Paper, Typography, Box } from '@mui/material';
import L from 'leaflet';

// Scale for line colors based on latency
const colorScale = scaleLinear()
    .domain([50, 250])
    .range(["#00ff00", "#ff0000"]);

// Scale for line width based on latency (inverse - thicker lines for lower latency)
const strokeScale = scaleLinear()
    .domain([50, 250])
    .range([3, 1]);

// Create marker icons
const createIcon = (color, size) => L.divIcon({
    className: 'custom-marker',
    html: `
        <div style="
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.5);
        "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
});

const sourceIcon = createIcon('#3182bd', 8);
const destIcon = createIcon('#e6550d', 12);

const WorldMap = memo(({ data = [], selectedCity }) => {
    useEffect(() => {
        // Force a resize event after component mounts to ensure proper map rendering
        const timer = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    return (
        <Paper
            sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 800,
                backgroundColor: '#f8f9fa'
            }}
        >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
                Global Latency Map {selectedCity ? `- ${selectedCity}` : ''}
            </Typography>
            <Box sx={{
                flexGrow: 1,
                position: 'relative',
                backgroundColor: '#111111',
                borderRadius: 1,
                border: '1px solid #d0d9e4',
                overflow: 'hidden',
                height: 'calc(100% - 80px)',
                '& .leaflet-container': {
                    height: '100%',
                    width: '100%',
                    background: '#242f3e'
                },
                '& .leaflet-tile': {
                    filter: 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)'
                },
                '& .custom-marker': {
                    background: 'transparent',
                    border: 'none'
                },
                '& .leaflet-control': {
                    background: 'rgba(40, 44, 52, 0.9)',
                    color: 'white',
                    border: 'none'
                },
                '& .leaflet-control a': {
                    color: 'white !important'
                },
                '& .leaflet-popup-content-wrapper': {
                    background: 'rgba(40, 44, 52, 0.9)',
                    color: 'white'
                },
                '& .leaflet-popup-tip': {
                    background: 'rgba(40, 44, 52, 0.9)'
                }
            }}>
                <MapContainer
                    center={[20, 0]}
                    zoom={2}
                    minZoom={2}
                    maxZoom={4}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%' }}
                    className="dark-map"
                    attributionControl={false}
                    maxBounds={[[-90, -180], [90, 180]]}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        subdomains={['a', 'b', 'c']}
                        className="dark-tiles"
                    />

                    {/* Draw lines between cities */}
                    {data.map(({ coordinates: { from, to }, latency }, index) => (
                        <Polyline
                            key={`line-${index}`}
                            positions={[
                                [from[1], from[0]],
                                [to[1], to[0]]
                            ]}
                            pathOptions={{
                                color: colorScale(latency),
                                weight: strokeScale(latency),
                                opacity: 0.8
                            }}
                        />
                    ))}

                    {/* Source city markers */}
                    {data.map(({ from, coordinates, latency }, index) => (
                        <Marker
                            key={`source-${index}`}
                            position={[coordinates.from[1], coordinates.from[0]]}
                            icon={sourceIcon}
                        >
                            <Popup>
                                <div style={{ color: '#fff', fontSize: '12px' }}>
                                    {`${from} (${latency}ms)`}
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Destination city marker */}
                    {data.length > 0 && (
                        <Marker
                            position={[data[0].coordinates.to[1], data[0].coordinates.to[0]]}
                            icon={destIcon}
                        >
                            <Popup>
                                <div style={{ color: '#fff', fontSize: '12px' }}>
                                    {selectedCity}
                                </div>
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </Box>
            <Box sx={{
                mt: 'auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 2,
                py: 1,
                backgroundColor: '#ffffff',
                borderRadius: 1,
                border: '1px solid #e0e0e0'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                        Low Latency
                    </Typography>
                    <Box sx={{
                        width: '30px',
                        height: '4px',
                        backgroundColor: '#00ff00',
                        borderRadius: '2px'
                    }} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                        High Latency
                    </Typography>
                    <Box sx={{
                        width: '30px',
                        height: '4px',
                        backgroundColor: '#ff0000',
                        borderRadius: '2px'
                    }} />
                </Box>
            </Box>
        </Paper>
    );
});

export default WorldMap;
