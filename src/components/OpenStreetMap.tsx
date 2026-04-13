import React from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

interface OpenStreetMapProps {
  latitude: number;
  longitude: number;
  busLatitude?: number;
  busLongitude?: number;
}

const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
  latitude,
  longitude,
  busLatitude,
  busLongitude,
}) => {
  const getMapHTML = () => {
    const centerLat = busLatitude || latitude;
    const centerLng = busLongitude || longitude;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; }
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${centerLat}, ${centerLng}], 13);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19,
          }).addTo(map);

          // User marker (green)
          L.marker([${latitude}, ${longitude}])
            .addTo(map)
            .bindPopup('Your Location');

          ${busLatitude && busLongitude ? `
            // Bus marker (blue)
            var busIcon = L.divIcon({
              html: '<div style="background-color: #2196F3; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center;">🚌</div>',
              iconSize: [30, 30],
            });

            L.marker([${busLatitude}, ${busLongitude}], { icon: busIcon })
              .addTo(map)
              .bindPopup('Bus Location');

            // Fit to show both
            var bounds = L.latLngBounds([${latitude}, ${longitude}], [${busLatitude}, ${busLongitude}]);
            map.fitBounds(bounds, { padding: [30, 30] });
          ` : ''}
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: getMapHTML() }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#2196F3" />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
});

export default OpenStreetMap;