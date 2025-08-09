// ========================================
// GLOBAL VARIABLES AND CONFIGURATION
// ========================================

/* MAP INSTANCE: Global variable to store the MapLibre map object */
let map;

/* GEOJSON DATA: Variable to store the loaded IP location data */
let ipLocationData = null;

/* MAP STYLES: Configuration object containing different map style URLs */
const mapStyles = {
    streets: 'https://demotiles.maplibre.org/style.json',
    satellite: {
        "version": 8,
        "sources": {
            "esri": {
                "type": "raster",
                "tiles": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
                "tileSize": 256,
                "attribution": "© Esri"
            }
        },
        "layers": [{
            "id": "esri",
            "type": "raster",
            "source": "esri",
            "minzoom": 0,
            "maxzoom": 22
        }]
    },
    dark: {
        "version": 8,
        "sources": {
            "cartodb": {
                "type": "raster",
                "tiles": ["https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"],
                "tileSize": 256,
                "attribution": "© CartoDB"
            }
        },
        "layers": [{
            "id": "cartodb",
            "type": "raster",
            "source": "cartodb",
            "minzoom": 0,
            "maxzoom": 22
        }]
    },
    light: {
        "version": 8,
        "sources": {
            "cartodb": {
                "type": "raster",
                "tiles": ["https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"],
                "tileSize": 256,
                "attribution": "© CartoDB"
            }
        },
        "layers": [{
            "id": "cartodb",
            "type": "raster",
            "source": "cartodb",
            "minzoom": 0,
            "maxzoom": 22
        }]
    }
};

/* DEFAULT MAP CONFIG: Initial map configuration settings */
const defaultMapConfig = {
    center: [-98.5795, 39.8283], // Geographic center of USA
    zoom: 3,
    pitch: 0,
    bearing: 0
};

// ========================================
// MAP INITIALIZATION FUNCTION
// ========================================

/**
 * INITIALIZE MAP: Creates and configures the MapLibre GL JS map
 * This function sets up the basic map with controls and event listeners
 */
function initializeMap() {
    console.log('🗺️ Initializing MapLibre GL JS map...');
    
    try {
        // CHECK MAPLIBRE AVAILABILITY: Ensure MapLibre is loaded
        if (typeof maplibregl === 'undefined') {
            throw new Error('MapLibre GL JS library not loaded');
        }
        
        // CREATE MAP INSTANCE: Initialize MapLibre map with configuration
        map = new maplibregl.Map({
            container: 'map', // HTML element ID where map will be rendered
            style: mapStyles.streets, // Default map style
            center: defaultMapConfig.center, // Initial map center coordinates
            zoom: defaultMapConfig.zoom, // Initial zoom level
            pitch: defaultMapConfig.pitch, // Initial map tilt
            bearing: defaultMapConfig.bearing, // Initial map rotation
            antialias: true // Enable antialiasing for smoother rendering
        });

        console.log('Map instance created successfully');

        // ADD NAVIGATION CONTROLS: Zoom and rotation controls
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        // ADD FULLSCREEN CONTROL: Allow map to go fullscreen
        map.addControl(new maplibregl.FullscreenControl(), 'top-right');

        // ADD SCALE CONTROL: Show distance scale on map
        map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

        // MAP LOAD EVENT: Execute when map finishes loading
        map.on('load', function() {
            console.log('✅ Map loaded successfully');
            loadGeoJSONData(); // Load IP location data once map is ready
        });

        // MAP ERROR HANDLER: Handle any map loading errors
        map.on('error', function(e) {
            console.error('❌ Map error:', e.error);
            console.error('Error details:', e);
            showErrorMessage(`Map error: ${e.error?.message || 'Unknown map error'}`);
        });

        // MAP STYLE LOAD EVENT: Handle style loading
        map.on('styledata', function() {
            console.log('Map style loaded');
        });

        console.log('✅ Map initialization completed');
        
    } catch (error) {
        console.error('❌ Error initializing map:', error);
        console.error('Error details:', error.message);
        showErrorMessage(`Failed to initialize map: ${error.message}`);
    }
}

// ========================================
// GEOJSON DATA LOADING
// ========================================

/**
 * LOAD GEOJSON DATA: Fetches and loads the IP location GeoJSON file
 * This function loads the data and adds it to the map as a layer
 */
async function loadGeoJSONData() {
    console.log('📊 Loading GeoJSON data...');
    
    try {
        // UPDATE UI: Show loading status
        updateIPCount('Loading IP locations...');
        
        // FETCH GEOJSON: Load the IP locations data file
        console.log('Fetching GeoJSON from: ../ip_locations.geojson');
        const response = await fetch('../ip_locations.geojson');
        
        // CHECK RESPONSE: Verify the file was loaded successfully
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        // PARSE JSON: Convert response to JavaScript object
        const responseText = await response.text();
        console.log('Response received, length:', responseText.length);
        
        ipLocationData = JSON.parse(responseText);
        
        // VALIDATE DATA: Check if data has the expected structure
        if (!ipLocationData || !ipLocationData.features) {
            throw new Error('Invalid GeoJSON structure - missing features array');
        }
        
        if (ipLocationData.features.length === 0) {
            throw new Error('GeoJSON file contains no features');
        }
        
        console.log(`✅ Loaded ${ipLocationData.features.length} IP locations`);
        
        // UPDATE UI: Display the number of loaded locations
        updateIPCount(ipLocationData.features.length);
        
        // ADD TO MAP: Add the data as a source and layer to the map
        addGeoJSONToMap();
        
    } catch (error) {
        console.error('❌ Error loading GeoJSON data:', error);
        console.error('Error details:', error.message);
        
        if (error.message.includes('404')) {
            showErrorMessage('GeoJSON file not found. Please check the file path.');
        } else if (error.message.includes('Failed to fetch')) {
            showErrorMessage('Network error. Please ensure you are running this from a web server.');
        } else {
            showErrorMessage(`Failed to load IP location data: ${error.message}`);
        }
    }
}

// ========================================
// MAP DATA VISUALIZATION
// ========================================

/**
 * ADD GEOJSON TO MAP: Adds the loaded data to the map as a source and layer
 * This function creates the visual representation of IP locations on the map
 */
function addGeoJSONToMap() {
    console.log('🎨 Adding GeoJSON data to map...');
    
    try {
        // ADD DATA SOURCE: Register the GeoJSON data as a map source
        map.addSource('ip-locations', {
            type: 'geojson',
            data: ipLocationData,
            cluster: true, // Enable clustering for better performance
            clusterMaxZoom: 14, // Max zoom level for clustering
            clusterRadius: 50 // Cluster radius in pixels
        });

        // ADD CLUSTER LAYER: Style for clustered points
        map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'ip-locations',
            filter: ['has', 'point_count'], // Only show clustered points
            paint: {
                // CLUSTER CIRCLE COLOR: Changes based on cluster size
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#51bbd6', // Color for small clusters
                    10, '#f1f075', // Color for medium clusters
                    30, '#f28cb1' // Color for large clusters
                ],
                // CLUSTER CIRCLE SIZE: Increases with cluster size
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20, // Base size
                    10, 30, // Size for medium clusters
                    30, 40 // Size for large clusters
                ]
            }
        });

        // ADD CLUSTER COUNT LABELS: Show number of points in each cluster
        map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'ip-locations',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}', // Display cluster count
                'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                'text-size': 12
            },
            paint: {
                'text-color': '#ffffff' // White text for visibility
            }
        });

        // ADD INDIVIDUAL POINTS: Style for non-clustered points
        map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'ip-locations',
            filter: ['!', ['has', 'point_count']], // Only show non-clustered points
            paint: {
                'circle-color': '#11b4da', // Blue color for individual points
                'circle-radius': 8, // Fixed radius for individual points
                'circle-stroke-width': 2, // Border width
                'circle-stroke-color': '#fff' // White border
            }
        });

        // ADD INTERACTION EVENTS: Handle clicks and hover effects
        addMapInteractions();
        
        console.log('✅ GeoJSON data added to map successfully');
        
    } catch (error) {
        console.error('❌ Error adding GeoJSON to map:', error);
        showErrorMessage('Failed to display IP locations on map.');
    }
}

// ========================================
// MAP INTERACTIONS AND EVENTS
// ========================================

/**
 * ADD MAP INTERACTIONS: Sets up click and hover events for map features
 * This function handles user interactions with the IP location markers
 */
function addMapInteractions() {
    console.log('🖱️ Adding map interactions...');
    
    // CLUSTER CLICK EVENT: Zoom to cluster when clicked
    map.on('click', 'clusters', function(e) {
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['clusters']
        });
        
        const clusterId = features[0].properties.cluster_id;
        
        // GET CLUSTER ZOOM: Calculate appropriate zoom level for cluster
        map.getSource('ip-locations').getClusterExpansionZoom(
            clusterId,
            function(err, zoom) {
                if (err) return;
                
                // ZOOM TO CLUSTER: Animate to cluster location
                map.easeTo({
                    center: features[0].geometry.coordinates,
                    zoom: zoom
                });
            }
        );
    });
    
    // POINT CLICK EVENT: Show popup when individual point is clicked
    map.on('click', 'unclustered-point', function(e) {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const properties = e.features[0].properties;
        
        // PREVENT COORDINATE WRAPPING: Handle map projection edge cases
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }
        
        // CREATE POPUP: Display IP information in a popup
        createPopup(coordinates, properties);
    });
    
    // HOVER EFFECTS: Change cursor when hovering over interactive elements
    map.on('mouseenter', 'clusters', function() {
        map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', 'clusters', function() {
        map.getCanvas().style.cursor = '';
    });
    
    map.on('mouseenter', 'unclustered-point', function() {
        map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', 'unclustered-point', function() {
        map.getCanvas().style.cursor = '';
    });
    
    console.log('✅ Map interactions added successfully');
}

// ========================================
// POPUP CREATION AND MANAGEMENT
// ========================================

/**
 * CREATE POPUP: Creates and displays a popup with IP location information
 * @param {Array} coordinates - [longitude, latitude] coordinates for popup
 * @param {Object} properties - Feature properties containing IP data
 */
function createPopup(coordinates, properties) {
    console.log('💬 Creating popup for IP:', properties.ip);
    
    try {
        // FORMAT URL: Truncate long URLs for better display
        const formattedUrl = properties.url.length > 50 
            ? properties.url.substring(0, 50) + '...' 
            : properties.url;
        
        // CREATE POPUP HTML: Build the popup content
        const popupHTML = `
            <div class="popup-content">
                <h4 class="popup-title">🌍 IP Location Details</h4>
                <div class="popup-info">
                    <p><strong>📍 IP Address:</strong> ${properties.ip}</p>
                    <p><strong>🗺️ Coordinates:</strong> ${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}</p>
                    <p><strong>🔗 Source URL:</strong></p>
                    <a href="${properties.url}" target="_blank" class="popup-url" title="${properties.url}">
                        ${formattedUrl}
                    </a>
                </div>
            </div>
        `;
        
        // DISPLAY POPUP: Create and show the popup on the map
        new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: '300px'
        })
        .setLngLat(coordinates)
        .setHTML(popupHTML)
        .addTo(map);
        
        console.log('✅ Popup created successfully');
        
    } catch (error) {
        console.error('❌ Error creating popup:', error);
    }
}

// ========================================
// UI CONTROL FUNCTIONS
// ========================================

/**
 * UPDATE IP COUNT: Updates the display of loaded IP locations count
 * @param {number|string} count - Number of IP locations loaded or status message
 */
function updateIPCount(count) {
    const countElement = document.getElementById('ip-count');
    if (countElement) {
        if (typeof count === 'number') {
            countElement.textContent = `📊 ${count} unique IP locations loaded`;
            countElement.style.color = '#27ae60'; // Green color for success
        } else {
            countElement.textContent = count;
            countElement.style.color = '#3498db'; // Blue color for info
        }
    }
}

/**
 * SHOW ERROR MESSAGE: Displays error messages to the user
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
    const countElement = document.getElementById('ip-count');
    if (countElement) {
        countElement.textContent = `❌ Error: ${message}`;
        countElement.style.color = '#e74c3c'; // Red color for errors
    }
}

/**
 * CHANGE MAP STYLE: Changes the visual style of the map
 * @param {string} styleKey - Key for the style from mapStyles object
 */
function changeMapStyle(styleKey) {
    console.log(`🎨 Changing map style to: ${styleKey}`);
    
    if (map && mapStyles[styleKey]) {
        try {
            // STORE CURRENT STATE: Remember current view before style change
            const currentCenter = map.getCenter();
            const currentZoom = map.getZoom();
            const currentPitch = map.getPitch();
            const currentBearing = map.getBearing();
            
            // CHANGE STYLE: Apply new map style
            map.setStyle(mapStyles[styleKey]);
            
            // RESTORE DATA: Re-add data after style change
            map.once('styledata', function() {
                // RESTORE VIEW: Return to previous view position
                map.setCenter(currentCenter);
                map.setZoom(currentZoom);
                map.setPitch(currentPitch);
                map.setBearing(currentBearing);
                
                // RE-ADD DATA: Add IP location data to new style
                if (ipLocationData) {
                    addGeoJSONToMap();
                }
            });
            
            console.log('✅ Map style changed successfully');
            
        } catch (error) {
            console.error('❌ Error changing map style:', error);
            showErrorMessage('Failed to change map style.');
        }
    }
}

/**
 * RESET MAP VIEW: Returns map to initial view configuration
 */
function resetMapView() {
    console.log('🔄 Resetting map view...');
    
    if (map) {
        try {
            // ANIMATE TO DEFAULT: Smooth transition to initial view
            map.easeTo({
                center: defaultMapConfig.center,
                zoom: defaultMapConfig.zoom,
                pitch: defaultMapConfig.pitch,
                bearing: defaultMapConfig.bearing,
                duration: 2000 // 2 second animation
            });
            
            console.log('✅ Map view reset successfully');
            
        } catch (error) {
            console.error('❌ Error resetting map view:', error);
        }
    }
}

// ========================================
// EVENT LISTENERS AND INITIALIZATION
// ========================================

/**
 * SETUP EVENT LISTENERS: Attaches event handlers to UI controls
 * This function connects the HTML controls to their JavaScript functions
 */
function setupEventListeners() {
    console.log('🎧 Setting up event listeners...');
    
    // MAP STYLE SELECTOR: Handle dropdown changes
    const styleSelector = document.getElementById('map-style');
    if (styleSelector) {
        styleSelector.addEventListener('change', function(e) {
            changeMapStyle(e.target.value);
        });
    }
    
    // ZOOM IN BUTTON: Increase map zoom level
    const zoomInBtn = document.getElementById('zoom-in');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            if (map) {
                map.zoomIn();
                console.log('🔍 Zoomed in');
            }
        });
    }
    
    // ZOOM OUT BUTTON: Decrease map zoom level
    const zoomOutBtn = document.getElementById('zoom-out');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            if (map) {
                map.zoomOut();
                console.log('🔍 Zoomed out');
            }
        });
    }
    
    // RESET VIEW BUTTON: Return to initial map view
    const resetViewBtn = document.getElementById('reset-view');
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', resetMapView);
    }
    
    console.log('✅ Event listeners setup completed');
}

/**
 * DOCUMENT READY: Main initialization function that runs when page loads
 * This is the entry point that starts the entire application
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Starting IP Geolocation Visualization application...');
    
    try {
        // INITIALIZE COMPONENTS: Start up all application components
        setupEventListeners(); // Set up UI controls first
        initializeMap(); // Then initialize the map
        
        console.log('✅ Application initialization completed');
        
        // REMOVE LOADING INDICATOR: Hide loading message once ready
        setTimeout(function() {
            const mapContainer = document.querySelector('.map-container');
            if (mapContainer) {
                mapContainer.style.position = 'relative';
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showErrorMessage('Application failed to start. Please refresh the page.');
    }
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * CONSOLE WELCOME: Display welcome message in browser console
 * This function shows information about the application in the console
 */
console.log(`
🗺️ IP Geolocation Visualization
═══════════════════════════════
📊 Visualizing IP locations from HAR file data
🛠️ Built with MapLibre GL JS
🎨 Interactive web mapping application
═══════════════════════════════
`);

// ========================================
// ERROR HANDLING AND DEBUGGING
// ========================================

/**
 * GLOBAL ERROR HANDLER: Catches any unhandled errors
 */
window.addEventListener('error', function(e) {
    console.error('❌ Global error caught:', e.error);
    showErrorMessage('An unexpected error occurred. Please refresh the page.');
});

/**
 * UNHANDLED PROMISE REJECTION: Catches promise errors
 */
window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ Unhandled promise rejection:', e.reason);
    showErrorMessage('A network error occurred. Please check your connection.');
});
