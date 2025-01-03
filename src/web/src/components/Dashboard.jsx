import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Grid, Paper, Typography, CircularProgress, Alert } from '@mui/material';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import SpeedIcon from '@mui/icons-material/Speed';
import RouterIcon from '@mui/icons-material/Router';
import PublicIcon from '@mui/icons-material/Public';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { fetchDashboardStats, fetchPerformanceData, fetchRegionalData, fetchLatencyData } from '../services/api';
import WorldMap from './WorldMap';
import FilterToolbar from './FilterToolbar';

function StatsCard({ title, value, icon: Icon, color, isLoading, error }) {
    return (
        <Paper
            sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                bgcolor: color,
                color: 'white',
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography component="h2" variant="h6" gutterBottom>
                    {title}
                </Typography>
                <Icon />
            </Box>
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                    <CircularProgress color="inherit" size={24} />
                </Box>
            ) : error ? (
                <Typography color="error" component="p">
                    Error loading data
                </Typography>
            ) : (
                <Typography component="p" variant="h4">
                    {value}
                </Typography>
            )}
        </Paper>
    );
}

function ChartContainer({ title, children, isLoading, error }) {
    return (
        <Paper
            sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 400,
            }}
        >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
                {title}
            </Typography>
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error">Error loading chart data</Alert>
            ) : (
                children
            )}
        </Paper>
    );
}

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [performanceData, setPerformanceData] = useState([]);
    const [regionalData, setRegionalData] = useState([]);
    const [latencyData, setLatencyData] = useState([]);
    const [selectedCityIds, setSelectedCityIds] = useState([]);

    const [loading, setLoading] = useState({
        stats: false,
        performance: false,
        regional: false,
        latency: false
    });
    const [error, setError] = useState({
        stats: null,
        performance: null,
        regional: null,
        latency: null
    });

    // Subscribe to FilterToolbar's ASN selection changes
    const handleAsnSelectionChange = useCallback((selectedAsns) => {
        // Extract unique cityIds from selected ASNs
        const cityIds = Array.from(new Set(selectedAsns.map(asn => asn.cityId)));
        setSelectedCityIds(cityIds);
    }, []);

    const fetchLatency = useCallback(async () => {
        if (!selectedCityIds.length) return;
        try {
            setLoading(prev => ({ ...prev, latency: true }));
            setError(prev => ({ ...prev, latency: null }));
            const data = await fetchLatencyData(selectedCityIds);
            setLatencyData(data || []);
        } catch (err) {
            console.error('Error fetching latency data:', err);
            setError(prev => ({ ...prev, latency: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, latency: false }));
        }
    }, [selectedCityIds]);

    const fetchData = useCallback(async () => {
        if (!selectedCityIds.length) {
            // Clear all data and loading states when no cities are selected
            setStats(null);
            setPerformanceData([]);
            setRegionalData([]);
            setLatencyData([]);
            setLoading({
                stats: false,
                performance: false,
                regional: false,
                latency: false
            });
            setError({
                stats: null,
                performance: null,
                regional: null,
                latency: null
            });
            return;
        }

        console.log('Fetching data for cities:', selectedCityIds);

        // Set all loading states to true at once
        setLoading({
            stats: true,
            performance: true,
            regional: true,
            latency: true
        });

        try {
            // Fetch all data in parallel
            const [statsData, perfData, regData] = await Promise.all([
                fetchDashboardStats(),
                fetchPerformanceData('24h', selectedCityIds),
                fetchRegionalData(selectedCityIds)
            ]);

            console.log('Received data:', { statsData, perfData, regData });

            // Update all data states
            setStats(statsData);
            setPerformanceData(perfData);
            setRegionalData(regData);

            // Clear any previous errors
            setError({
                stats: null,
                performance: null,
                regional: null,
                latency: null
            });
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            // Set error state for all components
            setError({
                stats: err.message,
                performance: err.message,
                regional: err.message,
                latency: err.message
            });
            // Clear data on error
            setStats(null);
            setPerformanceData([]);
            setRegionalData([]);
        } finally {
            // Set loading states to false for completed requests
            setLoading(prev => ({
                ...prev,
                stats: false,
                performance: false,
                regional: false
            }));
        }

        // Fetch latency data separately as it's used by the WorldMap component
        await fetchLatency();
    }, [fetchLatency, selectedCityIds]);

    useEffect(() => {
        if (selectedCityIds.length) {
            fetchData();
            // Set up polling interval
            const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        } else {
            // Clear data when no cities are selected
            setStats(null);
            setPerformanceData([]);
            setRegionalData([]);
            setLatencyData([]);
            setError({
                stats: null,
                performance: null,
                regional: null,
                latency: null
            });
        }
    }, [fetchData, selectedCityIds]);

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <FilterToolbar onAsnSelectionChange={handleAsnSelectionChange} />

            <Grid container spacing={3}>
                {/* Stats Cards */}
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Active Nodes"
                        value={stats?.activeNodes}
                        icon={RouterIcon}
                        color="#1976d2"
                        isLoading={loading.stats}
                        error={error.stats}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Avg Latency"
                        value={stats?.avgLatency}
                        icon={SpeedIcon}
                        color="#2196f3"
                        isLoading={loading.stats}
                        error={error.stats}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Network Status"
                        value={stats?.networkStatus}
                        icon={NetworkCheckIcon}
                        color="#03a9f4"
                        isLoading={loading.stats}
                        error={error.stats}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Regions"
                        value={stats?.regions}
                        icon={PublicIcon}
                        color="#00bcd4"
                        isLoading={loading.stats}
                        error={error.stats}
                    />
                </Grid>

                {/* Performance Chart */}
                <Grid item xs={12} md={8}>
                    <ChartContainer
                        title="Network Performance"
                        isLoading={loading.performance}
                        error={error.performance}
                    >
                        <ResponsiveContainer>
                            <LineChart
                                data={performanceData}
                                margin={{
                                    top: 16,
                                    right: 16,
                                    bottom: 0,
                                    left: 24,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="latency"
                                    stroke="#8884d8"
                                    activeDot={{ r: 8 }}
                                />
                                <Line type="monotone" dataKey="throughput" stroke="#82ca9d" />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </Grid>

                {/* Regional Distribution */}
                <Grid item xs={12} md={4}>
                    <ChartContainer
                        title="Regional Distribution"
                        isLoading={loading.regional}
                        error={error.regional}
                    >
                        <ResponsiveContainer>
                            <BarChart
                                data={regionalData}
                                margin={{
                                    top: 16,
                                    right: 16,
                                    bottom: 0,
                                    left: 24,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </Grid>

                {/* World Map */}
                <Grid item xs={12}>
                    {loading.latency ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : error.latency ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            Error loading latency data: {error.latency}
                        </Alert>
                    ) : (
                        <WorldMap data={latencyData} selectedCityIds={selectedCityIds} />
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}
