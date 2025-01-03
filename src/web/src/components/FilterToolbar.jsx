import { useState, useEffect } from 'react';
import { Box, Autocomplete, TextField, CircularProgress } from '@mui/material';
import { fetchCountries, fetchCities, fetchAsns } from '../services/api';

// Debounce function to limit API calls
const debounce = (func, wait) => {
    let timeout;
    const debouncedFn = (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
    debouncedFn.cancel = () => clearTimeout(timeout);
    return debouncedFn;
};

const AutocompleteField = ({ label, options, value, onChange, onInputChange, loading, multiple = false }) => (
    <Autocomplete
        multiple={multiple}
        size="small"
        sx={{
            width: 180,
            '.MuiOutlinedInput-root': {
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 1)',
                },
            },
        }}
        options={options}
        value={value}
        onChange={onChange}
        onInputChange={onInputChange}
        loading={loading}
        renderInput={(params) => (
            <TextField
                {...params}
                label={label}
                InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                        <>
                            {loading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                        </>
                    ),
                }}
            />
        )}
        getOptionLabel={(option) => {
            if (typeof option === 'object' && option !== null) {
                return option.name || '';
            }
            return option || '';
        }}
        isOptionEqualToValue={(option, value) => {
            if (!option || !value) return false;
            if (typeof option === 'object' && typeof value === 'object') {
                return option.id === value.id;
            }
            return option === value;
        }}
    />
);

export default function FilterToolbar({ onAsnSelectionChange }) {
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [asns, setAsns] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [selectedCity, setSelectedCity] = useState(null);
    const [selectedAsns, setSelectedAsns] = useState([]);
    const [loading, setLoading] = useState({
        countries: false,
        cities: false,
        asns: false
    });

    // Debounced search functions with mounted checks
    const debouncedFetchCountries = debounce(async (query, mounted) => {
        if (!mounted()) return;
        console.log('Fetching countries with query:', query);

        try {
            setLoading(prev => ({ ...prev, countries: true }));
            const data = await fetchCountries(query);
            console.log('Received countries data:', data);

            if (!mounted()) return;
            setCountries(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching countries:', error);
            if (!mounted()) return;
            setCountries([]);
        } finally {
            if (!mounted()) return;
            setLoading(prev => ({ ...prev, countries: false }));
        }
    }, 300);

    const debouncedFetchCities = debounce(async (countryId, query, mounted) => {
        if (!countryId || !mounted()) return;
        console.log('Fetching cities for country:', countryId, 'query:', query);

        try {
            setLoading(prev => ({ ...prev, cities: true }));
            const data = await fetchCities(countryId, query);
            console.log('Received cities data:', data);

            if (!mounted()) return;
            setCities(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching cities:', error);
            if (!mounted()) return;
            setCities([]);
        } finally {
            if (!mounted()) return;
            setLoading(prev => ({ ...prev, cities: false }));
        }
    }, 300);

    const debouncedFetchAsns = debounce(async (countryId, cityId, query, mounted) => {
        if (!countryId || !cityId || !mounted()) return;
        console.log('Fetching ASNs for country:', countryId, 'city:', cityId, 'query:', query);

        try {
            setLoading(prev => ({ ...prev, asns: true }));
            const data = await fetchAsns(countryId, cityId, query);
            console.log('Received ASNs data:', data);

            if (!mounted()) return;
            const validData = Array.isArray(data) ? data : [];
            setAsns(validData);
        } catch (error) {
            console.error('Error fetching ASNs:', error);
            if (!mounted()) return;
            setAsns([]);
        } finally {
            if (!mounted()) return;
            setLoading(prev => ({ ...prev, asns: false }));
        }
    }, 300);

    // Initial load of countries
    useEffect(() => {
        let isMounted = true;
        const getMounted = () => isMounted;

        console.log('Initial countries load...');
        debouncedFetchCountries('', getMounted);

        return () => {
            isMounted = false;
            debouncedFetchCountries.cancel();
        };
    }, []);

    // Cleanup debounced functions on unmount
    useEffect(() => {
        return () => {
            debouncedFetchCountries.cancel?.();
            debouncedFetchCities.cancel?.();
            debouncedFetchAsns.cancel?.();
        };
    }, []);

    // Handle country selection
    const handleCountryChange = (event, newValue) => {
        console.log('Country selection changed:', newValue);
        setSelectedCountry(newValue);
        setSelectedCity(null);
        setSelectedAsns([]);
        setCities([]); // Clear cities immediately
        setAsns([]); // Clear ASNs immediately
        onAsnSelectionChange?.([]); // Notify parent when clearing selections

        if (newValue) {
            let isMounted = true;
            const getMounted = () => isMounted;
            debouncedFetchCities(newValue.id, '', getMounted);
            return () => {
                isMounted = false;
                debouncedFetchCities.cancel();
            };
        }
    };

    // Handle city selection
    const handleCityChange = (event, newValue) => {
        console.log('City selection changed:', newValue);
        setSelectedCity(newValue);
        setSelectedAsns([]);
        setAsns([]); // Clear ASNs immediately
        if (!newValue) {
            onAsnSelectionChange?.([]); // Notify parent when city is deselected
        }

        if (selectedCountry && newValue) {
            let isMounted = true;
            const getMounted = () => isMounted;

            const fetchAndSelectAsns = async () => {
                console.log('Fetching ASNs for city:', newValue.id);
                if (!isMounted) return;

                try {
                    setLoading(prev => ({ ...prev, asns: true }));
                    const data = await fetchAsns(selectedCountry.id, newValue.id, '');
                    console.log('Received ASNs data:', data);

                    if (!isMounted) return;
                    const validData = Array.isArray(data) ? data.map(asn => ({
                        ...asn,
                        cityId: newValue.id // Ensure cityId is set for each ASN
                    })) : [];
                    setAsns(validData);
                    setSelectedAsns(validData); // Auto-select ASNs after fetching
                    onAsnSelectionChange?.(validData); // Notify parent of auto-selected ASNs
                } catch (error) {
                    console.error('Error fetching ASNs:', error);
                    if (!isMounted) return;
                    setAsns([]);
                    setSelectedAsns([]);
                    onAsnSelectionChange?.([]); // Notify parent when clearing ASNs
                } finally {
                    if (!isMounted) return;
                    setLoading(prev => ({ ...prev, asns: false }));
                }
            };

            fetchAndSelectAsns();
            return () => {
                isMounted = false;
            };
        }
    };

    // Handle ASN selection
    const handleAsnChange = (event, newValue) => {
        console.log('ASN selection changed:', newValue);
        const validAsns = Array.isArray(newValue) ? newValue : [];
        setSelectedAsns(validAsns);
        // Notify parent component of ASN selection change
        onAsnSelectionChange?.(validAsns);
    };

    return (
        <Box sx={{ display: 'flex', gap: 2, p: 2 }}>
            <AutocompleteField
                label="Country"
                options={countries}
                value={selectedCountry}
                onChange={handleCountryChange}
                onInputChange={(event, value) => {
                    let isMounted = true;
                    const getMounted = () => isMounted;
                    debouncedFetchCountries(value, getMounted);
                    return () => {
                        isMounted = false;
                        debouncedFetchCountries.cancel();
                    };
                }}
                loading={loading.countries}
            />
            <AutocompleteField
                label="City"
                options={cities}
                value={selectedCity}
                onChange={handleCityChange}
                onInputChange={(event, value) => {
                    if (!selectedCountry) return;
                    let isMounted = true;
                    const getMounted = () => isMounted;
                    debouncedFetchCities(selectedCountry.id, value, getMounted);
                    return () => {
                        isMounted = false;
                        debouncedFetchCities.cancel();
                    };
                }}
                loading={loading.cities}
            />
            <AutocompleteField
                label="ASN"
                options={asns}
                value={selectedAsns}
                onChange={handleAsnChange}
                onInputChange={(event, value) => {
                    if (!selectedCountry || !selectedCity) return;
                    let isMounted = true;
                    const getMounted = () => isMounted;
                    debouncedFetchAsns(selectedCountry.id, selectedCity.id, value, getMounted);
                    return () => {
                        isMounted = false;
                        debouncedFetchAsns.cancel();
                    };
                }}
                loading={loading.asns}
                multiple={true}
            />
        </Box>
    );
}
