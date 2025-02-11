import { useState, useEffect, useCallback } from 'react';
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
    TableRow,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import {
    BarChart,
    Bar,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Function to calculate color based on distance and latency
const calculateColor = (distance, latency) => {
    /*
        光在光纤中传播速度约为 2×10⁸ m/s（真空中光速的2/3）
        实际网络中需要考虑路由器跳转、网络拥塞等因素
        地理距离通常采用大圆距离计算
        理论最小延迟 = 距离(km) / (200 km/ms)
        实际延迟 = 理论最小延迟 × 网络因素系数
        网络因素系数通常在1.5-2.5之间
        每1000公里理论延迟约5ms
        实际延迟通常为7.5-12.5ms/1000km
    */
    const normalizedLatency = Math.min(latency / 200, 1);
    const hue = (1 - normalizedLatency) * 120; // 0 is red, 120 is green
    return `hsl(${hue}, 70%, 50%)`;
};

// Custom marker icons
// Import marker icons
import redMarkerIcon from '../assets/marker-icon-2x-red.png';
import blueMarkerIcon from '../assets/marker-icon-2x-blue.png';
import markerShadow from '../assets/marker-shadow.png';

const sourceIcon = new L.Icon({
    iconUrl: redMarkerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const destIcon = new L.Icon({
    iconUrl: blueMarkerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: blueMarkerIcon,
    iconUrl: blueMarkerIcon,
    shadowUrl: markerShadow,
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
    // State for latency metric selection
    const [selectedMetric, setSelectedMetric] = useState('p70');

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

    const [allDestAsns, setAllDestAsns] = useState([]); // Store all fetched ASNs
    const [destAsns, setDestAsns] = useState([]);
    const [selectedDestAsns, setSelectedDestAsns] = useState([]);
    const [selectedAsnTypes, setSelectedAsnTypes] = useState(['isp']); // Default to ISP selected

    // State for performance data and loading
    const [performanceData, setPerformanceData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const getNoOptionsText = useCallback(() => {
        return isLoading ? "Loading..." : "No options";
    }, [isLoading]);

    useEffect(() => {
        // Fetch city sets and countries on mount
        const fetchInitialData = async () => {
            setIsLoading(true);
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
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        // Fetch countries when city sets is selected
        setSelectedDestCountry('');
        const fetchData = async () => {
            if (selectedSet) {
                setIsLoading(true);
                try {
                    setDestCountries([]);
                    const data = await fetchCountries(selectedSet);
                    setDestCountries(data);
                } catch (error) {
                    console.error('Error fetching dist countries:', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setDestCountries(countries);
            }
        };
        fetchData();
    }, [selectedSet, countries]);

    // Fetch cities when country is selected
    useEffect(() => {
        setSelectedCity('');
        setCities([]);
        const fetchData = async () => {
            if (selectedCountry) {
                setIsLoading(true);
                try {
                    const data = await fetchCities(selectedCountry);
                    setCities(data);
                } catch (error) {
                    console.error('Error fetching cities:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchData();
    }, [selectedCountry]);

    // Fetch ASNs when city is selected
    useEffect(() => {
        setSelectedAsns([]);
        setAsns([]);
        const fetchData = async () => {
            if (selectedCountry && selectedCity) {
                setIsLoading(true);
                try {
                    const data = await fetchAsns(selectedCountry, selectedCity);
                    setAsns(data);
                } catch (error) {
                    console.error('Error fetching ASNs:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchData();
    }, [selectedCountry, selectedCity]);

    // Similar effects for destination selection
    useEffect(() => {
        setSelectedDestCity('');
        setDestCities([]);
        const fetchData = async () => {
            if (selectedDestCountry) {
                setIsLoading(true);
                try {
                    const data = await fetchCities(selectedDestCountry, selectedSet);
                    setDestCities(data);
                } catch (error) {
                    console.error('Error fetching destination cities:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchData();
    }, [selectedDestCountry, selectedSet]);

    // Filter destAsns based on selected ASN types
    useEffect(() => {
        if (allDestAsns.length > 0) {
            const filteredAsns = allDestAsns.filter(asn => selectedAsnTypes.includes(asn.asnType));
            setDestAsns(filteredAsns);
            setSelectedDestAsns([]); // Reset selected ASNs when filter changes
        }
    }, [allDestAsns, selectedAsnTypes]);

    // Fetch destination ASNs
    useEffect(() => {
        setSelectedDestAsns([]);
        setAllDestAsns([]); // Reset all ASNs
        setDestAsns([]);
        const fetchData = async () => {
            if (selectedDestCountry && selectedDestCity) {
                setIsLoading(true);
                try {
                    const data = await fetchAsns(selectedDestCountry, selectedDestCity, selectedSet);
                    setAllDestAsns(data);
                } catch (error) {
                    console.error('Error fetching destination ASNs:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchData();
    }, [selectedDestCountry, selectedDestCity, selectedSet]);

    const handleSearch = async () => {
        // Clear existing performance data first and set loading state
        setPerformanceData(null);
        setIsLoading(true);
        const srcCityIds = selectedSet
            ? citySets.find(set => set.id === selectedSet)?.cityIds
            : (selectedAsns.length ? selectedAsns.map(asn => asn.cityId) : asns.map(asn => asn.cityId));
        const destCityIds = selectedDestAsns.length ? selectedDestAsns.map(asn => asn.cityId)
            : destAsns.map(asn => asn.cityId);
        try {
            const [data, rawData] = await Promise.all([
                fetchPerformanceData(srcCityIds, destCityIds, false),
                fetchPerformanceData(srcCityIds, destCityIds, true)
            ]);
            const compData = { ...data, rawData };
            setPerformanceData(compData);
        } catch (error) {
            console.error('Error fetching performance data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate map bounds based on all markers
    const getBounds = () => {
        if (!performanceData) return [[0, 0], [0, 0]];
        const points = [
            ...performanceData.latencyData.map(data => [data.sLa, data.sLo]),
            ...performanceData.latencyData.map(data => [data.dLa, data.dLo])
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
                                    loading={isLoading}
                                    noOptionsText={getNoOptionsText()}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Country"
                                            fullWidth
                                            sx={{ mb: 2 }}
                                        />
                                    )}
                                />

                                <Autocomplete
                                    options={cities}
                                    getOptionLabel={(option) => option.name}
                                    value={cities.find(c => c.id === selectedCity) || null}
                                    onChange={(_, newValue) => setSelectedCity(newValue?.id || '')}
                                    disabled={!selectedCountry}
                                    loading={isLoading}
                                    noOptionsText={getNoOptionsText()}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="City"
                                            fullWidth
                                            sx={{ mb: 2 }}
                                        />
                                    )}
                                />

                                <Autocomplete
                                    multiple
                                    options={asns}
                                    getOptionLabel={(option) => `${option.asnName} (ASN${option.asn})`}
                                    value={selectedAsns}
                                    onChange={(_, newValue) => setSelectedAsns(newValue)}
                                    disabled={!selectedCity}
                                    loading={isLoading}
                                    noOptionsText={getNoOptionsText()}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="ASNs"
                                            fullWidth
                                        />
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
                            loading={isLoading}
                            noOptionsText={getNoOptionsText()}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Country"
                                    fullWidth
                                    sx={{ mb: 2 }}
                                />
                            )}
                        />

                        <Autocomplete
                            options={destCities}
                            getOptionLabel={(option) => option.name}
                            value={destCities.find(c => c.id === selectedDestCity) || null}
                            onChange={(_, newValue) => setSelectedDestCity(newValue?.id || '')}
                            disabled={!selectedDestCountry}
                            loading={isLoading}
                            noOptionsText={getNoOptionsText()}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="City"
                                    fullWidth
                                    sx={{ mb: 2 }}
                                />
                            )}
                        />

                        <Grid container spacing={0} sx={{ mb: 2 }} direction="row">
                            <Grid item xs={12} sx={{ mb: 1 }}>
                                <Typography variant="subtitle2">
                                    ASN Type Filter
                                </Typography>
                            </Grid>
                            {['isp', 'hosting', 'business', 'government', 'education'].map((type) => (
                                <Grid item key={type}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={selectedAsnTypes.includes(type)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedAsnTypes([...selectedAsnTypes, type]);
                                                    } else {
                                                        setSelectedAsnTypes(selectedAsnTypes.filter(t => t !== type));
                                                    }
                                                }}
                                                size="small"
                                            />
                                        }
                                        label={type.charAt(0).toUpperCase() + type.slice(1)}
                                        sx={{
                                            margin: 0,
                                            '& .MuiFormControlLabel-label': {
                                                fontSize: '0.875rem',
                                                marginLeft: '4px',
                                                marginRight: '8px'
                                            }
                                        }}
                                    />
                                </Grid>
                            ))}
                        </Grid>

                        <Autocomplete
                            multiple
                            options={destAsns}
                            getOptionLabel={(option) => `${option.asnName} (ASN${option.asn})`}
                            value={selectedDestAsns}
                            onChange={(_, newValue) => setSelectedDestAsns(newValue)}
                            disabled={!selectedDestCity}
                            loading={isLoading}
                            noOptionsText={getNoOptionsText()}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="ASNs"
                                    fullWidth
                                />
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
                                isLoading ||
                                !((selectedSet || (selectedCity.length && asns.length)) &&
                                    (selectedDestCity.length && destAsns.length))
                            }
                        >
                            {isLoading ? 'Loading...' : 'Search'}
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
                                                Samples (Selected Src/Dest)
                                            </Typography>
                                            <Typography variant="h5">
                                                {performanceData.sm} ({performanceData.srcCityIds}/{performanceData.distCityIds})
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
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                        Latency vs Distance
                                    </Typography>
                                    <FormControl sx={{ minWidth: 120 }}>
                                        <InputLabel>Metric</InputLabel>
                                        <Select
                                            value={selectedMetric}
                                            onChange={(e) => setSelectedMetric(e.target.value)}
                                            label="Metric"
                                            size="small"
                                        >
                                            <MenuItem value="min">Min</MenuItem>
                                            <MenuItem value="avg">Avg</MenuItem>
                                            <MenuItem value="max">Max</MenuItem>
                                            <MenuItem value="p50">P50</MenuItem>
                                            <MenuItem value="p70">P70</MenuItem>
                                            <MenuItem value="p90">P90</MenuItem>
                                            <MenuItem value="p95">P95</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                                <ResponsiveContainer width="100%" height={400}>
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid />
                                        <XAxis
                                            type="number"
                                            dataKey="dist"
                                            name="Distance"
                                            unit=" km"
                                            label={{ value: 'Distance (km)', position: 'bottom' }}
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey={selectedMetric}
                                            name={`${selectedMetric.toUpperCase()} Latency`}
                                            unit=" ms"
                                            label={{ value: `${selectedMetric.toUpperCase()} Latency (ms)`, angle: -90, position: 'left' }}
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
                                                            <p>{`Source: ${data.sC} ${data.sA}`}</p>
                                                            <p>{`Destination: ${data.dC} ${data.dA}`}</p>
                                                            <p>{`Samples: ${data.sm}`}</p>
                                                            <p>{`Distance: ${Math.round(data.dist)} km\u00A0\u00A0${selectedMetric.toUpperCase()}: ${data[selectedMetric]}ms`}</p>
                                                            <p>{`Min/Avg/Max: ${data.min}/${data.avg}/${data.max} ms`}</p>
                                                            <p>{`p50/p70/p90/p95: ${data.p50}/${data.p70}/${data.p90}/${data.p95} ms`}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend
                                            layout="vertical"
                                            align="middle"
                                            verticalAlign="top"
                                            wrapperStyle={{
                                                top: 40, left: 100,
                                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                                padding: '5px', position: 'absolute', fontSize: '12px',
                                                border: '1px solid #d5d5d5', borderRadius: '3px'
                                            }}
                                            iconSize={10}
                                            iconType="circle"
                                        />
                                        {Array.from(new Set(performanceData.latencyData.map(d => d.sC))).map((sC, index) => (
                                            <Scatter
                                                key={sC}
                                                name={sC}
                                                data={performanceData.latencyData
                                                    .filter(d => d.sC === sC)
                                                    .map(d => ({
                                                        ...d,
                                                        dist: calculateDistance(d.sLa, d.sLo, d.dLa, d.dLo)
                                                    }))}
                                                fill={`hsl(${(index * 360) / 20}, 70%, 50%)`}
                                            />
                                        ))}
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>

                        {/* Time vs Latency Scatter Chart */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                        Latency Data Collection Time (last {performanceData.rawData.length} records)
                                    </Typography>
                                    <FormControl sx={{ minWidth: 120 }}>
                                        <InputLabel>Metric</InputLabel>
                                        <Select
                                            value={selectedMetric}
                                            onChange={(e) => setSelectedMetric(e.target.value)}
                                            label="Metric"
                                            size="small"
                                        >
                                            <MenuItem value="min">Min</MenuItem>
                                            <MenuItem value="avg">Avg</MenuItem>
                                            <MenuItem value="max">Max</MenuItem>
                                            <MenuItem value="p50">P50</MenuItem>
                                            <MenuItem value="p70">P70</MenuItem>
                                            <MenuItem value="p90">P90</MenuItem>
                                            <MenuItem value="p95">P95</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                                <ResponsiveContainer width="100%" height={300}>
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="ti"
                                            type="number"
                                            name="time"
                                            domain={['dataMin', 'dataMax']}
                                            label={{ value: 'Record Time', position: 'bottom' }}
                                            tickFormatter={(value) => {
                                                const date = new Date(value * 1000);
                                                return date.toLocaleDateString('zh-CN', {
                                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                                                    hour12: false
                                                });
                                            }}
                                            scale="time"
                                        />
                                        <YAxis
                                            dataKey={selectedMetric}
                                            name={`${selectedMetric.toUpperCase()} Latency`}
                                            unit=" ms"
                                            label={{ value: `${selectedMetric.toUpperCase()} Latency (ms)`, angle: -90, position: 'left' }}
                                        />
                                        <Tooltip
                                            cursor={{ strokeDasharray: '3 3' }}
                                            content={({ payload, active }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
                                                            <p>{`Source: ${data.sC} (${data.sA})`}</p>
                                                            <p>{`Destination: ${data.dC} (${data.dA})`}</p>
                                                            <p>{`Time: ${new Date(parseInt(data.ti) * 1000).toLocaleString('zh-CN', {
                                                                month: '2-digit', day: '2-digit',
                                                                hour: '2-digit', minute: '2-digit',
                                                                hour12: false
                                                            })}\u00A0\u00A0Samples: ${data.sm}\u00A0\u00A0${selectedMetric.toUpperCase()}: ${data[selectedMetric]}ms`}</p>
                                                            <p>{`Min/Avg/Max: ${data.min}/${data.avg}/${data.max} ms`}</p>
                                                            <p>{`P50/P70/P90/P95: ${data.p50}/${data.p70}/${data.p90}/${data.p95} ms`}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend
                                            layout="vertical"
                                            align="middle"
                                            verticalAlign="top"
                                            wrapperStyle={{
                                                top: 40, left: 100,
                                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                                padding: '5px', position: 'absolute', fontSize: '12px',
                                                border: '1px solid #d5d5d5', borderRadius: '3px'
                                            }}
                                            iconSize={10}
                                            iconType="circle"
                                        />
                                        <Scatter
                                            name="Insufficient"
                                            data={performanceData.rawData
                                                .filter(d => d.sm < 200)}
                                            fill="#ff7300"
                                        />
                                        <Scatter
                                            name="Moderate"
                                            data={performanceData.rawData
                                                .filter(d => d.sm >= 200 && d.sm < 600)}
                                            fill="#8884d8"
                                        />
                                        <Scatter
                                            name="Sufficient"
                                            data={performanceData.rawData
                                                .filter(d => d.sm >= 600)}
                                            fill="#82ca9d"
                                        />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>

                        {/* ASN and City Charts */}
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                        ASN Latency Distribution
                                    </Typography>
                                    <FormControl sx={{ minWidth: 120 }}>
                                        <InputLabel>Metric</InputLabel>
                                        <Select
                                            value={selectedMetric}
                                            onChange={(e) => setSelectedMetric(e.target.value)}
                                            label="Metric"
                                            size="small"
                                        >
                                            <MenuItem value="min">Min</MenuItem>
                                            <MenuItem value="avg">Avg</MenuItem>
                                            <MenuItem value="max">Max</MenuItem>
                                            <MenuItem value="p50">P50</MenuItem>
                                            <MenuItem value="p70">P70</MenuItem>
                                            <MenuItem value="p90">P90</MenuItem>
                                            <MenuItem value="p95">P95</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={performanceData.asnData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="asn" />
                                        <YAxis />
                                        <Tooltip content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
                                                        <p>{`${data.isS ? 'Src' : 'Dest'} ASN: ${data.asn}`}</p>
                                                        <p>{`Min/Avg/Max: ${data.min}/${data.avg}/${data.max} ms`}</p>
                                                        <p>{`P50/P70/P90/P95: ${data.p50}/${data.p70}/${data.p90}/${data.p95} ms`}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Legend content={({ payload }) => (
                                            <div style={{ backgroundColor: 'white', padding: '5px', border: '1px solid #ccc' }}>
                                                <span style={{ color: '#ff7300', marginRight: '10px' }}>● Source ASN</span>
                                                <span style={{ color: '#82ca9d' }}>● Destination ASN</span>
                                            </div>
                                        )} />
                                        <Bar dataKey={selectedMetric} name={selectedMetric}>
                                            {
                                                performanceData.asnData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.isS ? '#ff7300' : '#82ca9d'} />
                                                ))
                                            }
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                        City Latency Distribution
                                    </Typography>
                                    <FormControl sx={{ minWidth: 120 }}>
                                        <InputLabel>Metric</InputLabel>
                                        <Select
                                            value={selectedMetric}
                                            onChange={(e) => setSelectedMetric(e.target.value)}
                                            label="Metric"
                                            size="small"
                                        >
                                            <MenuItem value="min">Min</MenuItem>
                                            <MenuItem value="avg">Avg</MenuItem>
                                            <MenuItem value="max">Max</MenuItem>
                                            <MenuItem value="p50">P50</MenuItem>
                                            <MenuItem value="p70">P70</MenuItem>
                                            <MenuItem value="p90">P90</MenuItem>
                                            <MenuItem value="p95">P95</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={performanceData.cityData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="city" />
                                        <YAxis />
                                        <Tooltip content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
                                                        <p>{`${data.isS ? 'Src' : 'Dest'} City: ${data.city}`}</p>
                                                        <p>{`Min/Avg/Max: ${data.min}/${data.avg}/${data.max} ms`}</p>
                                                        <p>{`P50/P70/P90/P95: ${data.p50}/${data.p70}/${data.p90}/${data.p95} ms`}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Legend content={({ payload }) => (
                                            <div style={{ backgroundColor: 'white', padding: '5px', border: '1px solid #ccc' }}>
                                                <span style={{ color: '#ff7300', marginRight: '10px' }}>● Source City</span>
                                                <span style={{ color: '#82ca9d' }}>● Destination City</span>
                                            </div>
                                        )} />
                                        <Bar dataKey={selectedMetric} name={selectedMetric}>
                                            {
                                                performanceData.cityData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.isS ? '#ff7300' : '#82ca9d'} />
                                                ))
                                            }
                                        </Bar>
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
                                            <React.Fragment key={`pair-${data.sC}-${data.dC}`}>
                                                <Marker
                                                    position={[data.sLa, data.sLo]}
                                                    icon={sourceIcon}
                                                >
                                                    <Popup>
                                                        {data.sC}<br />
                                                        {data.sA}
                                                    </Popup>
                                                </Marker>
                                                <Marker
                                                    position={[data.dLa, data.dLo]}
                                                    icon={destIcon}
                                                >
                                                    <Popup>
                                                        {data.dC}<br />
                                                        {data.dA}
                                                    </Popup>
                                                </Marker>
                                            </React.Fragment>
                                        ))}
                                        {/* Lines connecting source to destination with latency */}
                                        {performanceData.latencyData.map(data => (
                                            <Polyline
                                                key={`${data.sC}-${data.dC}`}
                                                positions={[
                                                    [data.sLa, data.sLo],
                                                    [data.dLa, data.dLo]
                                                ]}
                                                color={calculateColor(data.dist, data.p70)}
                                                weight={2}
                                                opacity={0.7}
                                            >
                                                <Popup>
                                                    Src: {data.sC} ({data.sA})<br />
                                                    Dest: {data.dC} ({data.dA})<br />
                                                    Min/Avg/Max: {data.min}/{data.avg}/{data.max}<br />
                                                    P50/P70/P90/P95: {data.p50}/{data.p70}/{data.p90}/{data.p95}
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
                                                    <TableCell>{data.sC}</TableCell>
                                                    <TableCell>{data.sA}</TableCell>
                                                    <TableCell>{data.sIP}</TableCell>
                                                    <TableCell>{data.dC}</TableCell>
                                                    <TableCell>{data.dA}</TableCell>
                                                    <TableCell>{data.dIP}</TableCell>
                                                    <TableCell align="right">{data.sm}</TableCell>
                                                    <TableCell align="right">{data.min}/{data.avg}/{data.max}</TableCell>
                                                    <TableCell align="right">{data.p50}/{data.p70}/{data.p90}/{data.p95}</TableCell>
                                                    <TableCell align="right">{new Date(parseInt(data.ti) * 1000).toLocaleString('zh-CN', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        second: '2-digit',
                                                        hour12: false
                                                    }).replace(/\//g, ':').replace(/,/, '').replace(/:/g, '-', 2)}</TableCell>
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

