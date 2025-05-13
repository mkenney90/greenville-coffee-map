import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { FeatureCollection, Feature } from 'geojson';
import './App.css';
import { useState, useEffect, useRef } from 'react';
import { capitalizeFirstLetter } from './helpers';

mapboxgl.accessToken = 'pk.eyJ1IjoibWtlbm5leTkwIiwiYSI6ImNsdjVjbDdoMTAxZ3EybG8zOG1rdXY2aWgifQ.nvaQ0rwvdpqen2RMK_A2RQ';

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [lng, setLng] = useState(-82.41);
  const [lat, setLat] = useState(34.85);
  const [zoom, setZoom] = useState(10);
  const [mapData, setMapData] = useState<Feature[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [filteredCafes, setFilteredCafes] = useState<string[]>([]);

  const tileset = 'mkenney90.cluzu85hq5guq1upi8qjz1fy1-8fchy'; // replace this with the ID of the tileset you created
  const radius = 16090;
  const query = `https://api.mapbox.com/v4/${tileset}/tilequery/${lng},${lat}.json?radius=${radius}&limit=50&&access_token=${mapboxgl.accessToken}`;

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = new Date().getDay();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(query);
        const data = await response.json() as FeatureCollection;
        const featuresToList = data.features.reduce((acc: Feature[], feature: Feature) => {
          if (!acc.some(f => f.properties?.name === feature.properties?.name)) {
            acc.push(feature);
          }
          if (!filteredCafes.length && feature.properties?.closedOn) {
            const closedDays = feature.properties.closedOn;
            const closedDaysArray = closedDays.replace(' ', '').split(',');
            if (closedDaysArray.includes(days[today])) {
              setFilteredCafes(prev => [feature.properties?.name, ...prev]);
            }
          }
          return acc;
        }, [] as Feature[]);
        setMapData(featuresToList);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
  
    const initializeMap = () => {
      const map = new mapboxgl.Map({
        container: mapContainer.current || "",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [lng, lat],
        zoom: zoom,
        maxZoom: 14,
      });
  
      new mapboxgl.Marker({ color: '#1199EE' })
        .setLngLat([lng, lat])
        .addTo(map);
  
      map.on('move', () => {
        setLng(Number(map?.getCenter().lng.toFixed(4)));
        setLat(Number(map?.getCenter().lat.toFixed(4)));
        setZoom(Number(map?.getZoom().toFixed(2)));
      });
  
      map.on('load', () => {
        map.addSource('tilequery', {
          type: "vector",
          url: "mapbox://" + tileset,
          promoteId: { "greenville_cafes": "name" }
        });
  
        map.addLayer({
          id: 'tilequery-points',
          type: 'circle',
          source: 'tilequery',
          'source-layer': 'greenville_cafes',
          paint: {
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'distance'],
              0,
              '#11FF00',
              7,
              '#FEFE00',
              15,
              '#FE2500'
            ],
            'circle-opacity': 0.85,
            'circle-radius': 6,
            'circle-stroke-width': {
              stops: [
                [0, 0.75],
                [18, 3]
              ],
              base: 5
            },
          }
        });
  
        if (filteredCafes) {
          map.setFilter('tilequery-points',
            ['!',
              ['in', ['get', 'name'], ['literal', filteredCafes]]
            ]
          );
        }
  
        const popup = new mapboxgl.Popup();
        map.on('mouseenter', 'tilequery-points', (event) => {
          if (!map || !event?.features?.length) return;
  
          map.getCanvas().style.cursor = 'pointer';
  
          const feature = event.features[0];
          if (!feature) return;
  
          const properties = feature.properties;
          if (!properties) return;
  
          let coords = [0, 0];
          const geometry = feature.geometry;
          if (geometry.type === "Point") {
            coords = geometry.coordinates;
          }
  
          const cafeName = capitalizeFirstLetter(properties.name);
          const hasFood = properties.food === "true";
          const hasOutlets = properties.outlets === "true";
          const longitude = coords[0];
          const latitude = coords[1];
          const distance = properties.distance ? properties.distance : 0;
  
          if (longitude === undefined || latitude === undefined) return;
  
          const coordinates = new mapboxgl.LngLat(longitude, latitude);
  
          const content = `<h3>${cafeName}</h3>
            <div style="text-align:left">
              <p>${hasFood ? "&#129391" : ""}</p>
              <p>${hasOutlets ? "&#128268;" : ""}</p>
              <p>${distance.toFixed(2)} mi. from downtown</p>
            </div>`;
  
          popup
            .setLngLat(coordinates)
            .setHTML(content)
            .addTo(map);
        });
        map.on('mouseleave', 'tilequery-points', () => {
          if (!map) return;
          map.getCanvas().style.cursor = '';
          popup.remove();
        });
      });
  
      return () => map.remove();
    };
  
    if (!mapData || !mapData.length) {
      fetchData();
    }
  
    initializeMap();
  
  }, [filteredCafes]);  

  useEffect(() => {
    // build the sidebar content and update list of filtered locations
    // const cafes = mapData;
  
    // const listingsDiv = document.getElementById('listings');
  }, [mapData, filteredCafes])

  return (
    <div className="App">
        <h3>
          Coffee Shops near Greenville:
        </h3>
        <div className="sidebar shadow">
          {!isLoading ? (
            <div className="header">
              <h2>Cafes Nearby</h2>
              <hr/>
            </div>
          ) : <p>Fetching map data...</p>}
          <div id="listings">
            {mapData?.map((cafe, index) => {
              return (
                <div key={index}>
                  <p className='cafe_listing' style={{}}>
                    {capitalizeFirstLetter(cafe.properties?.name)}
                  </p>
                </div>
              )
              })
            }
          </div>
        </div>
        <div ref={mapContainer} className="map-container shadow" />
    </div>
  );
}
