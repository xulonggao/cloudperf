import { useState, useEffect } from 'react';
import { fetchCitySets, createCitySet, updateCitySet, deleteCitySet } from '../services/api';
import {
    Box,
    Container,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Chip,
    Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function CitySet() {
    const [citySets, setCitySets] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSet, setEditingSet] = useState(null);
    const [setName, setSetName] = useState('');
    const [cityIds, setCityIds] = useState('');
    const [error, setError] = useState('');

    const loadCitySets = async () => {
        try {
            const data = await fetchCitySets();
            setCitySets(data);
            setError('');
        } catch (err) {
            setError(err.message || 'An error occurred while fetching city sets');
        }
    };

    useEffect(() => {
        loadCitySets();
    }, []);

    const handleOpenDialog = (set = null) => {
        if (set) {
            setEditingSet(set);
            setSetName(set.name);
            setCityIds(set.cityIds.join(','));
        } else {
            setEditingSet(null);
            setSetName('');
            setCityIds('');
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingSet(null);
        setSetName('');
        setCityIds('');
        setError('');
    };

    const handleSave = async () => {
        try {
            const cityIdArray = cityIds.split(',').map(id => id.trim()).filter(Boolean);

            if (editingSet) {
                await updateCitySet(editingSet.id, setName, cityIdArray);
            } else {
                await createCitySet(setName, cityIdArray);
            }

            handleCloseDialog();
            loadCitySets();
        } catch (err) {
            setError(err.message || 'An error occurred while saving');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this city set?')) {
            return;
        }

        try {
            await deleteCitySet(id);
            loadCitySets();
        } catch (err) {
            setError(err.message || 'An error occurred while deleting');
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">
                        City Sets
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Add New Set
                    </Button>
                </Box>

                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>City IDs</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {citySets.map((set) => (
                                <TableRow key={set.id}>
                                    <TableCell>{set.name}</TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            {set.cityIds.map((cityId) => (
                                                <Chip
                                                    key={cityId}
                                                    label={cityId}
                                                    size="small"
                                                    sx={{ my: 0.5 }}
                                                />
                                            ))}
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            color="primary"
                                            onClick={() => handleOpenDialog(set)}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            onClick={() => handleDelete(set.id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingSet ? 'Edit City Set' : 'New City Set'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Set Name"
                        fullWidth
                        value={setName}
                        onChange={(e) => setSetName(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        label="City IDs"
                        fullWidth
                        multiline
                        rows={4}
                        value={cityIds}
                        onChange={(e) => setCityIds(e.target.value)}
                        helperText="Enter comma-separated city IDs"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!setName || !cityIds}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
