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
            {
                asn: "AS7922", asnName: "Comcast", cityId: "US-NYC-7922", name: "New York",
                asnType: "isp", latitude: 40.7128, longitude: -74.006, domain: "comcast.net", ipcounts: 12345, country: "US", region: "New York", startIp: "123.2.3.4", endIp: "12.3.4.5"
            },
            {
                asn: "AS3356", asnName: "Level 3", cityId: "US-NYC-3356", name: "New York",
                asnType: "hosting", latitude: 40.7128, longitude: -74.006, domain: "level3.net", ipcounts: 12345, country: "US", region: "New York", startIp: "123.2.3.4", endIp: "12.3.4.5"
            },
            {
                asn: "AS13", asnName: "FedNet", cityId: "US-NYC-13", name: "New York",
                asnType: "government", latitude: 40.7128, longitude: -74.006, domain: "fednet.gov", ipcounts: 5000, country: "US", region: "New York", startIp: "123.2.3.4", endIp: "12.3.4.5"
            }
        ],
        "San Francisco": [
            {
                asn: "AS16509", asnName: "Amazon AWS", cityId: "US-SFO-16509", name: "San Francisco",
                asnType: "hosting", latitude: 37.7749, longitude: -122.4194, domain: "aws.amazon.com", ipcounts: 12345, country: "US", region: "San Francisco", startIp: "123.2.3.4", endIp: "12.3.4.5"
            },
            {
                asn: "AS15169", asnName: "Google Cloud", cityId: "US-SFO-15169", name: "San Francisco",
                asnType: "hosting", latitude: 37.7749, longitude: -122.4194, domain: "cloud.google.com", ipcounts: 12345, country: "US", region: "San Francisco", startIp: "123.2.3.4", endIp: "12.3.4.5"
            },
            {
                asn: "AS11", asnName: "Stanford University", cityId: "US-SFO-11", name: "San Francisco",
                asnType: "education", latitude: 37.7749, longitude: -122.4194, domain: "stanford.edu", ipcounts: 8000, country: "US", region: "San Francisco", startIp: "123.2.3.4", endIp: "12.3.4.5"
            }
        ]
    },
    "CN": {
        "Shanghai": [
            {
                asn: "AS4134", asnName: "China Unicom", cityId: "CN-SHA-4134", name: "Shanghai",
                asnType: "isp", latitude: 31.2304, longitude: 121.4737, domain: "unicom.com", ipcounts: 12345, country: "CN", region: "Shanghai", startIp: "000000000", endIp: "00000000"
            },
            {
                asn: "AS4809", asnName: "China Telecom", cityId: "CN-SHA-4809", name: "Shanghai",
                asnType: "isp", latitude: 31.2304, longitude: 121.4737, domain: "chinatelecom.com", ipcounts: 12345, country: "CN", region: "Shanghai", startIp: "000000000", endIp: "00000000"
            },
            {
                asn: "AS4538", asnName: "China Education Network", cityId: "CN-SHA-4538", name: "Shanghai",
                asnType: "education", latitude: 31.2304, longitude: 121.4737, domain: "edu.cn", ipcounts: 5000, country: "CN", region: "Shanghai", startIp: "000000000", endIp: "00000000"
            }
        ],
        "Beijing": [
            {
                asn: "AS4847", asnName: "CNIX", cityId: "CN-BEI-4847", name: "Beijing",
                asnType: "business", latitude: 39.9042, longitude: 116.4074, domain: "cnix.cn", ipcounts: 12345, country: "CN", region: "Beijing", startIp: "000000000", endIp: "00000000"
            },
            {
                asn: "AS4808", asnName: "China Mobile", cityId: "CN-BEI-4808", name: "Beijing",
                asnType: "isp", latitude: 39.9042, longitude: 116.4074, domain: "chinamobile.com", ipcounts: 12345, country: "CN", region: "Beijing", startIp: "000000000", endIp: "00000000"
            },
            {
                asn: "AS7497", asnName: "Computer Network Center Chinese Academy of Sciences", cityId: "CN-BEI-7497", name: "Beijing",
                asnType: "government", latitude: 39.9042, longitude: 116.4074, domain: "cas.cn", ipcounts: 3000, country: "CN", region: "Beijing", startIp: "000000000", endIp: "00000000"
            }
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
                    return { token: "mock-jwt-token", user: "admin", auth: 7, expire: 86400 }
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
                const wantRawData = request.queryParams.rawData === '1';

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

                // Generate raw data for time series
                const now = Math.floor(Date.now() / 1000);
                const rawData = sourceLocations.flatMap(source =>
                    destLocations.map(dest => {
                        const samples = Math.floor(Math.random() * 800 + 200); // 200-1000 samples
                        return Array.from({ length: 10 }, (_, i) => ({
                            sC: source.cityId,
                            sA: source.asn,
                            sIP: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                            dC: dest.cityId,
                            dA: dest.asn,
                            dIP: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                            sm: samples,
                            min: Math.floor(Math.random() * 100 + 20),
                            max: Math.floor(Math.random() * 100 + 20),
                            avg: Math.floor(Math.random() * 100 + 20),
                            p50: Math.floor(Math.random() * 100 + 20),
                            p70: Math.floor(Math.random() * 100 + 20),
                            p90: Math.floor(Math.random() * 100 + 20),
                            p95: Math.floor(Math.random() * 100 + 20),
                            ti: now - i * 3600 // One data point per hour going backwards
                        }));
                    })
                ).flat();

                // Calculate aggregate metrics from rawData
                const sm = rawData.reduce((sum, d) => sum + d.sm, 0);
                const min = Math.min(...rawData.map(d => d.min));
                const max = Math.max(...rawData.map(d => d.max));
                const avg = Math.round(rawData.reduce((sum, d) => sum + d.avg, 0) / rawData.length);
                const p50 = Math.round(rawData.reduce((sum, d) => sum + d.p50, 0) / rawData.length);
                const p70 = Math.round(rawData.reduce((sum, d) => sum + d.p70, 0) / rawData.length);
                const p90 = Math.round(rawData.reduce((sum, d) => sum + d.p90, 0) / rawData.length);
                const p95 = Math.round(rawData.reduce((sum, d) => sum + d.p95, 0) / rawData.length);

                // If rawData is requested, return just the raw data array
                if (wantRawData) {
                    return rawData;
                }

                return {
                    sm,
                    srcCityIds: sourceLocations.length,
                    distCityIds: destLocations.length,
                    min,
                    max,
                    avg,
                    p50,
                    p70,
                    p90,
                    p95,
                    latencyData,
                    asnData: [
                        ...sourceLocations.map(src => ({
                            asn: src.asn,
                            isS: true,
                            min: Math.floor(Math.random() * 100 + 20),
                            max: Math.floor(Math.random() * 100 + 20),
                            avg: Math.floor(Math.random() * 100 + 20),
                            p50: Math.floor(Math.random() * 100 + 20),
                            p70: Math.floor(Math.random() * 100 + 20),
                            p90: Math.floor(Math.random() * 100 + 20),
                            p95: Math.floor(Math.random() * 100 + 20)
                        })),
                        ...destLocations.map(dest => ({
                            asn: dest.asn,
                            isS: false,
                            min: Math.floor(Math.random() * 100 + 20),
                            max: Math.floor(Math.random() * 100 + 20),
                            avg: Math.floor(Math.random() * 100 + 20),
                            p50: Math.floor(Math.random() * 100 + 20),
                            p70: Math.floor(Math.random() * 100 + 20),
                            p90: Math.floor(Math.random() * 100 + 20),
                            p95: Math.floor(Math.random() * 100 + 20)
                        }))
                    ],
                    cityData: [
                        ...sourceLocations.map(src => ({
                            city: src.cityId,
                            isS: true,
                            min: Math.floor(Math.random() * 100 + 20),
                            max: Math.floor(Math.random() * 100 + 20),
                            avg: Math.floor(Math.random() * 100 + 20),
                            p50: Math.floor(Math.random() * 100 + 20),
                            p70: Math.floor(Math.random() * 100 + 20),
                            p90: Math.floor(Math.random() * 100 + 20),
                            p95: Math.floor(Math.random() * 100 + 20)
                        })),
                        ...destLocations.map(dest => ({
                            city: dest.cityId,
                            isS: false,
                            min: Math.floor(Math.random() * 100 + 20),
                            max: Math.floor(Math.random() * 100 + 20),
                            avg: Math.floor(Math.random() * 100 + 20),
                            p50: Math.floor(Math.random() * 100 + 20),
                            p70: Math.floor(Math.random() * 100 + 20),
                            p90: Math.floor(Math.random() * 100 + 20),
                            p95: Math.floor(Math.random() * 100 + 20)
                        }))
                    ]
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
