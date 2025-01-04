const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const TIMEOUT_MS = 5000; // 5 second timeout

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

export const fetchPerformanceData = async (timeRange = '24h', cityIds = []) => {
    try {
        const params = new URLSearchParams();
        params.append('range', timeRange);
        if (cityIds.length) params.append('cityIds', cityIds.join(','));
        const response = await fetchWithTimeout(`${API_BASE_URL}/performance?${params.toString()}`);
        return handleArrayResponse(response);
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

export const fetchCountries = async (query = '') => {
    try {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
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

export const fetchCities = async (countryId = '', query = '') => {
    try {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (countryId) params.append('countryId', countryId);
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

export const fetchAsns = async (countryId = '', cityId = '', query = '') => {
    try {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (countryId) params.append('countryId', countryId);
        if (cityId) params.append('cityId', cityId);
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
