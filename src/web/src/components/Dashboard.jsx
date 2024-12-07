import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import SpeedIcon from '@mui/icons-material/Speed';
import RouterIcon from '@mui/icons-material/Router';
import PublicIcon from '@mui/icons-material/Public';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Sample data for charts
const performanceData = [
    { name: 'Jan', latency: 400, throughput: 240, amt: 240 },
    { name: 'Feb', latency: 300, throughput: 139, amt: 221 },
    { name: 'Mar', latency: 200, throughput: 980, amt: 229 },
    { name: 'Apr', latency: 278, throughput: 390, amt: 200 },
    { name: 'May', latency: 189, throughput: 480, amt: 218 },
    { name: 'Jun', latency: 239, throughput: 380, amt: 250 },
];

const regionData = [
    { name: 'NA', value: 4000 },
    { name: 'EU', value: 3000 },
    { name: 'Asia', value: 2000 },
    { name: 'SA', value: 1000 },
    { name: 'Africa', value: 500 },
];

function StatsCard({ title, value, icon: Icon, color }) {
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
            <Typography component="p" variant="h4">
                {value}
            </Typography>
        </Paper>
    );
}

export default function Dashboard() {
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
                {/* Stats Cards */}
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Active Nodes"
                        value="234"
                        icon={RouterIcon}
                        color="#1976d2"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Avg Latency"
                        value="45ms"
                        icon={SpeedIcon}
                        color="#2196f3"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Network Status"
                        value="98.5%"
                        icon={NetworkCheckIcon}
                        color="#03a9f4"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Regions"
                        value="12"
                        icon={PublicIcon}
                        color="#00bcd4"
                    />
                </Grid>

                {/* Performance Chart */}
                <Grid item xs={12} md={8}>
                    <Paper
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            height: 400,
                        }}
                    >
                        <Typography component="h2" variant="h6" color="primary" gutterBottom>
                            Network Performance
                        </Typography>
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
                    </Paper>
                </Grid>

                {/* Regional Distribution */}
                <Grid item xs={12} md={4}>
                    <Paper
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            height: 400,
                        }}
                    >
                        <Typography component="h2" variant="h6" color="primary" gutterBottom>
                            Regional Distribution
                        </Typography>
                        <ResponsiveContainer>
                            <BarChart
                                data={regionData}
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
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}
