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

const ClientTable = ({ title, clients }) => (
    <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ p: 2 }}>
            {title} ({clients?.length || 0})
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
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState('');
    const [isCountStatsLoading, setIsCountStatsLoading] = useState(false);
    const [isStatusStatsLoading, setIsStatusStatsLoading] = useState(false);
    const [isClientStatsLoading, setIsClientStatsLoading] = useState(false);
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
        'data-clients': []
    });

    const fetchAllStats = useCallback(() => {
        let completedRequests = 0;
        let activeRequests = 0;
        setIsRefreshing(true);

        // Update the last update time when the first data arrives
        const updateTime = () => {
            if (completedRequests === 1) {
                setLastUpdateTime(new Date().toLocaleTimeString());
            }

            // Only set isRefreshing to false when all active requests complete
            completedRequests++;
            if (completedRequests === activeRequests) {
                setIsRefreshing(false);
            }
        };

        // Fetch count statistics if not already loading
        if (!isCountStatsLoading) {
            activeRequests++;
            setIsCountStatsLoading(true);
            fetchCountStats()
                .then(data => {
                    setStats(prevStats => ({
                        ...prevStats,
                        ...data
                    }));
                    updateTime();
                    setIsCountStatsLoading(false);
                })
                .catch(error => {
                    console.error('Error fetching count statistics:', error);
                    updateTime();
                    setIsCountStatsLoading(false);
                });
        }

        // Fetch status statistics if not already loading
        if (!isStatusStatsLoading) {
            activeRequests++;
            setIsStatusStatsLoading(true);
            fetchStatusStats()
                .then(data => {
                    setStats(prevStats => ({
                        ...prevStats,
                        ...data
                    }));
                    updateTime();
                    setIsStatusStatsLoading(false);
                })
                .catch(error => {
                    console.error('Error fetching status statistics:', error);
                    updateTime();
                    setIsStatusStatsLoading(false);
                });
        }

        // Fetch client information if not already loading
        if (!isClientStatsLoading) {
            activeRequests++;
            setIsClientStatsLoading(true);
            fetchClientStats()
                .then(data => {
                    setStats(prevStats => ({
                        ...prevStats,
                        ...data
                    }));
                    updateTime();
                    setIsClientStatsLoading(false);
                })
                .catch(error => {
                    console.error('Error fetching client information:', error);
                    updateTime();
                    setIsClientStatsLoading(false);
                });
        }

        // If no requests were initiated, set isRefreshing to false
        if (activeRequests === 0) {
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchAllStats();

        // Set up interval for periodic fetching
        const interval = setInterval(fetchAllStats, 60000);

        // Cleanup interval on component unmount
        return () => clearInterval(interval);
    }, [fetchAllStats]);

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
                    {isRefreshing ? (
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
                        <ClientTable title="Ping Clients" clients={stats['ping-clients']} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <ClientTable title="Data Clients" clients={stats['data-clients']} />
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
}
