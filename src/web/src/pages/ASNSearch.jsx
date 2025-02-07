import { useState, useMemo } from 'react';
import { fetchASNInfo, createCitySet } from '../services/api';
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
    TableHead,
    TableRow,
    Checkbox,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Chip,
    Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ASNSearch() {
    const [filter, setFilter] = useState('');
    const [results, setResults] = useState([]);
    const [selected, setSelected] = useState([]);
    const [error, setError] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [setName, setSetName] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const hasPermission = useMemo(() => {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth='));
        const auth = parseInt(authCookie ? authCookie.split('=')[1] : '0');
        return (auth & 4) == 4;
    }, []);

    const handleSearch = async () => {
        try {
            setIsSearching(true);
            setResults([]); // Clear previous results before new search
            const data = await fetchASNInfo(filter);
            setResults(data);
            setSelected([]);
            setError('');
        } catch (err) {
            setError(err.message || 'An error occurred while fetching data');
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleToggleSelect = (cityId) => {
        setSelected(prev =>
            prev.includes(cityId)
                ? prev.filter(id => id !== cityId)
                : [...prev, cityId]
        );
    };

    const handleSaveSet = async () => {
        try {
            await createCitySet(setName, selected);
            setDialogOpen(false);
            setSetName('');
            setSelected([]);
            setError('');
        } catch (err) {
            setError(err.message || 'An error occurred while saving');
        }
    };

    // Calculate map bounds based on all markers
    const getBounds = () => {
        if (results.length === 0) return [[0, 0], [0, 0]];
        const lats = results.map(r => r.latitude);
        const lons = results.map(r => r.longitude);
        return [
            [Math.min(...lats), Math.min(...lons)],
            [Math.max(...lats), Math.max(...lons)]
        ];
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    ASN Search
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                    <TextField
                        fullWidth
                        label="Search ASNs"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isSearching) {
                                handleSearch();
                            }
                        }}
                        placeholder="e.g. Amazon or ASN8987"
                    />
                    <Button
                        variant="contained"
                        startIcon={<SearchIcon />}
                        onClick={handleSearch}
                        disabled={isSearching}
                        sx={{ minWidth: 120 }}
                    >
                        {isSearching ? 'Searching...' : 'Search'}
                    </Button>
                </Box>

                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}

                {results.length > 0 && (
                    <>
                        <Box sx={{ mt: 3, height: 400 }}>
                            <MapContainer
                                bounds={getBounds()}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                {results.map((result) => (
                                    <Marker
                                        key={result.cityId}
                                        position={[result.latitude, result.longitude]}
                                    >
                                        <Popup>
                                            {result.asn}<br />
                                            {result.cityId}
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </Box>

                        {hasPermission && (
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    variant="contained"
                                    startIcon={<SaveIcon />}
                                    onClick={() => setDialogOpen(true)}
                                    disabled={selected.length === 0}
                                >
                                    Save as Set
                                </Button>
                            </Box>
                        )}

                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        {hasPermission && (
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    indeterminate={selected.length > 0 && selected.length < results.length}
                                                    checked={results.length > 0 && selected.length === results.length}
                                                    onChange={() => {
                                                        if (selected.length === results.length) {
                                                            setSelected([]);
                                                        } else {
                                                            setSelected(results.map(r => r.cityId));
                                                        }
                                                    }}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell>City ID</TableCell>
                                        <TableCell>ASN</TableCell>
                                        <TableCell>Country</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>IP Range(Partial)</TableCell>
                                        <TableCell>Location</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {results.map((result) => (
                                        <TableRow key={result.cityId}>
                                            {hasPermission && (
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={selected.includes(result.cityId)}
                                                        onChange={() => handleToggleSelect(result.cityId)}
                                                    />
                                                </TableCell>
                                            )}
                                            <TableCell>{result.cityId} - {result.name}</TableCell>
                                            <TableCell>AS{result.asn} - {result.asnName}</TableCell>
                                            <TableCell>{result.country} - {result.region}</TableCell>
                                            <TableCell>{result.asnType} - {result.domain}</TableCell>
                                            <TableCell>{`${result.startIp}, ${result.endIp}`}</TableCell>
                                            <TableCell>{`${result.latitude}, ${result.longitude}`}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </Paper>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Save City Set
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Set Name"
                        fullWidth
                        value={setName}
                        onChange={(e) => setSetName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveSet} disabled={!setName.trim()}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
