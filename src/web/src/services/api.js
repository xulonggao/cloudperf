const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const TIMEOUT_MS = 30000; // 30 second timeout

const fetchWithTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeout);
        return response;
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
};

const handleArrayResponse = async (response) => {
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `Network response was not ok (${response.status})`);
    }
    try {
        const data = await response.json();
        // Validate response format
        if (!Array.isArray(data)) {
            throw new Error('Invalid response format: expected array');
        }
        return data;
    } catch (error) {
        throw new Error(`Invalid JSON response: ${error.message}`);
    }
};

const handleJsonResponse = async (response) => {
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `Network response was not ok (${response.status})`);
    }
    try {
        return await response.json();
    } catch (error) {
        throw new Error(`Invalid JSON response: ${error.message}`);
    }
};

export const fetchDashboardStats = async () => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/stats`);
        return handleJsonResponse(response);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
    }
};

export const fetchPerformanceData = async (srcCityIds = [], destCityIds = [], rawData = false) => {
    try {
        const params = new URLSearchParams();
        if (srcCityIds.length) params.append('src', srcCityIds.join(','));
        if (destCityIds.length) params.append('dist', destCityIds.join(','));
        if (rawData) params.append('rawData', '1')
        const response = await fetchWithTimeout(`${API_BASE_URL}/performance?${params.toString()}`);
        return handleJsonResponse(response);
    } catch (error) {
        console.error('Error fetching performance data:', error);
        throw error;
    }
};

export const fetchRegionalData = async (cityIds = []) => {
    try {
        const params = new URLSearchParams();
        if (cityIds.length) params.append('cityIds', cityIds.join(','));
        const response = await fetchWithTimeout(`${API_BASE_URL}/regions?${params.toString()}`);
        return handleArrayResponse(response);
    } catch (error) {
        console.error('Error fetching regional data:', error);
        throw error;
    }
};

export const fetchLatencyData = async (cityIds = []) => {
    try {
        const params = new URLSearchParams();
        if (cityIds.length) params.append('cityIds', cityIds.join(','));
        const response = await fetchWithTimeout(`${API_BASE_URL}/latency?${params.toString()}`);
        return handleArrayResponse(response);
    } catch (error) {
        console.error('Error fetching latency data:', error);
        throw error;
    }
};

export const fetchCountries = async (cityset = '') => {
    try {
        const params = new URLSearchParams();
        if (cityset) params.append('cityset', cityset);
        const response = await fetchWithTimeout(
            `${API_BASE_URL}/country?${params.toString()}`
        );
        return handleArrayResponse(response);
    } catch (error) {
        console.error('Error fetching countries:', error);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
};

export const fetchCities = async (country = '', cityset = '') => {
    try {
        const params = new URLSearchParams();
        if (cityset) params.append('cityset', cityset);
        if (country) params.append('country', country);
        const response = await fetchWithTimeout(
            `${API_BASE_URL}/city?${params.toString()}`
        );
        return handleArrayResponse(response);
    } catch (error) {
        console.error('Error fetching cities:', error);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
};

export const fetchCitySets = async () => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/cityset`);
        return handleArrayResponse(response);
    } catch (error) {
        console.error('Error fetching city sets:', error);
        throw error;
    }
};

export const fetchIPInfo = async (ip) => {
    try {
        const params = new URLSearchParams();
        params.append('ip', ip);
        const response = await fetchWithTimeout(`${API_BASE_URL}/ipinfo?${params.toString()}`);
        return handleJsonResponse(response);
    } catch (error) {
        console.error('Error fetching IP info:', error);
        throw error;
    }
};

export const fetchASNInfo = async (filter = '') => {
    try {
        const params = new URLSearchParams();
        if (filter) params.append('filter', filter);
        const response = await fetchWithTimeout(`${API_BASE_URL}/asninfo?${params.toString()}`);
        return handleArrayResponse(response);
    } catch (error) {
        console.error('Error fetching ASN info:', error);
        throw error;
    }
};

export const createCitySet = async (name, cityIds) => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/cityset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, cityIds })
        });
        return handleJsonResponse(response);
    } catch (error) {
        console.error('Error creating city set:', error);
        throw error;
    }
};

export const updateCitySet = async (id, name, cityIds) => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/cityset`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id, name, cityIds })
        });
        return handleJsonResponse(response);
    } catch (error) {
        console.error('Error updating city set:', error);
        throw error;
    }
};

export const deleteCitySet = async (id) => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/cityset?id=${id}`, {
            method: 'DELETE'
        });
        return handleJsonResponse(response);
    } catch (error) {
        console.error('Error deleting city set:', error);
        throw error;
    }
};

export const login = async (username, password) => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        return handleJsonResponse(response);
    } catch (error) {
        console.error('Error during login:', error);
        throw error;
    }
};

export const executeSQL = async (sql) => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/runsql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql })
        });
        return handleJsonResponse(response);
    } catch (error) {
        console.error('Error executing SQL:', error);
        throw error;
    }
};

export const getRedisValue = async (key) => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/redis?key=${encodeURIComponent(key)}`);
        return handleJsonResponse(response);
    } catch (error) {
        console.error('Error getting Redis value:', error);
        throw error;
    }
};

export const setRedisValue = async (key, value) => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/redis`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key, value })
        });
        return handleJsonResponse(response);
    } catch (error) {
        console.error('Error setting Redis value:', error);
        throw error;
    }
};

export const deleteRedisKey = async (key) => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/redis?key=${encodeURIComponent(key)}`, {
            method: 'DELETE'
        });
        return handleJsonResponse(response);
    } catch (error) {
        console.error('Error deleting Redis key:', error);
        throw error;
    }
};

export const fetchAsns = async (country = '', city = '', cityset = '') => {
    try {
        const params = new URLSearchParams();
        if (cityset) params.append('cityset', cityset);
        if (country) params.append('country', country);
        if (city) params.append('city', city);
        const response = await fetchWithTimeout(
            `${API_BASE_URL}/asn?${params.toString()}`
        );
        return handleArrayResponse(response);
    } catch (error) {
        console.error('Error fetching ASNs:', error);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
};
