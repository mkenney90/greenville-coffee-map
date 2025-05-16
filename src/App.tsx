import { useState, useEffect, useRef } from 'react';
import { FeatureCollection, Feature } from 'geojson';
import { capitalizeFirstLetter } from './helpers';
import { mapConfig } from './MapConfig';
import mapboxgl from 'mapbox-gl';

import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';

mapboxgl.accessToken = 'pk.eyJ1IjoibWtlbm5leTkwIiwiYSI6ImNsdjVjbDdoMTAxZ3EybG8zOG1rdXY2aWgifQ.nvaQ0rwvdpqen2RMK_A2RQ';

export default function App() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);

  const [lng, setLng] = useState(-82.394);
  const [lat, setLat] = useState(34.8615);
  const [zoom, setZoom] = useState(10);
  const [mapData, setMapData] = useState<Feature[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [filteredCafes, setFilteredCafes] = useState<string[]>([]);

  const tilesetId = 'mkenney90.cluzu85hq5guq1upi8qjz1fy1-8fchy'; // replace this with the ID of the tileset you created
  const radius = 16090; // 10 mile radius
  const query = `https://api.mapbox.com/v4/${tilesetId}/tilequery/${lng},${lat}.json?radius=${radius}&limit=50&&access_token=${mapboxgl.accessToken}`;

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
            // filter out cafes that are closed today
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
      mapRef.current = mapConfig(
        mapContainer.current!,
        lng,
        lat,
        zoom,
        tilesetId,
        filteredCafes,
        setLng,
        setLat,
        setZoom
      );
  
      return () => mapRef.current!.remove();
    };
  
    if (!mapData || !mapData.length) {
      fetchData();
    }
    initializeMap();
  
  }, [filteredCafes]);  

  useEffect(() => {
    // build the sidebar content and update list of filtered locations
    const cafes = mapData;
  
    const listingsDiv = document.getElementById('listings');
  }, [mapData, filteredCafes])

  return (
    <div className="App">
        <h3>
          Greenville Cafe Map
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
