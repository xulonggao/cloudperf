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
        { id: "New York", name: "New York", latitude: 40.7128, longitude: -74.006 },
        { id: "San Francisco", name: "San Francisco", latitude: 37.7749, longitude: -122.4194 }
    ],
    "CN": [
        { id: "Shanghai", name: "Shanghai", latitude: 31.2304, longitude: 121.4737 },
        { id: "Beijing", name: "Beijing", latitude: 39.9042, longitude: 116.4074 }
    ]
};

const mockAsns = {
    "US": {
        "New York": [
            { asn: "AS7922", asnName: "Comcast", cityId: "US-NYC-7922" },
            { asn: "AS3356", asnName: "Level 3", cityId: "US-NYC-3356" }
        ],
        "San Francisco": [
            { asn: "AS16509", asnName: "Amazon", cityId: "US-SFO-16509" },
            { asn: "AS15169", asnName: "Google", cityId: "US-SFO-15169" }
        ]
    }
};

// Mock Redis storage
const mockRedisStorage = new Map([
    ["test:key1", "value1"],
    ["test:key2", "value2"],
    ["user:1", JSON.stringify({ name: "John", role: "admin" })],
    ["counter", "42"]
]);

const mockCitySets = [
    { id: 1, name: "US East Coast", cityIds: ["US-NYC-7922", "US-NYC-3356"] },
    { id: 2, name: "US West Coast", cityIds: ["US-SFO-16509", "US-SFO-15169"] }
];

const mockPerformanceData = {
    samples: 1000,
    srcCityIds: 1234,
    distCityIds: 2345,
    min: 10,
    max: 90,
    avg: 45,
    p50: 50,
    p70: 50,
    p90: 42,
    p95: 42,
    asnData: [
        { asn: "AS7922", p70: 42 },
        { asn: "AS3356", p70: 48 }
    ],
    cityData: [
        { city: "New York", p70: 45 },
        { city: "San Francisco", p70: 55 }
    ],
    rawData: []
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

            // Statistics endpoint
            this.get("/statistics", () => ({
                'all-country': Math.floor(Math.random() * 50 + 100),
                'all-city': Math.floor(Math.random() * 100 + 200),
                'all-asn': Math.floor(Math.random() * 1000 + 5000),
                'ping-stable': Math.floor(Math.random() * 5000 + 15000),
                'ping-new': Math.floor(Math.random() * 500 + 1000),
                'ping-loss': Math.floor(Math.random() * 100 + 100),
                'cidr-ready': Math.floor(Math.random() * 200 + 800),
                'cidr-outdated': Math.floor(Math.random() * 200 + 800),
                'cidr-queue': Math.floor(Math.random() * 200 + 800),
                'cityid-all': Math.floor(Math.random() * 100 + 300),
                'cityid-ping': Math.floor(Math.random() * 200 + 800),
                'cityid-pair': Math.floor(Math.random() * 10000 + 50000),
                'ping-clients': Array.from({ length: 5 }, (_, i) => ({
                    ip: `192.168.1.${i + 1}`,
                    region: "US",
                    status: "online"
                })),
                'data-clients': Array.from({ length: 5 }, (_, i) => ({
                    ip: `192.168.2.${i + 1}`,
                    region: "CN",
                    status: "offline"
                }))
            }));

            // IP info lookup
            this.get("/ipinfo", (schema, request) => {
                const ip = request.queryParams.ip;
                return {
                    ip,
                    asn: "15169",
                    country: "US",
                    region: "California",
                    asnType: "Content",
                    startIp: "2.3.4.0",
                    endIp: "2.3.4.255",
                    cityId: "US-SFO-15169",
                    latitude: 37.7749,
                    longitude: -122.4194,
                    name: "Ohio",
                    asnName: "Telecom",
                    domain: "",
                    ipcounts: 12413,
                };
            });

            // ASN info lookup
            this.get("/asninfo", (schema, request) => {
                const filter = request.queryParams.filter;
                return [
                    {
                        asn: "16509",
                        country: "US",
                        region: "Virginia",
                        asnType: "Cloud",
                        startIp: "3.2.34.0",
                        endIp: "3.2.34.255",
                        cityId: "US-IAD-16509",
                        latitude: 38.9519,
                        longitude: -77.4480,
                        name: "Ohio",
                        asnName: "Telecom",
                        domain: "",
                        ipcounts: 12413,
                    },
                    {
                        asn: "16510",
                        country: "US",
                        region: "Virginia",
                        asnType: "Cloud",
                        startIp: "3.2.35.0",
                        endIp: "3.2.35.255",
                        cityId: "US-IAD-16510",
                        latitude: 36.9519,
                        longitude: -75.4480,
                        name: "Ohio",
                        asnName: "Telecom",
                        domain: "",
                        ipcounts: 12413,
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
                        sC: source.cityId,
                        sA: source.asn,
                        sLa: source.latitude,
                        sLo: source.longitude,
                        dC: dest.cityId,
                        dA: dest.asn,
                        dLa: dest.latitude,
                        dLo: dest.longitude,
                        min: Math.floor(Math.random() * 100 + 20),
                        max: Math.floor(Math.random() * 100 + 20),
                        avg: Math.floor(Math.random() * 100 + 20),
                        p50: Math.floor(Math.random() * 100 + 20),
                        p70: Math.floor(Math.random() * 100 + 20),
                        p90: Math.floor(Math.random() * 100 + 20),
                        p95: Math.floor(Math.random() * 100 + 20)
                    }))
                );

                return {
                    ...mockPerformanceData,
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
            // SQL execution endpoint
            this.post("/runsql", (schema, request) => {
                const { sql } = JSON.parse(request.requestBody);
                // Mock SQL execution with sample responses
                if (sql.toLowerCase().includes("select")) {
                    return {
                        columns: ["id", "name", "value"],
                        rows: [
                            [1, "test1", 100],
                            [2, "test2", 200],
                        ]
                    };
                } else if (sql.toLowerCase().includes("insert")) {
                    return { affectedRows: 1, insertId: 123 };
                } else if (sql.toLowerCase().includes("update")) {
                    return { affectedRows: 2 };
                } else if (sql.toLowerCase().includes("delete")) {
                    return { affectedRows: 1 };
                } else {
                    return { error: "Unsupported SQL operation" };
                }
            });

            // Redis endpoints
            this.get("/redis", (schema, request) => {
                const key = request.queryParams.key;
                if (!key) {
                    return Array.from(mockRedisStorage.entries()).map(([k, v]) => ({ key: k, value: v }));
                }
                const value = mockRedisStorage.get(key);
                if (value === undefined) {
                    return new Response(404, {}, { error: "Key not found" });
                }
                return value;
            });

            this.put("/redis", (schema, request) => {
                const { key, value } = JSON.parse(request.requestBody);
                mockRedisStorage.set(key, value);
                return { success: true };
            });

            this.delete("/redis", (schema, request) => {
                const key = request.queryParams.key;
                if (!mockRedisStorage.has(key)) {
                    return new Response(404, {}, { error: "Key not found" });
                }
                mockRedisStorage.delete(key);
                return { success: true };
            });
        }
    });
}
