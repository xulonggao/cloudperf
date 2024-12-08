import { useState, useEffect } from 'react';
import { Box, Autocomplete, TextField, CircularProgress } from '@mui/material';
import { fetchCountries, fetchCities, fetchAsns } from '../services/api';

// Debounce function to limit API calls
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

export default function FilterToolbar() {
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [asns, setAsns] = useState([]);

    const [selectedCountry, setSelectedCountry] = useState(null);
    const [selectedCity, setSelectedCity] = useState(null);
    const [selectedAsn, setSelectedAsn] = useState(null);

    const [loading, setLoading] = useState({
        countries: false,
        cities: false,
        asns: false
    });

    // Debounced search functions
    const debouncedFetchCountries = debounce(async (query) => {
        setLoading(prev => ({ ...prev, countries: true }));
        try {
            const data = await fetchCountries(query);
            setCountries(data);
        } catch (error) {
            console.error('Error fetching countries:', error);
        } finally {
            setLoading(prev => ({ ...prev, countries: false }));
        }
    }, 300);

    const debouncedFetchCities = debounce(async (query) => {
        setLoading(prev => ({ ...prev, cities: true }));
        try {
            const data = await fetchCities(query);
            setCities(data);
        } catch (error) {
            console.error('Error fetching cities:', error);
        } finally {
            setLoading(prev => ({ ...prev, cities: false }));
        }
    }, 300);

    const debouncedFetchAsns = debounce(async (query) => {
        setLoading(prev => ({ ...prev, asns: true }));
        try {
            const data = await fetchAsns(query);
            setAsns(data);
        } catch (error) {
            console.error('Error fetching ASNs:', error);
        } finally {
            setLoading(prev => ({ ...prev, asns: false }));
        }
    }, 300);

    // Initial data load
    useEffect(() => {
        debouncedFetchCountries('');
        debouncedFetchCities('');
        debouncedFetchAsns('');
    }, []);

    return (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2 }}>
            <Autocomplete
                sx={{ width: 200 }}
                options={countries}
                value={selectedCountry}
                onChange={(event, newValue) => setSelectedCountry(newValue)}
                onInputChange={(event, newInputValue) => {
                    debouncedFetchCountries(newInputValue);
                }}
                loading={loading.countries}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Country"
                        size="small"
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loading.countries ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }}
                    />
                )}
            />

            <Autocomplete
                sx={{ width: 200 }}
                options={cities}
                value={selectedCity}
                onChange={(event, newValue) => setSelectedCity(newValue)}
                onInputChange={(event, newInputValue) => {
                    debouncedFetchCities(newInputValue);
                }}
                loading={loading.cities}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="City"
                        size="small"
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loading.cities ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }}
                    />
                )}
            />

            <Autocomplete
                sx={{ width: 200 }}
                options={asns}
                value={selectedAsn}
                onChange={(event, newValue) => setSelectedAsn(newValue)}
                onInputChange={(event, newInputValue) => {
                    debouncedFetchAsns(newInputValue);
                }}
                loading={loading.asns}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="ASN"
                        size="small"
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loading.asns ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }}
                    />
                )}
            />
        </Box>
    );
}
