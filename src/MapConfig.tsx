import mapboxgl from "mapbox-gl";
import { capitalizeFirstLetter } from "./helpers";

export function mapConfig(
    mapContainer: HTMLDivElement,
    lng: number,
    lat: number,
    zoom: number,
    tilesetId: string,
    filteredCafes: string[],
    setLng: (lng: number) => void,
    setLat: (lat: number) => void,
    setZoom: (zoom: number) => void
) {
    const map = new mapboxgl.Map({
        container: mapContainer || "",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [lng, lat],
        zoom: zoom,
        maxZoom: 14,
    });

    new mapboxgl.Marker({ color: '#1199EE' })
        .setLngLat([lng, lat])
        .addTo(map);

    map.on('move', () => {
        console.log("move")
        setLng(Number(map?.getCenter().lng.toFixed(4)));
        setLat(Number(map?.getCenter().lat.toFixed(4)));
        setZoom(Number(map?.getZoom().toFixed(2)));
    });

    map.on('load', () => {
        map.addSource('tilequery', {
            type: "vector",
            url: "mapbox://" + tilesetId,
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
            const hasAlcohol = properties.alcohol === "true";
            const longitude = coords[0];
            const latitude = coords[1];
            const distance = properties.distance ? properties.distance : 0;

            if (longitude === undefined || latitude === undefined) return;

            const coordinates = new mapboxgl.LngLat(longitude, latitude);

            const content = `<h3>${cafeName}</h3>
                <div style="text-align:left">
                  <p>${hasFood ? "&#129391 sells food" : ""}</p>
                  <p>${hasAlcohol ? "&#127866; sells alcohol" : ""}</p>
                  <p>${hasOutlets ? "&#128268; outlets available" : ""}</p>
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

    return map;

}