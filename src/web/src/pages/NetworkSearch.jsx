import { useState, useEffect } from 'react';
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
    Button
} from '@mui/material';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
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
    const [destCountry, setDestCountry] = useState('');
    const [destCities, setDestCities] = useState([]);
    const [destCity, setDestCity] = useState('');
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
            } catch (error) {
                console.error('Error fetching initial data:', error);
            }
        };
        fetchInitialData();
    }, []);

    // Fetch cities when country is selected
    useEffect(() => {
        if (selectedCountry) {
            fetchCities(selectedCountry)
                .then(data => setCities(data))
                .catch(error => console.error('Error fetching cities:', error));
        } else {
            setCities([]);
        }
    }, [selectedCountry]);

    // Fetch ASNs when city is selected
    useEffect(() => {
        if (selectedCountry && selectedCity) {
            fetchAsns(selectedCountry, selectedCity)
                .then(data => setAsns(data))
                .catch(error => console.error('Error fetching ASNs:', error));
        } else {
            setAsns([]);
        }
    }, [selectedCountry, selectedCity]);

    // Similar effects for destination selection
    useEffect(() => {
        if (destCountry) {
            fetchCities(destCountry)
                .then(data => setDestCities(data))
                .catch(error => console.error('Error fetching destination cities:', error));
        } else {
            setDestCities([]);
        }
    }, [destCountry]);

    useEffect(() => {
        if (destCountry && destCity) {
            fetchAsns(destCountry, destCity)
                .then(data => setDestAsns(data))
                .catch(error => console.error('Error fetching destination ASNs:', error));
        } else {
            setDestAsns([]);
        }
    }, [destCountry, destCity]);

    const handleSearch = async () => {
        const srcCityIds = selectedSet
            ? citySets.find(set => set.id === selectedSet)?.cityIds
            : selectedAsns.map(asn => asn.cityId);
        const destCityIds = selectedDestAsns.map(asn => asn.cityId);

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
            ...performanceData.sourceLocations.map(loc => [loc.latitude, loc.longitude]),
            ...performanceData.destLocations.map(loc => [loc.latitude, loc.longitude])
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
                                    getOptionLabel={(option) => option.asnName}
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
                            options={countries}
                            getOptionLabel={(option) => option.name}
                            value={countries.find(c => c.code === destCountry) || null}
                            onChange={(_, newValue) => setDestCountry(newValue?.code || '')}
                            renderInput={(params) => (
                                <TextField {...params} label="Country" fullWidth sx={{ mb: 2 }} />
                            )}
                        />

                        <Autocomplete
                            options={destCities}
                            getOptionLabel={(option) => option.name}
                            value={destCities.find(c => c.id === destCity) || null}
                            onChange={(_, newValue) => setDestCity(newValue?.id || '')}
                            disabled={!destCountry}
                            renderInput={(params) => (
                                <TextField {...params} label="City" fullWidth sx={{ mb: 2 }} />
                            )}
                        />

                        <Autocomplete
                            multiple
                            options={destAsns}
                            getOptionLabel={(option) => option.asnName}
                            value={selectedDestAsns}
                            onChange={(_, newValue) => setSelectedDestAsns(newValue)}
                            disabled={!destCity}
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
                                (!selectedSet && (!selectedAsns.length)) ||
                                !selectedDestAsns.length
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
                                                {performanceData.samples}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={3}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="textSecondary" gutterBottom>
                                                Average Latency
                                            </Typography>
                                            <Typography variant="h5">
                                                {performanceData.avgLatency}ms
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={3}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="textSecondary" gutterBottom>
                                                Median Latency
                                            </Typography>
                                            <Typography variant="h5">
                                                {performanceData.medianLatency}ms
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={3}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="textSecondary" gutterBottom>
                                                P70 Latency
                                            </Typography>
                                            <Typography variant="h5">
                                                {performanceData.p70Latency}ms
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
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
                                        <Line type="monotone" dataKey="avgLatency" stroke="#8884d8" />
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
                                        <Bar dataKey="avgLatency" fill="#8884d8" />
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
                                        <Bar dataKey="avgLatency" fill="#82ca9d" />
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
                                        {/* Source ASNs */}
                                        {performanceData.sourceLocations.map((loc) => (
                                            <Marker
                                                key={`src-${loc.cityId}`}
                                                position={[loc.latitude, loc.longitude]}
                                            >
                                                <Popup>
                                                    Source ASN: {loc.asn}<br />
                                                    {loc.cityId}
                                                </Popup>
                                            </Marker>
                                        ))}
                                        {/* Destination ASNs */}
                                        {performanceData.destLocations.map((loc) => (
                                            <Marker
                                                key={`dst-${loc.cityId}`}
                                                position={[loc.latitude, loc.longitude]}
                                            >
                                                <Popup>
                                                    Destination ASN: {loc.asn}<br />
                                                    {loc.cityId}
                                                </Popup>
                                            </Marker>
                                        ))}
                                        {/* Lines connecting source to destination with latency */}
                                        {performanceData.latencyData.map(data => (
                                            <Polyline
                                                key={`${data.sourceCityId}-${data.destCityId}`}
                                                positions={[
                                                    [data.sourceLat, data.sourceLon],
                                                    [data.destLat, data.destLon]
                                                ]}
                                                color="#1976d2"
                                                weight={2}
                                                opacity={0.5}
                                            >
                                                <Popup>
                                                    Source: {data.sourceAsn}<br />
                                                    Destination: {data.destAsn}<br />
                                                    Latency: {data.latency}ms
                                                </Popup>
                                            </Polyline>
                                        ))}
                                    </MapContainer>
                                </Box>
                            </Paper>
                        </Grid>
                    </>
                )}
            </Grid>
        </Container>
    );
}
