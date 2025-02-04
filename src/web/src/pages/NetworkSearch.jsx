import { useState, useEffect } from 'react';
import React from 'react';
import {
    fetchCitySets,
    fetchCountries,
    fetchCities,
    fetchAsns,
    fetchPerformanceData
} from '../services/api';
import {
    Box,
    Container,
    Paper,
    Typography,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    TextField,
    Card,
    CardContent,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function NetworkSearch() {
    // State for source selection
    const [citySets, setCitySets] = useState([]);
    const [selectedSet, setSelectedSet] = useState('');

    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');

    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState('');

    const [asns, setAsns] = useState([]);
    const [selectedAsns, setSelectedAsns] = useState([]);

    // State for destination selection
    const [destCountries, setDestCountries] = useState([]);
    const [selectedDestCountry, setSelectedDestCountry] = useState('');

    const [destCities, setDestCities] = useState([]);
    const [selectedDestCity, setSelectedDestCity] = useState('');

    const [destAsns, setDestAsns] = useState([]);
    const [selectedDestAsns, setSelectedDestAsns] = useState([]);

    // State for performance data
    const [performanceData, setPerformanceData] = useState(null);

    useEffect(() => {
        // Fetch city sets and countries on mount
        const fetchInitialData = async () => {
            try {
                const [setsData, countriesData] = await Promise.all([
                    fetchCitySets(),
                    fetchCountries()
                ]);
                setCitySets(setsData);
                setCountries(countriesData);
                setDestCountries(countriesData);
            } catch (error) {
                console.error('Error fetching initial data:', error);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        // Fetch countries when city sets is selected
        setSelectedDestCountry('');
        if (selectedSet) {
            setDestCountries([]);
            fetchCountries(selectedSet)
                .then(data => setDestCountries(data))
                .catch(error => console.error('Error fetching dist countries:', error));
        } else {
            setDestCountries(countries);
        }
    }, [selectedSet]);

    // Fetch cities when country is selected
    useEffect(() => {
        setSelectedCity('');
        setCities([]);
        if (selectedCountry) {
            fetchCities(selectedCountry)
                .then(data => setCities(data))
                .catch(error => console.error('Error fetching cities:', error));
        }
    }, [selectedCountry]);

    // Fetch ASNs when city is selected
    useEffect(() => {
        setSelectedAsns([]);
        setAsns([]);
        if (selectedCountry && selectedCity) {
            fetchAsns(selectedCountry, selectedCity)
                .then(data => setAsns(data))
                .catch(error => console.error('Error fetching ASNs:', error));
        }
    }, [selectedCountry, selectedCity]);

    // Similar effects for destination selection
    useEffect(() => {
        setSelectedDestCity('');
        setDestCities([]);
        if (selectedDestCountry) {
            fetchCities(selectedDestCountry, selectedSet)
                .then(data => setDestCities(data))
                .catch(error => console.error('Error fetching destination cities:', error));
        }
    }, [selectedDestCountry]);

    useEffect(() => {
        setSelectedDestAsns([]);
        setDestAsns([]);
        if (selectedDestCountry && selectedDestCity) {
            fetchAsns(selectedDestCountry, selectedDestCity, selectedSet)
                .then(data => setDestAsns(data))
                .catch(error => console.error('Error fetching destination ASNs:', error));
        }
    }, [selectedDestCountry, selectedDestCity]);

    const handleSearch = async () => {
        // Clear existing performance data first
        setPerformanceData(null);

        const srcCityIds = selectedSet
            ? citySets.find(set => set.id === selectedSet)?.cityIds
            : (selectedAsns.length ? selectedAsns.map(asn => asn.cityId) : asns.map(asn => asn.cityId));

        const destCityIds = selectedDestAsns.length ? selectedDestAsns.map(asn => asn.cityId)
            : destAsns.map(asn => asn.cityId);

        try {
            const data = await fetchPerformanceData(srcCityIds, destCityIds);
            setPerformanceData(data);
        } catch (error) {
            console.error('Error fetching performance data:', error);
        }
    };

    // Calculate map bounds based on all markers
    const getBounds = () => {
        if (!performanceData) return [[0, 0], [0, 0]];
        const points = [
            ...performanceData.latencyData.map(data => [data.srcLat, data.srcLon]),
            ...performanceData.latencyData.map(data => [data.destLat, data.destLon])
        ];
        if (points.length === 0) return [[0, 0], [0, 0]];
        const lats = points.map(p => p[0]);
        const lons = points.map(p => p[1]);
        return [
            [Math.min(...lats), Math.min(...lons)],
            [Math.max(...lats), Math.max(...lons)]
        ];
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
                {/* Source Selection */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Source Selection
                        </Typography>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>City Set</InputLabel>
                            <Select
                                value={selectedSet}
                                onChange={(e) => setSelectedSet(e.target.value)}
                                label="City Set"
                            >
                                <MenuItem value="">
                                    <em>None</em>
                                </MenuItem>
                                {citySets.map(set => (
                                    <MenuItem key={set.id} value={set.id}>{set.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {!selectedSet && (
                            <>
                                <Autocomplete
                                    options={countries}
                                    getOptionLabel={(option) => option.name}
                                    value={countries.find(c => c.code === selectedCountry) || null}
                                    onChange={(_, newValue) => setSelectedCountry(newValue?.code || '')}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Country" fullWidth sx={{ mb: 2 }} />
                                    )}
                                />

                                <Autocomplete
                                    options={cities}
                                    getOptionLabel={(option) => option.name}
                                    value={cities.find(c => c.id === selectedCity) || null}
                                    onChange={(_, newValue) => setSelectedCity(newValue?.id || '')}
                                    disabled={!selectedCountry}
                                    renderInput={(params) => (
                                        <TextField {...params} label="City" fullWidth sx={{ mb: 2 }} />
                                    )}
                                />

                                <Autocomplete
                                    multiple
                                    options={asns}
                                    getOptionLabel={(option) => `${option.asnName} (ASN${option.asn})`}
                                    value={selectedAsns}
                                    onChange={(_, newValue) => setSelectedAsns(newValue)}
                                    disabled={!selectedCity}
                                    renderInput={(params) => (
                                        <TextField {...params} label="ASNs" fullWidth />
                                    )}
                                />
                            </>
                        )}
                    </Paper>
                </Grid>

                {/* Destination Selection */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Destination Selection
                        </Typography>
                        <Autocomplete
                            options={destCountries}
                            getOptionLabel={(option) => option.name}
                            value={destCountries.find(c => c.code === selectedDestCountry) || null}
                            onChange={(_, newValue) => setSelectedDestCountry(newValue?.code || '')}
                            renderInput={(params) => (
                                <TextField {...params} label="Country" fullWidth sx={{ mb: 2 }} />
                            )}
                        />

                        <Autocomplete
                            options={destCities}
                            getOptionLabel={(option) => option.name}
                            value={destCities.find(c => c.id === selectedDestCity) || null}
                            onChange={(_, newValue) => setSelectedDestCity(newValue?.id || '')}
                            disabled={!selectedDestCountry}
                            renderInput={(params) => (
                                <TextField {...params} label="City" fullWidth sx={{ mb: 2 }} />
                            )}
                        />

                        <Autocomplete
                            multiple
                            options={destAsns}
                            getOptionLabel={(option) => `${option.asnName} (ASN${option.asn})`}
                            value={selectedDestAsns}
                            onChange={(_, newValue) => setSelectedDestAsns(newValue)}
                            disabled={!selectedDestCity}
                            renderInput={(params) => (
                                <TextField {...params} label="ASNs" fullWidth />
                            )}
                        />
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                        <Button
                            variant="contained"
                            onClick={handleSearch}
                            disabled={
                                (!selectedSet && (!selectedCity.length)) ||
                                !selectedDestCity.length
                            }
                        >
                            Search
                        </Button>
                    </Box>
                </Grid>

                {performanceData && (
                    <>
                        {/* Metrics Cards */}
                        <Grid item xs={12}>
                            <Grid container spacing={2}>
                                <Grid item xs={3}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="textSecondary" gutterBottom>
                                                Sample Count
                                            </Typography>
                                            <Typography variant="h5">
                                                {performanceData.samples} ({performanceData.srcCityIds}/{performanceData.distCityIds})
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={1.5}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="textSecondary" gutterBottom>
                                                Avg Latency
                                            </Typography>
                                            <Typography variant="h5">
                                                {performanceData.avg}ms
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={1.5}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="textSecondary" gutterBottom>
                                                P50 Latency
                                            </Typography>
                                            <Typography variant="h5">
                                                {performanceData.p50}ms
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={1.5}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="textSecondary" gutterBottom>
                                                P70 Latency
                                            </Typography>
                                            <Typography variant="h5">
                                                {performanceData.p70}ms
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={1.5}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="textSecondary" gutterBottom>
                                                P90 Latency
                                            </Typography>
                                            <Typography variant="h5">
                                                {performanceData.p90}ms
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={1.5}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="textSecondary" gutterBottom>
                                                P95 Latency
                                            </Typography>
                                            <Typography variant="h5">
                                                {performanceData.p95}ms
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={1.5}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="textSecondary" gutterBottom>
                                                Max Latency
                                            </Typography>
                                            <Typography variant="h5">
                                                {performanceData.max}ms
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Latency vs Distance Scatter Chart */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Latency vs Distance
                                </Typography>
                                <ResponsiveContainer width="100%" height={400}>
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid />
                                        <XAxis
                                            type="number"
                                            dataKey="distance"
                                            name="Distance"
                                            unit=" km"
                                            label={{ value: 'Distance (km)', position: 'bottom' }}
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey="latency"
                                            name="Latency"
                                            unit=" ms"
                                            label={{ value: 'Latency (ms)', angle: -90, position: 'left' }}
                                        />
                                        <Tooltip
                                            cursor={{ strokeDasharray: '3 3' }}
                                            formatter={(value, name, props) => {
                                                if (name === 'Distance') return `${Math.round(value)} km`;
                                                if (name === 'Latency') return `${value} ms`;
                                                return value;
                                            }}
                                            content={({ payload, active }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
                                                            <p>{`Source: ${data.srcCity} ${data.srcAsn}`}</p>
                                                            <p>{`Destination: ${data.destCity} ${data.destAsn}`}</p>
                                                            <p>{`Distance: ${Math.round(data.distance)} km`}</p>
                                                            <p>{`Latency: ${data.latency} ms`}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        {Array.from(new Set(performanceData.latencyData.map(d => d.srcCity))).map((srcCity, index) => (
                                            <Scatter
                                                key={srcCity}
                                                name={srcCity}
                                                data={performanceData.latencyData
                                                    .filter(d => d.srcCity === srcCity)
                                                    .map(d => ({
                                                        ...d,
                                                        distance: calculateDistance(d.srcLat, d.srcLon, d.destLat, d.destLon)
                                                    }))}
                                                fill={`hsl(${(index * 360) / 20}, 70%, 50%)`}
                                            />
                                        ))}
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>

                        {/* Time Series Chart */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Latency Trend (Last 7 Days)
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={performanceData.timeSeriesData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="p70Latency" stroke="#8884d8" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>

                        {/* ASN and City Charts */}
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    ASN Latency Distribution
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={performanceData.asnData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="asn" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="p70" fill="#8884d8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    City Latency Distribution
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={performanceData.cityData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="city" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="p70" fill="#82ca9d" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>

                        {/* Map */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Location Distribution
                                </Typography>
                                <Box sx={{ height: 400 }}>
                                    <MapContainer
                                        bounds={getBounds()}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                        {performanceData.latencyData.map(data => (
                                            <React.Fragment key={`pair-${data.srcCity}-${data.destCity}`}>
                                                <Marker
                                                    position={[data.srcLat, data.srcLon]}
                                                >
                                                    <Popup>
                                                        {data.srcCity}<br />
                                                        {data.srcAsn}
                                                    </Popup>
                                                </Marker>
                                                <Marker
                                                    position={[data.destLat, data.destLon]}
                                                >
                                                    <Popup>
                                                        {data.destCity}<br />
                                                        {data.destAsn}
                                                    </Popup>
                                                </Marker>
                                            </React.Fragment>
                                        ))}
                                        {/* Lines connecting source to destination with latency */}
                                        {performanceData.latencyData.map(data => (
                                            <Polyline
                                                key={`${data.srcCity}-${data.destCity}`}
                                                positions={[
                                                    [data.srcLat, data.srcLon],
                                                    [data.destLat, data.destLon]
                                                ]}
                                                color="#1976d2"
                                                weight={2}
                                                opacity={0.5}
                                            >
                                                <Popup>
                                                    Src: {data.srcCity} ({data.srcAsn})<br />
                                                    Dest: {data.destCity} ({data.destAsn})<br />
                                                    P70 Latency: {data.latency}ms
                                                </Popup>
                                            </Polyline>
                                        ))}
                                    </MapContainer>
                                </Box>
                                <TableContainer sx={{ mt: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Src</TableCell>
                                                <TableCell>SrcASN</TableCell>
                                                <TableCell>SrcIP</TableCell>
                                                <TableCell>Dest</TableCell>
                                                <TableCell>DestASN</TableCell>
                                                <TableCell>DestIP</TableCell>
                                                <TableCell align="right">Samples</TableCell>
                                                <TableCell align="right">Min/Avg/Max(ms)</TableCell>
                                                <TableCell align="right">P50/70/90/95(ms)</TableCell>
                                                <TableCell align="right">Time</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {performanceData.rawData.map((data, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{data.srcCity}</TableCell>
                                                    <TableCell>{data.srcAsn}</TableCell>
                                                    <TableCell>{data.srcIP}</TableCell>
                                                    <TableCell>{data.destCity}</TableCell>
                                                    <TableCell>{data.destAsn}</TableCell>
                                                    <TableCell>{data.destIP}</TableCell>
                                                    <TableCell align="right">{data.samples}</TableCell>
                                                    <TableCell align="right">{data.min}/{data.avg}/{data.max}</TableCell>
                                                    <TableCell align="right">{data.p50}/{data.p70}/{data.p90}/{data.p95}</TableCell>
                                                    <TableCell align="right">{data.time}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </Grid>
                    </>
                )}
            </Grid>
        </Container>
    );
}
