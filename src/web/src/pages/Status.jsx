import { useState, useEffect, useCallback } from 'react';
import { fetchCountStats, fetchStatusStats, fetchClientStats } from '../services/api';
import { Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import AddIcon from '@mui/icons-material/Add';
import ErrorIcon from '@mui/icons-material/Error';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import QueueIcon from '@mui/icons-material/Queue';

const ClientTable = ({ title, clients, speedr, speedw }) => (
    <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ p: 2 }}>
            {title} ({clients?.length || 0}) Last hour r/w {speedr}/{speedw}
        </Typography>
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>IP</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Status</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {clients?.map((client) => (
                    <TableRow key={client.ip}>
                        <TableCell>{client.ip}</TableCell>
                        <TableCell>{client.region}</TableCell>
                        <TableCell>{client.status}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
);

const StatCard = ({ title, value, icon: Icon }) => (
    <Paper
        sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: 140,
            justifyContent: 'space-between',
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Icon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography color="textSecondary">{title}</Typography>
        </Box>
        <Typography variant="h4" component="div">
            {value || '0'}
        </Typography>
    </Paper>
);

export default function Status() {
    const [lastUpdateTime, setLastUpdateTime] = useState('');
    const [stats, setStats] = useState({
        allasn: 0,
        allcity: 0,
        'ping-stable': 0,
        'ping-new': 0,
        'ping-loss': 0,
        'ping-city': 0,
        'ping-queue': 0,
        'stat-pair': 0,
        'ping-clients': [],
        'data-clients': [],
        'speed-data-get': 0,
        'speed-data-set': 0,
        'speed-ping-get': 0,
        'speed-ping-set': 0,
    });

    // Function to fetch count statistics
    const fetchCountStatsData = useCallback(() => {
        fetchCountStats()
            .then(data => {
                setStats(prevStats => ({
                    ...prevStats,
                    ...data
                }));
                setLastUpdateTime(new Date().toLocaleTimeString());
            })
            .catch(error => {
                console.error('Error fetching count statistics:', error);
            });
    }, []);

    // Function to fetch status statistics
    const fetchStatusStatsData = useCallback(() => {
        fetchStatusStats()
            .then(data => {
                setStats(prevStats => ({
                    ...prevStats,
                    ...data
                }));
                setLastUpdateTime(new Date().toLocaleTimeString());
            })
            .catch(error => {
                console.error('Error fetching status statistics:', error);
            });
    }, []);

    // Function to fetch client statistics
    const fetchClientStatsData = useCallback(() => {
        fetchClientStats()
            .then(data => {
                setStats(prevStats => ({
                    ...prevStats,
                    ...data
                }));
                setLastUpdateTime(new Date().toLocaleTimeString());
            })
            .catch(error => {
                console.error('Error fetching client information:', error);
            });
    }, []);

    useEffect(() => {
        // Initial fetch for all stats
        fetchCountStatsData();
        fetchStatusStatsData();
        fetchClientStatsData();

        // Set up timers for each type of stats
        let countStatsTimer = null;
        let statusStatsTimer = null;
        let clientStatsTimer = null;

        // Function to schedule the next fetch after completion
        const scheduleNextCountStatsFetch = () => {
            countStatsTimer = setTimeout(fetchCountStatsData, 30000);
        };

        const scheduleNextStatusStatsFetch = () => {
            statusStatsTimer = setTimeout(fetchStatusStatsData, 30000);
        };

        const scheduleNextClientStatsFetch = () => {
            clientStatsTimer = setTimeout(fetchClientStatsData, 30000);
        };

        // Set up event listeners for fetch completion
        const originalFetchCountStats = fetchCountStats;
        window.fetchCountStats = async (...args) => {
            const result = await originalFetchCountStats(...args);
            scheduleNextCountStatsFetch();
            return result;
        };

        const originalFetchStatusStats = fetchStatusStats;
        window.fetchStatusStats = async (...args) => {
            const result = await originalFetchStatusStats(...args);
            scheduleNextStatusStatsFetch();
            return result;
        };

        const originalFetchClientStats = fetchClientStats;
        window.fetchClientStats = async (...args) => {
            const result = await originalFetchClientStats(...args);
            scheduleNextClientStatsFetch();
            return result;
        };

        // Schedule initial timers
        //scheduleNextCountStatsFetch();
        //scheduleNextStatusStatsFetch();
        //scheduleNextClientStatsFetch();

        // Cleanup timers and event listeners on component unmount
        return () => {
            clearTimeout(countStatsTimer);
            clearTimeout(statusStatsTimer);
            clearTimeout(clientStatsTimer);
            window.fetchCountStats = originalFetchCountStats;
            window.fetchStatusStats = originalFetchStatusStats;
            window.fetchClientStats = originalFetchClientStats;
        };
    }, [fetchCountStatsData, fetchStatusStatsData, fetchClientStatsData]);

    return (
        <Box>
            <Box sx={{ p: [0, 3, 0, 3] }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="h4">
                        System Status
                    </Typography>
                    <Typography>
                        {lastUpdateTime}
                    </Typography>
                    {lastUpdateTime == '' ? (
                        <Typography sx={{ color: 'red' }}>
                            refreshing...
                        </Typography>
                    ) : (
                        <Typography sx={{ color: 'green' }}>
                            updated
                        </Typography>
                    )}
                </Box>
                <Grid container spacing={3} sx={{ mb: -3 }}>
                    <Grid item xs={12} sm={4} md={2}>
                        <StatCard
                            title="Total Countrys"
                            value={stats['all-country']}
                            icon={StorageIcon}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <StatCard
                            title="Total Cities"
                            value={stats['all-city']}
                            icon={LocationCityIcon}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <StatCard
                            title="Total ASNs"
                            value={stats['all-asn']}
                            icon={StorageIcon}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <StatCard
                            title="Total Cityids"
                            value={stats['cityid-all']}
                            icon={LocationCityIcon}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <StatCard
                            title="Pingable CityIds"
                            value={stats['cityid-ping']}
                            icon={LocationCityIcon}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <StatCard
                            title="Valid CityId Pairs"
                            value={stats['cityid-pair']}
                            icon={CompareArrowsIcon}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <StatCard
                            title="Stable Pings"
                            value={stats['ping-stable']}
                            icon={SignalCellularAltIcon}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <StatCard
                            title="New Discovery Pings"
                            value={stats['ping-new']}
                            icon={AddIcon}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <StatCard
                            title="Lost Pings"
                            value={stats['ping-loss']}
                            icon={ErrorIcon}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <StatCard
                            title="Ready Cidr"
                            value={stats['cidr-ready']}
                            icon={SignalCellularAltIcon}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <StatCard
                            title="Outdated Cidr"
                            value={stats['cidr-outdated']}
                            icon={ErrorIcon}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                        <StatCard
                            title="Cidr Queue"
                            value={stats['cidr-queue']}
                            icon={QueueIcon}
                        />
                    </Grid>
                </Grid>
            </Box>
            <Box sx={{ p: [0, 3, 0, 3] }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <ClientTable title="Ping Clients" clients={stats['ping-clients']} speedr={stats['speed-ping-get']} speedw={stats['speed-ping-set']} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <ClientTable title="Data Clients" clients={stats['data-clients']} speedr={stats['speed-data-get']} speedw={stats['speed-data-set']} />
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
}
