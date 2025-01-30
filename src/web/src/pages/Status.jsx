import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Grid } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import AddIcon from '@mui/icons-material/Add';
import ErrorIcon from '@mui/icons-material/Error';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import QueueIcon from '@mui/icons-material/Queue';

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
        <Typography variant="h3" component="div">
            {value || '0'}
        </Typography>
    </Paper>
);

export default function Status() {
    const [stats, setStats] = useState({
        allasn: 0,
        allcity: 0,
        'ping-stable': 0,
        'ping-new': 0,
        'ping-loss': 0,
        'ping-city': 0,
        'ping-queue': 0,
        'stat-pair': 0,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/statistics');
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Error fetching statistics:', error);
            }
        };

        // Initial fetch
        fetchStats();

        // Set up interval for periodic fetching
        const interval = setInterval(fetchStats, 30000);

        // Cleanup interval on component unmount
        return () => clearInterval(interval);
    }, []);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                System Status
            </Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Total ASNs"
                        value={stats.allasn}
                        icon={StorageIcon}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Total Cities"
                        value={stats.allcity}
                        icon={LocationCityIcon}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Total Cityids"
                        value={stats.allcityid}
                        icon={LocationCityIcon}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Stable Pings"
                        value={stats['ping-stable']}
                        icon={SignalCellularAltIcon}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="New Discovery Pings"
                        value={stats['ping-new']}
                        icon={AddIcon}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Lost Pings"
                        value={stats['ping-loss']}
                        icon={ErrorIcon}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Ready Cidr"
                        value={stats['cidr-ready']}
                        icon={QueueIcon}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Outdated Cidr"
                        value={stats['cidr-outdate']}
                        icon={QueueIcon}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Cidr Queue"
                        value={stats['cidr-queue']}
                        icon={QueueIcon}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Pingable CityIds"
                        value={stats['ping-city']}
                        icon={LocationCityIcon}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Valid CityId Pairs"
                        value={stats['stat-pair']}
                        icon={CompareArrowsIcon}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
