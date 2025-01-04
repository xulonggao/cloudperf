import { createServer, Response } from "miragejs";

// Mock data
const mockCountries = [
    { code: "US", name: "United States" },
    { code: "CN", name: "China" },
    { code: "JP", name: "Japan" },
    { code: "GB", name: "United Kingdom" },
    { code: "DE", name: "Germany" }
];

const mockCities = {
    "US": [
        { id: "US-NYC", name: "New York", lat: 40.7128, lon: -74.006 },
        { id: "US-SFO", name: "San Francisco", lat: 37.7749, lon: -122.4194 }
    ],
    "CN": [
        { id: "CN-SHA", name: "Shanghai", lat: 31.2304, lon: 121.4737 },
        { id: "CN-BEJ", name: "Beijing", lat: 39.9042, lon: 116.4074 }
    ]
};

const mockAsns = {
    "US": {
        "US-NYC": [
            { id: "AS7922", name: "Comcast", cityId: "US-NYC-7922" },
            { id: "AS3356", name: "Level 3", cityId: "US-NYC-3356" }
        ],
        "US-SFO": [
            { id: "AS16509", name: "Amazon", cityId: "US-SFO-16509" },
            { id: "AS15169", name: "Google", cityId: "US-SFO-15169" }
        ]
    }
};

const mockCitySets = [
    { id: 1, name: "US East Coast", cityIds: ["US-NYC-7922", "US-NYC-3356"] },
    { id: 2, name: "US West Coast", cityIds: ["US-SFO-16509", "US-SFO-15169"] }
];

const mockPerformanceData = {
    samples: 1000,
    avgLatency: 45,
    medianLatency: 42,
    p70Latency: 50,
    timeSeriesData: Array(7).fill().map((_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        avgLatency: Math.floor(Math.random() * 20 + 35)
    })),
    asnData: [
        { asn: "AS7922", avgLatency: 42 },
        { asn: "AS3356", avgLatency: 48 }
    ],
    cityData: [
        { city: "New York", avgLatency: 45 },
        { city: "San Francisco", avgLatency: 55 }
    ]
};

const filterData = (data, query = '') => {
    if (!query) return data;
    const lowerQuery = query.toLowerCase();
    return data.filter(item =>
        item.name.toLowerCase().includes(lowerQuery)
    );
};

export function startMockServer() {
    return createServer({
        routes() {
            this.namespace = "api";

            // Authentication
            this.post("/login", (schema, request) => {
                const { username, password } = JSON.parse(request.requestBody);
                if (username === "admin" && password === "admin") {
                    return { token: "mock-jwt-token" };
                }
                return new Response(401, {}, { error: "Invalid credentials" });
            });

            // Status endpoint
            this.get("/status", () => ({
                activeNodes: Math.floor(Math.random() * 100 + 200),
                avgLatency: Math.floor(Math.random() * 20 + 30),
                uptime: (Math.random() * 2 + 97).toFixed(1),
                lastUpdate: new Date().toISOString()
            }));

            // IP info lookup
            this.get("/ipinfo", (schema, request) => {
                const ip = request.queryParams.ip;
                return {
                    ip,
                    asn: "AS15169",
                    country: "US",
                    region: "California",
                    asnType: "Content",
                    ipRange: ["2.3.4.0", "2.3.4.255"],
                    cityId: "US-SFO-15169",
                    latitude: 37.7749,
                    longitude: -122.4194
                };
            });

            // ASN info lookup
            this.get("/asninfo", (schema, request) => {
                const filter = request.queryParams.filter;
                return [
                    {
                        asn: "AS16509",
                        country: "US",
                        region: "Virginia",
                        asnType: "Cloud",
                        ipRange: ["3.2.34.0", "3.2.34.255"],
                        cityId: "US-IAD-16509",
                        latitude: 38.9519,
                        longitude: -77.4480
                    },
                    {
                        asn: "AS16510",
                        country: "US",
                        region: "Virginia",
                        asnType: "Cloud",
                        ipRange: ["3.2.35.0", "3.2.35.255"],
                        cityId: "US-IAD-16510",
                        latitude: 36.9519,
                        longitude: -75.4480
                    }
                ];
            });

            // Performance data
            this.get("/performance", (schema, request) => {
                const src = request.queryParams.src?.split(',') || [];
                const dist = request.queryParams.dist?.split(',') || [];

                // Generate location data for each cityId
                const sourceLocations = src.map(cityId => ({
                    cityId,
                    asn: cityId.split('-')[2],
                    latitude: 37.7749 + Math.random() * 10,
                    longitude: -122.4194 + Math.random() * 10
                }));

                const destLocations = dist.map(cityId => ({
                    cityId,
                    asn: cityId.split('-')[2],
                    latitude: 40.7128 + Math.random() * 10,
                    longitude: -74.0060 + Math.random() * 10
                }));

                // Generate latency data for each source-destination pair
                const latencyData = sourceLocations.flatMap(source =>
                    destLocations.map(dest => ({
                        sourceCityId: source.cityId,
                        sourceAsn: source.asn,
                        sourceLat: source.latitude,
                        sourceLon: source.longitude,
                        destCityId: dest.cityId,
                        destAsn: dest.asn,
                        destLat: dest.latitude,
                        destLon: dest.longitude,
                        latency: Math.floor(Math.random() * 100 + 20)
                    }))
                );

                return {
                    ...mockPerformanceData,
                    sourceLocations,
                    destLocations,
                    latencyData
                };
            });

            // City sets
            this.get("/cityset", () => mockCitySets);

            this.post("/cityset", (schema, request) => {
                const data = JSON.parse(request.requestBody);
                const newSet = {
                    id: mockCitySets.length + 1,
                    ...data
                };
                mockCitySets.push(newSet);
                return newSet;
            });

            // Location data
            this.get("/country", () => mockCountries);

            this.get("/city", (schema, request) => {
                const country = request.queryParams.country;
                return mockCities[country] || [];
            });

            this.get("/asn", (schema, request) => {
                const country = request.queryParams.country;
                const city = request.queryParams.city;
                return country && city ? mockAsns[country]?.[city] || [] : [];
            });
        }
    });
}
