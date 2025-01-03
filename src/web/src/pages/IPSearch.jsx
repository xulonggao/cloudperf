import { useState } from 'react';
import {
    Box,
    Container,
    TextField,
    Button,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export default function IPSearch() {
    const [ip, setIp] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        try {
            const response = await fetch(`/api/ipinfo?ip=${encodeURIComponent(ip)}`);
            if (response.ok) {
                const data = await response.json();
                setResult(data);
                setError('');
            } else {
                setError('Failed to fetch IP information');
                setResult(null);
            }
        } catch (err) {
            setError('An error occurred while fetching data');
            setResult(null);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    IP Search
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                    <TextField
                        fullWidth
                        label="Enter IP Address"
                        value={ip}
                        onChange={(e) => setIp(e.target.value)}
                        placeholder="e.g. 2.3.4.5"
                    />
                    <Button
                        variant="contained"
                        startIcon={<SearchIcon />}
                        onClick={handleSearch}
                        sx={{ minWidth: 120 }}
                    >
                        Search
                    </Button>
                </Box>

                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}

                {result && (
                    <TableContainer>
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell component="th" scope="row">ASN</TableCell>
                                    <TableCell>{result.asn}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">Country</TableCell>
                                    <TableCell>{result.country}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">Region</TableCell>
                                    <TableCell>{result.region}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">ASN Type</TableCell>
                                    <TableCell>{result.asnType}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">IP Range</TableCell>
                                    <TableCell>{result.ipRange.join(' - ')}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">City ID</TableCell>
                                    <TableCell>{result.cityId}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">Location</TableCell>
                                    <TableCell>{`${result.latitude}, ${result.longitude}`}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Container>
    );
}
