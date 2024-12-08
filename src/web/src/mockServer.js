import { createServer, Response } from "miragejs"

// Sample data generators
const generateCountries = () => [
    "United States", "China", "Japan", "Germany", "United Kingdom",
    "France", "India", "Canada", "Brazil", "Australia"
];

const generateCities = () => [
    "New York", "Tokyo", "London", "Paris", "Shanghai",
    "Hong Kong", "Singapore", "Sydney", "Mumbai", "Toronto"
];

const generateAsns = () => [
    "AS7922 Comcast", "AS3356 Level 3", "AS701 Verizon",
    "AS2914 NTT", "AS6939 Hurricane Electric",
    "AS4134 China Telecom", "AS9808 China Mobile",
    "AS20940 Akamai", "AS16509 Amazon", "AS15169 Google"
];

// City coordinates for the map
const cityCoordinates = {
    "New York": [-74.006, 40.7128],
    "Tokyo": [139.6917, 35.6895],
    "London": [-0.1276, 51.5074],
    "Paris": [2.3522, 48.8566],
    "Shanghai": [121.4737, 31.2304],
    "Hong Kong": [114.1694, 22.3193],
    "Singapore": [103.8198, 1.3521],
    "Sydney": [151.2093, -33.8688],
    "Mumbai": [72.8777, 19.0760],
    "Toronto": [-79.3832, 43.6532]
};

const filterData = (data, query) => {
    if (!query) return data;
    const lowerQuery = query.toLowerCase();
    return data.filter(item =>
        item.toLowerCase().includes(lowerQuery)
    );
};

export function startMockServer() {
    console.log('Starting mock server...');

    return createServer({
        seeds(server) {
            console.log('Seeding initial data...');
        },

        routes() {
            this.namespace = "api"

            this.get("/stats", () => {
                console.log('Mock server: Handling /stats request');
                const data = {
                    activeNodes: Math.floor(Math.random() * 100 + 200),
                    avgLatency: `${Math.floor(Math.random() * 20 + 30)}ms`,
                    networkStatus: `${(Math.random() * 2 + 97).toFixed(1)}%`,
                    regions: Math.floor(Math.random() * 5 + 10)
                };
                console.log('Mock server: Returning stats data:', data);
                return data;
            })

            this.get("/performance", (schema, request) => {
                console.log('Mock server: Handling /performance request');
                const range = request.queryParams.range || '24h';
                const dataPoints = range === '24h' ? 24 : 12;

                const data = [...Array(dataPoints)].map((_, i) => ({
                    name: `${i}:00`,
                    latency: Math.floor(Math.random() * 300 + 100),
                    throughput: Math.floor(Math.random() * 800 + 200)
                }));
                console.log('Mock server: Returning performance data:', data);
                return data;
            })

            this.get("/regions", () => {
                console.log('Mock server: Handling /regions request');
                const data = [
                    { name: "NA", value: Math.floor(Math.random() * 2000 + 3000) },
                    { name: "EU", value: Math.floor(Math.random() * 1500 + 2500) },
                    { name: "Asia", value: Math.floor(Math.random() * 1000 + 2000) },
                    { name: "SA", value: Math.floor(Math.random() * 500 + 1000) },
                    { name: "Africa", value: Math.floor(Math.random() * 300 + 500) }
                ];
                console.log('Mock server: Returning regions data:', data);
                return data;
            })

            this.get("/latency", (schema, request) => {
                console.log('Mock server: Handling /latency request');
                const targetCity = request.queryParams.city || 'New York';
                const cities = generateCities();

                // Generate latency data for up to 10 random cities
                const data = cities
                    .filter(city => city !== targetCity)
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 10)
                    .map(city => ({
                        from: city,
                        to: targetCity,
                        latency: Math.floor(Math.random() * 200 + 50),
                        coordinates: {
                            from: cityCoordinates[city],
                            to: cityCoordinates[targetCity]
                        }
                    }));

                console.log('Mock server: Returning latency data:', data);
                return data;
            })

            // Filter endpoints
            this.get("/country", (schema, request) => {
                const query = request.queryParams.q || '';
                const data = filterData(generateCountries(), query);
                return data;
            })

            this.get("/city", (schema, request) => {
                const query = request.queryParams.q || '';
                const data = filterData(generateCities(), query);
                return data;
            })

            this.get("/asn", (schema, request) => {
                const query = request.queryParams.q || '';
                const data = filterData(generateAsns(), query);
                return data;
            })
        },
    })
}
