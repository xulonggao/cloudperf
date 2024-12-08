const API_BASE_URL = '/api';

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Network response was not ok');
    }
    return response.json();
};

export const fetchDashboardStats = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        return handleResponse(response);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
    }
};

export const fetchPerformanceData = async (timeRange = '24h') => {
    try {
        const response = await fetch(`${API_BASE_URL}/performance?range=${timeRange}`);
        return handleResponse(response);
    } catch (error) {
        console.error('Error fetching performance data:', error);
        throw error;
    }
};

export const fetchRegionalData = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/regions`);
        return handleResponse(response);
    } catch (error) {
        console.error('Error fetching regional data:', error);
        throw error;
    }
};

export const fetchLatencyData = async (city) => {
    try {
        const response = await fetch(`${API_BASE_URL}/latency?city=${encodeURIComponent(city)}`);
        return handleResponse(response);
    } catch (error) {
        console.error('Error fetching latency data:', error);
        throw error;
    }
};

export const fetchCountries = async (query = '') => {
    try {
        const response = await fetch(`${API_BASE_URL}/country?q=${encodeURIComponent(query)}`);
        return handleResponse(response);
    } catch (error) {
        console.error('Error fetching countries:', error);
        throw error;
    }
};

export const fetchCities = async (query = '') => {
    try {
        const response = await fetch(`${API_BASE_URL}/city?q=${encodeURIComponent(query)}`);
        return handleResponse(response);
    } catch (error) {
        console.error('Error fetching cities:', error);
        throw error;
    }
};

export const fetchAsns = async (query = '') => {
    try {
        const response = await fetch(`${API_BASE_URL}/asn?q=${encodeURIComponent(query)}`);
        return handleResponse(response);
    } catch (error) {
        console.error('Error fetching ASNs:', error);
        throw error;
    }
};
