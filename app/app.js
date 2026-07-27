/**
 * AeroCampus-AI | Dynamic Spatial Vector & Atmospheric Engine Controller
 * Features Leaflet 3D Spatial Maps, Google Earth Esri Satellite Maps,
 * and Distinct Command-Center Console Background Engine.
 */

let vantaEffect = null;
let forecastChart = null;
let leafletMap = null;
let activeMapLayers = [];
let activeCorridorTarget = 'nh24';

// GRAP Live Traffic Map Simulation Variables
let grapLeafletMap = null;
let grapTrafficAnimFrame = null;
let grapVehicles = [];
let grapHighwayLine = null;
let grapPerimeterLine = null;
let grapGateLine = null;

// Green Shield Satellite Map Variables
let greenShieldSatMap = null;
let greenShieldBufferPoly = null;
let greenShieldFenceLine = null;
let greenShieldTreeMarkers = [];

let currentRawData = null;
let currentPM25 = 165.4;
let currentWindDirection = 130; // Default live SE wind direction (130°)
let currentNH24Alignment = 0.85;
let currentIndAlignment = 0.35;
let currentStagnation = 0.82;
let lastScrollY = window.scrollY;

// ACCURATE TARGET MAP COORDINATES: JIIT Noida Sector 62
const JIIT_LAT = 28.6295;
const JIIT_LNG = 77.3715;

// Exact 4-Side Campus Boundary Coordinates (North, East, South, West)
const JIIT_CAMPUS_BOUNDS = [
    [28.6310, 77.3685], // North-West corner (Jaypee Road)
    [28.6310, 77.3735], // North-East corner (Jaypee Road / Flyover)
    [28.6260, 77.3735], // South-East corner (Vishwakarma Road)
    [28.6260, 77.3685]  // South-West corner
];

// Full 4-Side Enclosing Fence Loop
const PERIMETER_4WAY_FENCE = [
    [28.6310, 77.3685],
    [28.6310, 77.3735],
    [28.6260, 77.3735],
    [28.6260, 77.3685],
    [28.6310, 77.3685]
];

// Spatial Target Coordinates Calibrated to Jaypee Road & Vishwakarma Road
const SPATIAL_TARGETS = {
    "nh24": {
        name: "NH-24 / Delhi-Meerut Expressway Corridor",
        desc: "Heavy vehicular corridor carrying 150,000+ diesel vehicles daily, located 200m North (45° NE) of Jaypee Road.",
        bearing: "45° (Northeast)",
        distance: "200 meters",
        lat: 28.6335,
        lng: 77.3740,
        color: "#38bdf8",
        vectorKey: "nh24"
    },
    "industrial": {
        name: "Sector 63 Industrial Manufacturing Zone",
        desc: "Industrial fabrication, generator, and commercial combustion complex situated Southeast across Vishwakarma Road.",
        bearing: "135° (Southeast)",
        distance: "450 meters",
        lat: 28.6230,
        lng: 77.3780,
        color: "#a855f7",
        vectorKey: "ind"
    },
    "inversion": {
        name: "Shallow Boundary Layer Inversion Zone",
        desc: "Stagnant winter boundary layer trapping airborne particulates within a 150m vertical radius over the campus during calm wind hours.",
        bearing: "360° (Micro-Local Layer)",
        distance: "Campus Radius 150m",
        lat: 28.6295,
        lng: 77.3715,
        color: "#f59e0b",
        vectorKey: "stag"
    }
};

// Feature Titles Dictionary for Topbar Header
const FEATURE_TITLES = {
    "feature-radar": "Feature 01: Real-Time Micro-Local Environmental Radar",
    "feature-forecaster": "Feature 02: ML Smog Spike Forecaster (R² = 0.9439)",
    "feature-policy": "Feature 03: GRAP Policy Scenario Simulator",
    "feature-greenshield": "Feature 04: Green Shield Ecological Boundary Planner",
    "feature-alerts": "Feature 05: Emergency Safety SOP & Automation Dispatcher"
};

const SPECIES_K = {
    "neem": 0.080,
    "pilkan": 0.070,
    "amaltas": 0.035,
    "mixed_native_ncr": 0.075
};

// Road Routes Calibrated to Surrounding Campus Roads
const JAYPEE_ROAD_ROUTE = [
    [28.6315, 77.3670],
    [28.6315, 77.3700],
    [28.6315, 77.3735],
    [28.6275, 77.3735]
];

const VISHWAKARMA_RING_ROUTE = [
    [28.6315, 77.3735],
    [28.6285, 77.3735],
    [28.6260, 77.3735],
    [28.6260, 77.3685],
    [28.6315, 77.3685]
];

const CAMPUS_GATE_ROUTE = [
    [28.6315, 77.3715],
    [28.6300, 77.3715],
    [28.6295, 77.3715]
];

document.addEventListener("DOMContentLoaded", () => {
    initVantaFog();
    init3DPerspectiveGSAPScroll();
    initSidebarNav();
    initClock();
    initChart();
    loadPipelineData();
    setupEventListeners();
    setup3DTiltCards();
    checkHashNavigation();

    // Auto-refresh live data pipeline every 30 seconds for dynamic spatial updates
    setInterval(loadPipelineData, 30000);
});

/**
 * Returns cardinal compass direction string from degrees
 */
function getWindCardinal(deg) {
    if (deg === undefined || deg === null) return "NE (Northeast)";
    const directions = ["N (North)", "NE (Northeast)", "E (East)", "SE (Southeast)", "S (South)", "SW (Southwest)", "W (West)", "NW (Northwest)"];
    const idx = Math.round(deg / 45) % 8;
    return directions[idx];
}

/**
 * Returns dynamic severity color based on threat percentage
 */
function getSeverityColor(pct) {
    if (pct >= 70) return "#f43f5e"; // Crimson Rose (High Severe Risk)
    if (pct >= 35) return "#f59e0b"; // Amber Orange (Moderate Warning)
    return "#10b981";                // Emerald Green (Low / Safe)
}

/* ==========================================================================
   01. Distinct 3D Vanta Atmospheric Background Engine
   ========================================================================== */
function initVantaFog() {
    const container = document.getElementById("three-canvas-container");
    if (!container || typeof VANTA === "undefined" || !VANTA.FOG) return;

    // Detect if we are on the Console Page vs Landing Page
    const isConsolePage = document.body.classList.contains("console-body");

    if (isConsolePage) {
        // DISTINCT COMMAND-CENTER THEME FOR APP CONSOLE (Tactical Emerald & Deep Space Blue)
        vantaEffect = VANTA.FOG({
            el: "#three-canvas-container",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            highlightColor: 0x10b981, // Emerald Radar Accent
            midtoneColor: 0x0284c7,    // Deep Cyber Cyan
            lowlightColor: 0x082f49,   // Deep Space Navy
            baseColor: 0x040711,       // Deep Tactical Dark
            blurFactor: 0.65,
            speed: 1.20,
            zoom: 1.25
        });
    } else {
        // LANDING PAGE THEME (Atmospheric Cyan & Deep Slate Blue)
        vantaEffect = VANTA.FOG({
            el: "#three-canvas-container",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            highlightColor: 0x38bdf8,
            midtoneColor: 0x0284c7,
            lowlightColor: 0x0f172a,
            baseColor: 0x07090e,
            blurFactor: 0.50,
            speed: 1.80,
            zoom: 1.15
        });
    }
}

/* ==========================================================================
   02. 3D Perspective Scroll Engine
   ========================================================================== */
function init3DPerspectiveGSAPScroll() {
    let targetSpeed = 1.80;
    let targetZoom = 1.15;
    let currentSpeed = 1.80;
    let currentZoom = 1.15;
    let scrollTimeout = null;

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);

        gsap.utils.toArray('.reveal-3d').forEach(el => {
            gsap.fromTo(el, 
                {
                    opacity: 0,
                    y: 90,
                    rotateX: 15,
                    scale: 0.94,
                    transformPerspective: 1200
                },
                {
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    scale: 1,
                    duration: 1.2,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: el,
                        start: "top 88%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        });
    }

    function handleScroll() {
        const currentY = window.scrollY || (document.querySelector('.console-viewport') ? document.querySelector('.console-viewport').scrollTop : 0);
        const delta = Math.abs(currentY - lastScrollY);
        lastScrollY = currentY;

        const scrollVelocity = Math.min(delta * 0.18, 4.0);
        targetSpeed = 1.80 + scrollVelocity;

        const docHeight = document.documentElement.scrollHeight - window.innerHeight || 1000;
        const scrollPct = Math.min(1, currentY / docHeight);
        targetZoom = 1.15 + (scrollPct * 0.50);

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            targetSpeed = 1.80;
        }, 150);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    const viewport = document.querySelector('.console-viewport');
    if (viewport) {
        viewport.addEventListener('scroll', handleScroll, { passive: true });
    }

    function updateSmokeFrame() {
        if (vantaEffect && vantaEffect.options) {
            currentSpeed += (targetSpeed - currentSpeed) * 0.1;
            currentZoom += (targetZoom - currentZoom) * 0.08;

            vantaEffect.options.speed = currentSpeed;
            vantaEffect.options.zoom = currentZoom;
        }
        requestAnimationFrame(updateSmokeFrame);
    }
    updateSmokeFrame();
}

/* ==========================================================================
   03. Leaflet 3D Spatial Radar Map Module
   ========================================================================== */
function openSpatialMapModal(targetKey = 'nh24') {
    const modal = document.getElementById('spatial-map-modal');
    if (!modal) return;

    modal.classList.add('active');
    activeCorridorTarget = targetKey;

    setTimeout(() => {
        if (!leafletMap) {
            initLeafletMap();
        } else {
            leafletMap.invalidateSize();
        }
        switchMapCorridor(targetKey);
    }, 150);
}

function closeSpatialMapModal() {
    const modal = document.getElementById('spatial-map-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function initLeafletMap() {
    const container = document.getElementById('map-container');
    if (!container || typeof L === 'undefined') return;

    leafletMap = L.map('map-container', {
        center: [JIIT_LAT, JIIT_LNG],
        zoom: 16,
        zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(leafletMap);

    const campusPolygon = L.polygon(JIIT_CAMPUS_BOUNDS, {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.25,
        weight: 2.5
    }).addTo(leafletMap);

    campusPolygon.bindPopup(`
        <div class="map-popup-title"><i class="fa-solid fa-graduation-cap"></i> JIIT Noida Sector 62</div>
        <div class="map-popup-text">Target Campus Footprint directly under Jaypee Road. Coordinates: 28.6295° N, 77.3715° E</div>
    `);

    const campusMarker = L.circleMarker([JIIT_LAT, JIIT_LNG], {
        radius: 9,
        fillColor: '#38bdf8',
        color: '#ffffff',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.95
    }).addTo(leafletMap);

    campusMarker.bindPopup(`
        <div class="map-popup-title"><i class="fa-solid fa-leaf"></i> AeroCampus-AI Core Monitor</div>
        <div class="map-popup-text">Outdoor PM2.5: ${Math.round(currentPM25)} μg/m³</div>
    `);
}

function createSleekWindArrowIcon(deg, color = '#38bdf8') {
    return L.divIcon({
        className: 'sleek-wind-arrow-marker',
        html: `
            <div class="sleek-arrow-circle" style="border-color:${color}; box-shadow: 0 0 16px ${color};">
                <div class="arrow-inner-icon" style="transform: rotate(${deg}deg); color:${color};">
                    <i class="fa-solid fa-arrow-up"></i>
                </div>
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });
}

function switchMapCorridor(corridorKey) {
    if (!SPATIAL_TARGETS[corridorKey]) return;

    activeCorridorTarget = corridorKey;
    const target = SPATIAL_TARGETS[corridorKey];

    document.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeTab = document.getElementById(`tab-modal-${corridorKey}`);
    if (activeTab) activeTab.classList.add('active');

    const nameEl = document.getElementById('modal-corridor-name');
    if (nameEl) nameEl.innerHTML = `<i class="fa-solid fa-compass" style="color:${target.color}"></i> ${target.name}`;

    const descEl = document.getElementById('modal-corridor-desc');
    if (descEl) descEl.textContent = target.desc;

    const bearingEl = document.getElementById('modal-bearing-val');
    if (bearingEl) bearingEl.textContent = target.bearing;

    const distEl = document.getElementById('modal-distance-val');
    if (distEl) distEl.textContent = target.distance;

    const alignValEl = document.getElementById('modal-alignment-val');
    if (alignValEl) {
        let alignPct = 0;
        if (corridorKey === 'nh24') alignPct = Math.round(currentNH24Alignment * 100);
        else if (corridorKey === 'industrial') alignPct = Math.round(currentIndAlignment * 100);
        else if (corridorKey === 'inversion') alignPct = Math.round(currentStagnation * 100);
        
        alignValEl.textContent = `${alignPct}%`;
        alignValEl.style.color = getSeverityColor(alignPct);
    }

    const arrowBadgeVal = document.getElementById('modal-wind-arrow-val');
    const arrowIconEl = document.getElementById('modal-wind-arrow-icon');
    if (arrowBadgeVal) {
        arrowBadgeVal.textContent = `${currentWindDirection}° (${getWindCardinal(currentWindDirection)})`;
    }
    if (arrowIconEl) {
        arrowIconEl.style.transform = `rotate(${currentWindDirection}deg)`;
        arrowIconEl.style.color = target.color;
    }

    if (leafletMap) {
        activeMapLayers.forEach(layer => leafletMap.removeLayer(layer));
        activeMapLayers = [];

        if (corridorKey === 'nh24') {
            const nh24Line = L.polyline([
                [28.6335, 77.3680],
                [28.6335, 77.3750]
            ], {
                color: '#38bdf8',
                weight: 5,
                dashArray: '8, 8',
                opacity: 0.9
            }).addTo(leafletMap);

            const rayLine = L.polyline([
                [target.lat, target.lng],
                [JIIT_LAT, JIIT_LNG]
            ], {
                color: '#38bdf8',
                weight: 3,
                opacity: 0.8
            }).addTo(leafletMap);

            const arrowMid = L.marker([28.6315, 77.3728], {
                icon: createSleekWindArrowIcon(currentWindDirection, '#38bdf8')
            }).addTo(leafletMap);

            const targetMarker = L.marker([target.lat, target.lng]).addTo(leafletMap);
            targetMarker.bindPopup(`
                <div class="map-popup-title"><i class="fa-solid fa-road"></i> NH-24 Highway Corridor</div>
                <div class="map-popup-text">
                    <strong>Wind Direction:</strong> ${currentWindDirection}° (${getWindCardinal(currentWindDirection)})<br>
                    High vehicular road dust and diesel exhaust vector above Jaypee Road.
                </div>
            `).openPopup();

            activeMapLayers.push(nh24Line, rayLine, arrowMid, targetMarker);
            leafletMap.flyTo([28.6305, 77.3725], 16);

        } else if (corridorKey === 'industrial') {
            const indCircle = L.circle([target.lat, target.lng], {
                radius: 200,
                color: '#a855f7',
                fillColor: '#a855f7',
                fillOpacity: 0.3,
                weight: 2
            }).addTo(leafletMap);

            const rayLine = L.polyline([
                [target.lat, target.lng],
                [JIIT_LAT, JIIT_LNG]
            ], {
                color: '#a855f7',
                weight: 4,
                opacity: 0.9
            }).addTo(leafletMap);

            const arrowMid = L.marker([28.6262, 77.3748], {
                icon: createSleekWindArrowIcon(currentWindDirection, '#a855f7')
            }).addTo(leafletMap);

            const targetMarker = L.marker([target.lat, target.lng]).addTo(leafletMap);
            targetMarker.bindPopup(`
                <div class="map-popup-title"><i class="fa-solid fa-industry"></i> Sector 63 Industrial Zone</div>
                <div class="map-popup-text">
                    <strong>Wind Direction:</strong> ${currentWindDirection}° (${getWindCardinal(currentWindDirection)})<br>
                    Industrial fabricator fumes across Vishwakarma Road.
                </div>
            `).openPopup();

            activeMapLayers.push(indCircle, rayLine, arrowMid, targetMarker);
            leafletMap.flyTo([28.6265, 77.3745], 16);

        } else if (corridorKey === 'inversion') {
            const inversionCircle = L.circle([JIIT_LAT, JIIT_LNG], {
                radius: 250,
                color: '#f59e0b',
                fillColor: '#f59e0b',
                fillOpacity: 0.25,
                weight: 3,
                dashArray: '6, 6'
            }).addTo(leafletMap);

            const arrowMid = L.marker([JIIT_LAT + 0.0008, JIIT_LNG + 0.0008], {
                icon: createSleekWindArrowIcon(currentWindDirection, '#f59e0b')
            }).addTo(leafletMap);

            const centerMarker = L.marker([JIIT_LAT, JIIT_LNG]).addTo(leafletMap);
            centerMarker.bindPopup(`
                <div class="map-popup-title"><i class="fa-solid fa-layer-group"></i> Boundary Inversion Layer</div>
                <div class="map-popup-text">
                    <strong>Wind Direction:</strong> ${currentWindDirection}° (${getWindCardinal(currentWindDirection)})<br>
                    Stagnant atmospheric smog layer trapped under 150m altitude over JIIT buildings.
                </div>
            `).openPopup();

            activeMapLayers.push(inversionCircle, arrowMid, centerMarker);
            leafletMap.flyTo([JIIT_LAT, JIIT_LNG], 16);
        }
    }
}

/* ==========================================================================
   03B. Live Animated GRAP Traffic Movement Simulation Engine
   ========================================================================== */
function openGrapTrafficMapModal() {
    const modal = document.getElementById('grap-traffic-modal');
    if (!modal) return;

    modal.classList.add('active');

    setTimeout(() => {
        if (!grapLeafletMap) {
            initGrapTrafficMap();
        } else {
            grapLeafletMap.invalidateSize();
        }
        updateGrapTrafficMovement();
    }, 150);
}

function closeGrapTrafficMapModal() {
    const modal = document.getElementById('grap-traffic-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    if (grapTrafficAnimFrame) {
        cancelAnimationFrame(grapTrafficAnimFrame);
        grapTrafficAnimFrame = null;
    }
}

function initGrapTrafficMap() {
    const container = document.getElementById('grap-map-container');
    if (!container || typeof L === 'undefined') return;

    grapLeafletMap = L.map('grap-map-container', {
        center: [JIIT_LAT, JIIT_LNG],
        zoom: 16,
        zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(grapLeafletMap);

    const campusPoly = L.polygon(JIIT_CAMPUS_BOUNDS, {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.22,
        weight: 2.5
    }).addTo(grapLeafletMap);

    campusPoly.bindPopup(`
        <div class="map-popup-title"><i class="fa-solid fa-graduation-cap"></i> JIIT Campus Perimeter</div>
        <div class="map-popup-text">Zero-Emission Protected Campus Zone directly under Jaypee Road.</div>
    `);

    grapHighwayLine = L.polyline(JAYPEE_ROAD_ROUTE, {
        color: '#f43f5e',
        weight: 6,
        opacity: 0.85
    }).addTo(grapLeafletMap);

    grapPerimeterLine = L.polyline(VISHWAKARMA_RING_ROUTE, {
        color: '#38bdf8',
        weight: 4,
        dashArray: '6, 6',
        opacity: 0.8
    }).addTo(grapLeafletMap);

    grapGateLine = L.polyline(CAMPUS_GATE_ROUTE, {
        color: '#a855f7',
        weight: 4,
        opacity: 0.9
    }).addTo(grapLeafletMap);
}

function createVehicleIcon(isTruck = false, color = '#f43f5e') {
    const iconClass = isTruck ? 'fa-truck' : 'fa-car-side';
    return L.divIcon({
        className: 'custom-traffic-vehicle-marker',
        html: `
            <div class="vehicle-marker-box" style="border-color:${color}; box-shadow:0 0 12px ${color};">
                <i class="fa-solid ${iconClass}" style="color:${color};"></i>
            </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });
}

function updateGrapTrafficMovement() {
    if (!grapLeafletMap) return;

    const trafficSlider = document.getElementById('traffic-slider');
    const grapToggle = document.getElementById('grap-toggle');
    const redPct = trafficSlider ? parseInt(trafficSlider.value) : 0;
    const isGrapOn = grapToggle ? grapToggle.checked : false;

    const effectiveReduction = isGrapOn ? Math.max(redPct, 20) : redPct;

    if (grapHighwayLine) {
        if (effectiveReduction >= 50) {
            grapHighwayLine.setStyle({ color: '#10b981', weight: 4 });
        } else if (effectiveReduction >= 25) {
            grapHighwayLine.setStyle({ color: '#f59e0b', weight: 5 });
        } else {
            grapHighwayLine.setStyle({ color: '#f43f5e', weight: 7 });
        }
    }

    if (grapPerimeterLine) {
        if (effectiveReduction >= 35) {
            grapPerimeterLine.setStyle({ color: '#10b981' });
        } else {
            grapPerimeterLine.setStyle({ color: '#38bdf8' });
        }
    }

    const targetVehiclesCount = Math.max(3, Math.round(22 * (1.0 - (effectiveReduction / 100))));
    const countEl = document.getElementById('grap-map-vehicle-count');
    if (countEl) countEl.textContent = `${targetVehiclesCount} Active Vehicles / min`;

    const statusEl = document.getElementById('grap-map-flow-status');
    if (statusEl) {
        if (effectiveReduction >= 50) {
            statusEl.textContent = "RESTRICTED (LIGHT FLOW)";
            statusEl.style.color = "#10b981";
        } else if (effectiveReduction >= 20) {
            statusEl.textContent = "GRAP CONTROLLED (MODERATE)";
            statusEl.style.color = "#f59e0b";
        } else {
            statusEl.textContent = "UNRESTRICTED (HEAVY DIESEL TRAFFIC)";
            statusEl.style.color = "#f43f5e";
        }
    }

    grapVehicles.forEach(v => grapLeafletMap.removeLayer(v.marker));
    grapVehicles = [];

    for (let i = 0; i < targetVehiclesCount; i++) {
        const isTruck = i % 3 === 0;
        const color = isTruck ? '#f43f5e' : (effectiveReduction >= 35 ? '#38bdf8' : '#f59e0b');
        
        let route = JAYPEE_ROAD_ROUTE;
        if (i % 3 === 0) route = VISHWAKARMA_RING_ROUTE;
        else if (i % 4 === 0) route = CAMPUS_GATE_ROUTE;

        const progress = (i / targetVehiclesCount);

        const pos = interpolateRoutePoint(route, progress);
        const marker = L.marker(pos, {
            icon: createVehicleIcon(isTruck, color)
        }).addTo(grapLeafletMap);

        grapVehicles.push({
            marker: marker,
            route: route,
            progress: progress,
            speed: (0.0025 + (Math.random() * 0.0015)) * (1.0 - (effectiveReduction / 160))
        });
    }

    if (grapTrafficAnimFrame) cancelAnimationFrame(grapTrafficAnimFrame);

    function animateFrame() {
        if (!grapLeafletMap) return;
        grapVehicles.forEach(v => {
            v.progress = (v.progress + v.speed) % 1.0;
            const newPos = interpolateRoutePoint(v.route, v.progress);
            v.marker.setLatLng(newPos);
        });
        grapTrafficAnimFrame = requestAnimationFrame(animateFrame);
    }
    animateFrame();
}

function interpolateRoutePoint(route, progress) {
    if (!route || route.length === 0) return [JIIT_LAT, JIIT_LNG];
    const totalSegs = route.length - 1;
    const scaledProg = progress * totalSegs;
    const idx = Math.floor(scaledProg);
    const segProg = scaledProg - idx;

    if (idx >= totalSegs) return route[totalSegs];

    const p1 = route[idx];
    const p2 = route[idx + 1];

    const lat = p1[0] + (p2[0] - p1[0]) * segProg;
    const lng = p1[1] + (p2[1] - p1[1]) * segProg;

    return [lat, lng];
}

/* ==========================================================================
   03C. Green Shield Google Earth Satellite Map (HOLLOW PERIMETER TREE BELT BAND)
   ========================================================================== */
function openGreenShieldSatelliteModal() {
    const modal = document.getElementById('greenshield-satellite-modal');
    if (!modal) return;

    modal.classList.add('active');

    setTimeout(() => {
        if (!greenShieldSatMap) {
            initGreenShieldSatelliteMap();
        } else {
            greenShieldSatMap.invalidateSize();
        }
        updateGreenShieldCanopyBuffer();
    }, 150);
}

function closeGreenShieldSatelliteModal() {
    const modal = document.getElementById('greenshield-satellite-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function initGreenShieldSatelliteMap() {
    const container = document.getElementById('greenshield-sat-map-container');
    if (!container || typeof L === 'undefined') return;

    greenShieldSatMap = L.map('greenshield-sat-map-container', {
        center: [JIIT_LAT, JIIT_LNG],
        zoom: 17,
        zoomControl: true
    });

    // High-Resolution Google Earth Style Satellite Tiles (Esri World Imagery)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
    }).addTo(greenShieldSatMap);

    // Inner Campus Building Footprint Boundary Line
    L.polygon(JIIT_CAMPUS_BOUNDS, {
        color: '#ffffff',
        weight: 1.5,
        dashArray: '4, 4',
        fillOpacity: 0.02
    }).addTo(greenShieldSatMap);

    // Baseline Full 4-Side Perimeter Fence Line
    greenShieldFenceLine = L.polyline(PERIMETER_4WAY_FENCE, {
        color: '#f59e0b',
        weight: 3,
        opacity: 0.95
    }).addTo(greenShieldSatMap);

    greenShieldFenceLine.bindPopup(`
        <div class="map-popup-title"><i class="fa-solid fa-tree icon-emerald"></i> 360° All 4-Side Campus Boundary</div>
        <div class="map-popup-text">Full perimeter enclosure (North, East, South, West) facing Jaypee Road & Vishwakarma Road.</div>
    `);

    // Plant Tree Markers along ALL 4 SIDES of campus boundary
    const treePositions = [
        [28.6310, 77.3695], [28.6310, 77.3715], [28.6310, 77.3735],
        [28.6295, 77.3735], [28.6275, 77.3735],
        [28.6260, 77.3720], [28.6260, 77.3700],
        [28.6280, 77.3685]
    ];

    treePositions.forEach((pos) => {
        const treeIcon = L.divIcon({
            className: 'tree-satellite-marker',
            html: `<div class="tree-icon-box"><i class="fa-solid fa-tree" style="color:#10b981;"></i></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });
        const m = L.marker(pos, { icon: treeIcon }).addTo(greenShieldSatMap);
        greenShieldTreeMarkers.push(m);
    });
}

function updateGreenShieldCanopyBuffer() {
    if (!greenShieldSatMap) return;

    const widthSlider = document.getElementById('width-slider');
    const speciesSelect = document.getElementById('species-select');
    const barrierWidth = widthSlider ? parseFloat(widthSlider.value) : 20;
    const speciesKey = speciesSelect ? speciesSelect.value : 'mixed_native_ncr';

    const kVal = SPECIES_K[speciesKey] || 0.075;
    const effPct = Math.round((1.0 - Math.exp(-kVal * barrierWidth)) * 1000) / 10;
    const canopyArea = Math.round(barrierWidth * 200);

    const widthEl = document.getElementById('sat-map-width-val');
    if (widthEl) widthEl.textContent = `${barrierWidth} Meters Tree Belt Depth`;

    const areaEl = document.getElementById('sat-map-area-val');
    if (areaEl) areaEl.innerHTML = `${canopyArea.toLocaleString()} m&sup2; Perimeter Shield`;

    const effEl = document.getElementById('sat-map-eff-val');
    if (effEl) effEl.textContent = `${effPct}% PM2.5 Interception`;

    if (greenShieldBufferPoly) {
        greenShieldSatMap.removeLayer(greenShieldBufferPoly);
    }

    const halfWidthOffset = (barrierWidth * 0.0000095);

    const outerRing = [
        [28.6310 + halfWidthOffset, 77.3685 - halfWidthOffset],
        [28.6310 + halfWidthOffset, 77.3735 + halfWidthOffset],
        [28.6260 - halfWidthOffset, 77.3735 + halfWidthOffset],
        [28.6260 - halfWidthOffset, 77.3685 - halfWidthOffset]
    ];

    const innerRing = [
        [28.6310 - halfWidthOffset, 77.3685 + halfWidthOffset],
        [28.6310 - halfWidthOffset, 77.3735 - halfWidthOffset],
        [28.6260 + halfWidthOffset, 77.3735 - halfWidthOffset],
        [28.6260 + halfWidthOffset, 77.3685 + halfWidthOffset]
    ];

    greenShieldBufferPoly = L.polygon([outerRing, innerRing], {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.65,
        weight: 2.5
    }).addTo(greenShieldSatMap);

    greenShieldBufferPoly.bindPopup(`
        <div class="map-popup-title"><i class="fa-solid fa-tree icon-emerald"></i> 360° Vegetative Tree Belt</div>
        <div class="map-popup-text">
            <strong>Tree Belt Depth Width:</strong> ${barrierWidth}m<br>
            <strong>Total Canopy Shield Area:</strong> ${canopyArea.toLocaleString()} m²<br>
            <strong>Filtration Efficiency:</strong> ${effPct}%
        </div>
    `).openPopup();
}

/* ==========================================================================
   04. Interactive Sidebar Navigation & Feature Panel Switcher
   ========================================================================== */
function initSidebarNav() {
    const navItems = document.querySelectorAll(".nav-item");
    const featurePanels = document.querySelectorAll(".feature-panel");
    const featureTitleEl = document.getElementById("current-feature-title");

    navItems.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            if (!targetId) return;

            navItems.forEach(n => n.classList.remove("active"));
            btn.classList.add("active");

            featurePanels.forEach(panel => {
                if (panel.id === targetId) {
                    panel.classList.add("active");
                } else {
                    panel.classList.remove("active");
                }
            });

            if (featureTitleEl && FEATURE_TITLES[targetId]) {
                featureTitleEl.textContent = FEATURE_TITLES[targetId];
            }

            if (vantaEffect && vantaEffect.options) {
                vantaEffect.options.speed = 4.5;
                setTimeout(() => { vantaEffect.options.speed = 1.8; }, 400);
            }

            if (targetId === "feature-forecaster" && forecastChart) {
                setTimeout(() => forecastChart.resize(), 100);
            }
        });
    });
}

function checkHashNavigation() {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
        const targetBtn = document.querySelector(`.nav-item[data-target="${hash}"]`) ||
                          document.querySelector(`.nav-item[data-target="feature-${hash}"]`);
        if (targetBtn) {
            targetBtn.click();
        }
    }
}

/* ==========================================================================
   05. Feature 05: Emergency Safety SOP & Live Automation Dispatcher Engine
   ========================================================================== */
function fireSopTrigger(ruleId) {
    const timeStr = new Date().toLocaleTimeString();
    const logConsole = document.getElementById("sop-live-log-stream");
    
    let title = "";
    let targets = "";
    let details = "";
    let color = "#38bdf8";

    if (ruleId === 'sports') {
        title = "RULE 01: Outdoor Exertion Safety & Sports Evacuation Dispatched";
        targets = "Physical Education Department & Student Mobile App Gateway";
        details = `Outdoor PM2.5 = ${Math.round(currentPM25)} μg/m³ (> 150 μg/m³ threshold). Sports grounds cleared; student events transitioned to indoor gymnasium.`;
        color = "#f43f5e";
    } else if (ruleId === 'hvac') {
        title = "RULE 02: HVAC Classroom Air Intake Damper Recirculation Lock";
        targets = "Building Automation System (BAS) & BACnet HVAC Controller";
        details = `Fresh air intake dampers locked to 100% Internal Recirculation Mode across Academic Block & Library. Prevents particulate ingress.`;
        color = "#38bdf8";
    } else if (ruleId === 'gate') {
        title = "RULE 03: Gate Vehicular Zero-Emission Lockdown";
        targets = "Campus Gate 1 & Gate 2 RFID Barrier Systems & Security Guards";
        details = `Non-essential diesel delivery trucks restricted. Priority access granted strictly to EV & CNG shuttles.`;
        color = "#10b981";
    }

    if (logConsole) {
        const newLog = document.createElement("div");
        newLog.className = "sop-log-item";
        newLog.style.borderLeftColor = color;
        newLog.innerHTML = `
            <span class="log-timestamp">[${timeStr}]</span>
            <strong style="color:${color};">${title}</strong>
            <p>${details} <em>(Dispatched to: ${targets})</em></p>
        `;
        logConsole.prepend(newLog);
    }

    // Flash Toast Notification
    const toast = document.createElement("div");
    toast.className = "sop-toast-notification glass-card";
    toast.style.borderColor = color;
    toast.innerHTML = `
        <div class="toast-icon" style="color:${color};"><i class="fa-solid fa-bell-circle-check"></i></div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${details}</p>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
}

function updateSopThreshold(val) {
    const threshEl = document.getElementById("sop-thresh-val");
    if (threshEl) threshEl.textContent = `${val} μg/m³`;

    const statusEl = document.getElementById("sop-thresh-status");
    if (statusEl) {
        if (currentPM25 > val) {
            statusEl.textContent = "AUTOMATED PROTOCOL ACTIVE (TRIGGERED)";
            statusEl.style.color = "#f43f5e";
        } else {
            statusEl.textContent = "STANDBY (NORMAL AIR QUALITY)";
            statusEl.style.color = "#10b981";
        }
    }
}

/* ==========================================================================
   06. 3D Tilt Cards (Mouse Parallax)
   ========================================================================== */
function setup3DTiltCards() {
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            card.style.transform = `perspective(1000px) rotateX(${-y * 0.025}deg) rotateY(${x * 0.025}deg) translateZ(12px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        });
    });
}

/* ==========================================================================
   07. Clock Display
   ========================================================================== */
function initClock() {
    const timeEl = document.getElementById("current-time-display");
    if (!timeEl) return;
    function update() {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString() + " IST";
    }
    update();
    setInterval(update, 1000);
}

/* ==========================================================================
   08. Chart.js ML Forecast Curve
   ========================================================================== */
function initChart() {
    const canvas = document.getElementById("forecastChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    gradient.addColorStop(1, 'rgba(2, 132, 199, 0.0)');

    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Current Baseline', '+1 Hr Forecast', '+2 Hr Forecast', '+3 Hr Forecast', '+4 Hr Forecast Target'],
            datasets: [{
                label: 'Campus PM2.5 Forecast (μg/m³)',
                data: [165.4, 158.2, 142.1, 135.0, 128.4],
                borderColor: '#38bdf8',
                borderWidth: 3,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#38bdf8',
                pointRadius: 6,
                pointHoverRadius: 9
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'Space Grotesk' } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'Space Grotesk' } }
                }
            }
        }
    });
}

/* ==========================================================================
   09. Dynamic Real-Time Data & Pipeline Ingestion
   ========================================================================== */
async function loadPipelineData() {
    try {
        const response = await fetch('../data/processed/live_features.json?t=' + Date.now());
        if (!response.ok) throw new Error("Could not fetch live features.");
        const json = await response.json();
        
        if (json.data && json.data.length > 0) {
            currentRawData = json.data;
            updateDashboardWithData(json.data[0]);
            updateForecastChart(json.data);
            const dataEl = document.getElementById("live-data-source");
            if (dataEl) dataEl.textContent = `LIVE PIPELINE (${json.data_source})`;
        }
    } catch (e) {
        console.warn("Live JSON stream offline. Utilizing calibrated baseline features.", e);
        updateDashboardWithData({
            pm25: 165.4,
            temperature: 15.2,
            relative_humidity: 88,
            wind_speed: 1.1,
            wind_direction: 130,
            wind_alignment_nh24: 0.85,
            wind_alignment_industrial: 0.35,
            stagnation_index: 0.82
        });
    }
}

function updateDashboardWithData(rec) {
    currentPM25 = rec.pm25 || 165.4;
    currentWindDirection = rec.wind_direction !== undefined ? rec.wind_direction : 130;
    currentNH24Alignment = rec.wind_alignment_nh24 !== undefined ? rec.wind_alignment_nh24 : 0.85;
    currentIndAlignment = rec.wind_alignment_industrial !== undefined ? rec.wind_alignment_industrial : 0.35;
    currentStagnation = rec.stagnation_index !== undefined ? rec.stagnation_index : 0.82;

    const livePm25El = document.getElementById("live-pm25-val");
    if (livePm25El) livePm25El.textContent = Math.round(currentPM25);
    const statusText = document.getElementById("pm25-status-text");

    if (statusText) {
        if (currentPM25 > 150) {
            statusText.textContent = "HAZARDOUS SMOG";
            statusText.style.color = "#f43f5e";
        } else if (currentPM25 > 90) {
            statusText.textContent = "POOR AIR QUALITY";
            statusText.style.color = "#f59e0b";
        } else {
            statusText.textContent = "MODERATE / SAFE";
            statusText.style.color = "#10b981";
        }
    }

    const tempEl = document.getElementById("val-temp");
    if (tempEl) tempEl.textContent = `${rec.temperature || 15.2} °C`;
    const humEl = document.getElementById("val-humidity");
    if (humEl) humEl.textContent = `${rec.relative_humidity || 88} %`;
    const windEl = document.getElementById("val-windspeed");
    if (windEl) windEl.textContent = `${rec.wind_speed || 1.1} m/s`;

    const cardinalText = getWindCardinal(currentWindDirection);
    const dirEl = document.getElementById("val-winddir");
    if (dirEl) dirEl.textContent = `${currentWindDirection}° (${cardinalText})`;

    const compassIcon = document.getElementById("wind-compass-icon");
    if (compassIcon) {
        compassIcon.style.transform = `rotate(${currentWindDirection}deg)`;
    }

    const nh24Pct = Math.round(currentNH24Alignment * 100);
    const indPct = Math.round(currentIndAlignment * 100);
    const stagPct = Math.round(currentStagnation * 100);

    const nh24Color = getSeverityColor(nh24Pct);
    const indColor = getSeverityColor(indPct);
    const stagColor = getSeverityColor(stagPct);

    const nh24Val = document.getElementById("val-nh24-pct");
    if (nh24Val) {
        nh24Val.textContent = `${nh24Pct}%`;
        nh24Val.style.color = nh24Color;
    }
    const barNh24 = document.getElementById("bar-nh24");
    if (barNh24) {
        barNh24.style.width = `${nh24Pct}%`;
        barNh24.style.background = nh24Color;
    }

    const indVal = document.getElementById("val-ind-pct");
    if (indVal) {
        indVal.textContent = `${indPct}%`;
        indVal.style.color = indColor;
    }
    const barInd = document.getElementById("bar-ind");
    if (barInd) {
        barInd.style.width = `${indPct}%`;
        barInd.style.background = indColor;
    }

    const stagVal = document.getElementById("val-stag-pct");
    if (stagVal) {
        stagVal.textContent = `${stagPct}%`;
        stagVal.style.color = stagColor;
    }
    const barStag = document.getElementById("bar-stag");
    if (barStag) {
        barStag.style.width = `${stagPct}%`;
        barStag.style.background = stagColor;
    }

    const invTag = document.getElementById("inversion-status-tag");
    if (invTag) {
        if (stagPct > 70 && nh24Pct > 60) {
            invTag.textContent = "HIGH INVERSION RISK";
            invTag.style.color = "#f43f5e";
        } else if (indPct > 70) {
            invTag.textContent = "Industrial Corridor Plume";
            invTag.style.color = "#a855f7";
        } else {
            invTag.textContent = "Normal Dispersion";
            invTag.style.color = "#38bdf8";
        }
    }

    recalculateSimulations();
}

function updateForecastChart(records) {
    if (!forecastChart || !records || records.length < 5) return;
    const pm25List = records.slice(0, 5).map(r => r.pm25);
    forecastChart.data.datasets[0].data = pm25List;
    forecastChart.update();
}

/* ==========================================================================
   10. Interactive Sliders & Simulators
   ========================================================================== */
function setupEventListeners() {
    const grapToggle = document.getElementById("grap-toggle");
    const trafficSlider = document.getElementById("traffic-slider");
    const widthSlider = document.getElementById("width-slider");
    const speciesSelect = document.getElementById("species-select");
    const sopThreshSlider = document.getElementById("sop-thresh-slider");

    if (grapToggle && trafficSlider) {
        grapToggle.addEventListener("change", (e) => {
            const statusEl = document.getElementById("grap-toggle-status");
            if (statusEl) {
                statusEl.textContent = e.target.checked ? "ACTIVE" : "OFF";
                statusEl.style.color = e.target.checked ? "#10b981" : "#94a3b8";
            }
            if (e.target.checked && parseInt(trafficSlider.value) === 0) {
                trafficSlider.value = 35;
            }
            recalculateSimulations();
            updateGrapTrafficMovement();
        });

        trafficSlider.addEventListener("input", (e) => {
            const pctVal = document.getElementById("traffic-pct-val");
            if (pctVal) pctVal.textContent = `${e.target.value}%`;
            if (parseInt(e.target.value) > 0) {
                grapToggle.checked = true;
                const statusEl = document.getElementById("grap-toggle-status");
                if (statusEl) {
                    statusEl.textContent = "ACTIVE";
                    statusEl.style.color = "#10b981";
                }
            }
            recalculateSimulations();
            updateGrapTrafficMovement();
        });
    }

    if (widthSlider) {
        widthSlider.addEventListener("input", (e) => {
            const widthVal = document.getElementById("width-val");
            if (widthVal) widthVal.textContent = `${e.target.value}m`;
            recalculateSimulations();
            updateGreenShieldCanopyBuffer();
        });
    }

    if (speciesSelect) {
        speciesSelect.addEventListener("change", () => {
            recalculateSimulations();
            updateGreenShieldCanopyBuffer();
        });
    }

    if (sopThreshSlider) {
        sopThreshSlider.addEventListener("input", (e) => {
            updateSopThreshold(e.target.value);
        });
    }
}

function recalculateSimulations() {
    const trafficSlider = document.getElementById("traffic-slider");
    const widthSlider = document.getElementById("width-slider");
    const speciesSelect = document.getElementById("species-select");

    if (!trafficSlider || !widthSlider || !speciesSelect) return;

    const trafficPct = parseInt(trafficSlider.value);
    const barrierWidth = parseFloat(widthSlider.value);
    const speciesKey = speciesSelect.value;

    const policyDelta = Math.round((currentPM25 * (trafficPct / 100) * 0.45) * 10) / 10;
    const policyDeltaEl = document.getElementById("policy-delta-val");
    if (policyDeltaEl) policyDeltaEl.textContent = `-${policyDelta} μg/m³`;

    const kVal = SPECIES_K[speciesKey] || 0.075;
    const rawEfficiency = 1.0 - Math.exp(-kVal * barrierWidth);
    const effectiveEfficiency = rawEfficiency * Math.max(0.2, currentNH24Alignment);
    const effPct = Math.round(effectiveEfficiency * 1000) / 10;

    const filteredPM25 = Math.max(5.0, Math.round((currentPM25 - policyDelta) * (1.0 - effectiveEfficiency) * 10) / 10);

    const effEl = document.getElementById("canopy-eff-val");
    if (effEl) effEl.textContent = `${effPct}%`;
    const filtEl = document.getElementById("filtered-pm25-val");
    if (filtEl) filtEl.textContent = `${filteredPM25} μg/m³`;
}
