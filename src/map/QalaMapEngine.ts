import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import * as maplibregl from 'maplibre-gl';
import type { CityConfig, Incident, Language, SeverityLevel } from '../types.ts';
import { EMERGENCY_SERVICE_LOCATIONS } from '../data/shymkentBaseline.ts';

export type MapProviderMode = 'google' | 'osm';

export interface MapOptionsState {
  city: CityConfig;
  language: Language;
  incidents: Incident[];
  satellite: boolean;
  showTraffic: boolean;
  showHeatmap: boolean;
  showDistricts: boolean;
  showEmergency: boolean;
  showAltRoute: boolean;
  provider: MapProviderMode;
  darkTheme: boolean;
  mapsApiKey: string;
}

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

let googleOptionsConfigured = false;
let quotaMonitorInstalled = false;

export function installGoogleMapsQuotaDefense(): void {
  if (quotaMonitorInstalled || typeof window === 'undefined') return;
  quotaMonitorInstalled = true;

  const win = window as Window & { gm_authFailure?: () => void };
  win.gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded', { detail: 'gm_authFailure' }));
  };

  const origErr = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    origErr(...args);
    const joined = args.map((a) => String(a ?? '')).join(' ');
    if (
      joined.includes('OverQuotaMapError') ||
      joined.includes('QuotaExceededError') ||
      joined.includes('ApiNotActivatedMapError') ||
      joined.includes('RefererNotAllowedMapError')
    ) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded', { detail: joined }));
    }
  };
}

function buildPinElement(color: string, label: string, pulse = false): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'relative flex items-center justify-center cursor-pointer select-none';
  wrap.style.width = '28px';
  wrap.style.height = '28px';

  if (pulse) {
    const ring = document.createElement('span');
    ring.className = 'absolute inset-0 rounded-full animate-ping';
    ring.style.backgroundColor = color;
    ring.style.opacity = '0.45';
    wrap.appendChild(ring);
  }

  const dot = document.createElement('span');
  dot.style.width = '18px';
  dot.style.height = '18px';
  dot.style.borderRadius = '9999px';
  dot.style.backgroundColor = color;
  dot.style.border = '2px solid #F4F7FA';
  dot.style.boxShadow = '0 2px 10px rgba(0,0,0,0.45)';
  dot.style.display = 'flex';
  dot.style.alignItems = 'center';
  dot.style.justifyContent = 'center';
  dot.style.fontSize = '9px';
  dot.style.fontWeight = '700';
  dot.style.color = '#080D14';
  dot.textContent = label;
  wrap.appendChild(dot);

  return wrap;
}

function createDistrictPolygonCoords(lat: number, lng: number, radiusDeg = 0.018): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    pts.push([lat + Math.sin(angle) * radiusDeg * 0.85, lng + Math.cos(angle) * radiusDeg * 1.25]);
  }
  return pts;
}

export class QalaMapEngine {
  private container: HTMLElement;
  private onIncidentClick?: (incident: Incident) => void;
  private onMapCoordClick?: (lat: number, lng: number) => void;
  private onProviderFallback?: (reason: string) => void;

  private activeProvider: MapProviderMode | null = null;
  private googleMap: google.maps.Map | null = null;
  private googleLibs: {
    maps?: google.maps.MapsLibrary;
    marker?: google.maps.MarkerLibrary;
    routes?: google.maps.RoutesLibrary;
  } = {};
  private googleMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
  private googleShapes: Array<{ setMap: (m: null) => void }> = [];
  private googleTrafficLayer: google.maps.TrafficLayer | null = null;
  private googleInfoWindow: google.maps.InfoWindow | null = null;

  private osmMap: maplibregl.Map | null = null;
  private osmMarkers: maplibregl.Marker[] = [];
  private lastState: MapOptionsState | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    container: HTMLElement,
    callbacks: {
      onIncidentClick?: (incident: Incident) => void;
      onMapCoordClick?: (lat: number, lng: number) => void;
      onProviderFallback?: (reason: string) => void;
    }
  ) {
    this.container = container;
    this.onIncidentClick = callbacks.onIncidentClick;
    this.onMapCoordClick = callbacks.onMapCoordClick;
    this.onProviderFallback = callbacks.onProviderFallback;

    installGoogleMapsQuotaDefense();

    this.resizeObserver = new ResizeObserver(() => {
      this.osmMap?.resize();
    });
    this.resizeObserver.observe(this.container);
  }

  public async render(state: MapOptionsState): Promise<void> {
    const desiredProvider: MapProviderMode =
      state.provider === 'google' && state.mapsApiKey.trim().length > 0 ? 'google' : 'osm';

    if (desiredProvider !== this.activeProvider) {
      this.teardownActiveMap();
      if (desiredProvider === 'google') {
        const ok = await this.initGoogleMap(state);
        if (!ok) {
          this.onProviderFallback?.('Google Maps unavailable — switched to MapLibre + OpenStreetMap.');
          await this.initOsmMap(state);
        }
      } else {
        await this.initOsmMap(state);
      }
    }

    this.lastState = state;
    if (this.activeProvider === 'google') {
      await this.syncGoogleOverlays(state);
    } else if (this.activeProvider === 'osm') {
      this.syncOsmOverlays(state);
    }
  }

  public flyTo(lat: number, lng: number, zoom = 15): void {
    if (this.activeProvider === 'google' && this.googleMap) {
      this.googleMap.panTo({ lat, lng });
      this.googleMap.setZoom(zoom);
    } else if (this.activeProvider === 'osm' && this.osmMap) {
      this.osmMap.flyTo({ center: [lng, lat], zoom, duration: 750 });
    }
  }

  private async initGoogleMap(state: MapOptionsState): Promise<boolean> {
    try {
      if (!googleOptionsConfigured) {
        setOptions({
          key: state.mapsApiKey,
          v: 'weekly',
          language: state.language === 'kk' ? 'kk' : state.language === 'ru' ? 'ru' : 'en',
          region: 'KZ',
        });
        googleOptionsConfigured = true;
      }

      const mapsLib = await importLibrary('maps');
      const markerLib = await importLibrary('marker');
      let routesLib: google.maps.RoutesLibrary | undefined;
      try {
        routesLib = await importLibrary('routes');
      } catch {
        routesLib = undefined;
      }

      this.googleLibs = { maps: mapsLib, marker: markerLib, routes: routesLib };
      this.container.innerHTML = '';

      this.googleMap = new mapsLib.Map(this.container, {
        center: { lat: state.city.lat, lng: state.city.lng },
        zoom: state.city.zoom,
        mapId: 'DEMO_MAP_ID',
        mapTypeId: state.satellite ? 'hybrid' : 'roadmap',
        disableDefaultUI: false,
        zoomControl: true,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
      });

      this.googleInfoWindow = new mapsLib.InfoWindow();
      this.googleTrafficLayer = new mapsLib.TrafficLayer();

      this.googleMap.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng && this.onMapCoordClick) {
          const coords = e.latLng.toJSON();
          this.onMapCoordClick(coords.lat, coords.lng);
        }
      });

      this.activeProvider = 'google';
      return true;
    } catch (err) {
      console.warn('Google Maps initialization failed, falling back to MapLibre/OSM:', err);
      this.googleMap = null;
      this.activeProvider = null;
      return false;
    }
  }

  private async syncGoogleOverlays(state: MapOptionsState): Promise<void> {
    if (!this.googleMap || !this.googleLibs.maps || !this.googleLibs.marker) return;
    const { Circle, Polygon, Polyline } = this.googleLibs.maps;
    const { AdvancedMarkerElement } = this.googleLibs.marker;

    if (this.lastState && this.lastState.city.id !== state.city.id) {
      this.googleMap.setCenter({ lat: state.city.lat, lng: state.city.lng });
      this.googleMap.setZoom(state.city.zoom);
    }

    this.googleMap.setMapTypeId(state.satellite ? 'hybrid' : 'roadmap');

    if (this.googleTrafficLayer) {
      this.googleTrafficLayer.setMap(state.showTraffic ? this.googleMap : null);
    }

    // Clear old markers & shapes
    this.googleMarkers.forEach((m) => (m.map = null));
    this.googleMarkers = [];
    this.googleShapes.forEach((s) => s.setMap(null));
    this.googleShapes = [];

    // Districts
    if (state.showDistricts) {
      for (const dist of state.city.districts) {
        const ring = createDistrictPolygonCoords(dist.center[0], dist.center[1]);
        const poly = new Polygon({
          paths: ring.map(([lat, lng]) => ({ lat, lng })),
          strokeColor: '#00D4E8',
          strokeOpacity: 0.75,
          strokeWeight: 1.5,
          fillColor: '#00D4E8',
          fillOpacity: 0.08,
          map: this.googleMap,
          clickable: false,
        });
        this.googleShapes.push(poly);
      }
    }

    // Heatmap intensity circles
    if (state.showHeatmap) {
      for (const inc of state.incidents) {
        const color = SEVERITY_COLORS[inc.severity];
        const radius =
          inc.severity === 'critical' ? 520 : inc.severity === 'high' ? 380 : inc.severity === 'medium' ? 280 : 180;
        const circle = new Circle({
          strokeColor: color,
          strokeOpacity: 0.35,
          strokeWeight: 1,
          fillColor: color,
          fillOpacity: 0.22,
          map: this.googleMap,
          center: { lat: inc.lat, lng: inc.lng },
          radius,
          clickable: false,
        });
        this.googleShapes.push(circle);
      }
    }

    // Emergency service stations
    if (state.showEmergency && state.city.id === 'shymkent') {
      for (const st of EMERGENCY_SERVICE_LOCATIONS) {
        const glyph = st.type === 'fire' ? 'F' : st.type === 'hospital' ? 'H' : 'P';
        const pin = buildPinElement('#38BDF8', glyph, false);
        const marker = new AdvancedMarkerElement({
          map: this.googleMap,
          position: { lat: st.lat, lng: st.lng },
          title: st.name,
          content: pin,
          gmpClickable: true,
        });
        marker.addListener('gmp-click', () => {
          this.googleInfoWindow?.setContent(
            `<div style="color:#0F172A;font-size:12px;font-weight:600">${st.name}</div>`
          );
          this.googleInfoWindow?.open({ map: this.googleMap!, anchor: marker });
        });
        this.googleMarkers.push(marker);
      }
    }

    // Incident markers
    for (const inc of state.incidents) {
      const color = SEVERITY_COLORS[inc.severity];
      const badge = inc.isDemo ? 'D' : inc.severity === 'critical' ? '!' : '';
      const pin = buildPinElement(color, badge, inc.severity === 'critical' || Boolean(inc.isDemo));
      const marker = new AdvancedMarkerElement({
        map: this.googleMap,
        position: { lat: inc.lat, lng: inc.lng },
        title: `${inc.trackingNumber}: ${inc.title}`,
        content: pin,
        gmpClickable: true,
      });
      marker.addListener('gmp-click', () => {
        this.onIncidentClick?.(inc);
      });
      this.googleMarkers.push(marker);
    }

    // Alternative detour corridor
    if (state.showAltRoute) {
      const fallbackPath = [
        { lat: state.city.lat - 0.022, lng: state.city.lng - 0.024 },
        { lat: state.city.lat - 0.008, lng: state.city.lng - 0.015 },
        { lat: state.city.lat + 0.012, lng: state.city.lng + 0.008 },
        { lat: state.city.lat + 0.024, lng: state.city.lng + 0.025 },
      ];
      let drawn = false;
      if (this.googleLibs.routes?.Route) {
        try {
          const res = await this.googleLibs.routes.Route.computeRoutes({
            origin: fallbackPath[0],
            destination: fallbackPath[3],
            travelMode: 'DRIVING',
            computeAlternativeRoutes: true,
            fields: ['path', 'distanceMeters', 'durationMillis'],
          });
          const alt = res.routes?.[1] || res.routes?.[0];
          if (alt?.path?.length) {
            const poly = new Polyline({
              path: alt.path,
              geodesic: true,
              strokeColor: '#00D4E8',
              strokeOpacity: 0.9,
              strokeWeight: 5,
              map: this.googleMap,
            });
            this.googleShapes.push(poly);
            drawn = true;
          }
        } catch {
          drawn = false;
        }
      }
      if (!drawn) {
        const poly = new Polyline({
          path: fallbackPath,
          geodesic: true,
          strokeColor: '#00D4E8',
          strokeOpacity: 0.85,
          strokeWeight: 4,
          map: this.googleMap,
        });
        this.googleShapes.push(poly);
      }
    }
  }

  private getOsmStyle(satellite: boolean): maplibregl.StyleSpecification {
    if (satellite) {
      return {
        version: 8,
        sources: {
          esri: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Esri World Imagery',
          },
        },
        layers: [{ id: 'esri-sat', type: 'raster', source: 'esri' }],
      };
    }

    return {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
    };
  }

  private async initOsmMap(state: MapOptionsState): Promise<void> {
    this.container.innerHTML = '';
    this.osmMap = new maplibregl.Map({
      container: this.container,
      style: this.getOsmStyle(state.satellite),
      center: [state.city.lng, state.city.lat],
      zoom: state.city.zoom,
      attributionControl: { compact: true },
    });

    this.osmMap.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    this.osmMap.on('click', (e: maplibregl.MapMouseEvent) => {
      this.onMapCoordClick?.(e.lngLat.lat, e.lngLat.lng);
    });

    await new Promise<void>((resolve) => {
      if (!this.osmMap) return resolve();
      if (this.osmMap.isStyleLoaded()) return resolve();
      this.osmMap.once('load', () => resolve());
      setTimeout(() => resolve(), 900);
    });

    this.activeProvider = 'osm';
  }

  private syncOsmOverlays(state: MapOptionsState): void {
    if (!this.osmMap) return;

    if (this.lastState && this.lastState.satellite !== state.satellite) {
      this.osmMap.setStyle(this.getOsmStyle(state.satellite));
      this.osmMap.once('styledata', () => this.applyOsmGeoJsonLayers(state));
    } else {
      this.applyOsmGeoJsonLayers(state);
    }

    if (this.lastState && this.lastState.city.id !== state.city.id) {
      this.osmMap.flyTo({ center: [state.city.lng, state.city.lat], zoom: state.city.zoom, duration: 650 });
    }

    this.osmMarkers.forEach((m) => m.remove());
    this.osmMarkers = [];

    if (state.showEmergency && state.city.id === 'shymkent') {
      for (const st of EMERGENCY_SERVICE_LOCATIONS) {
        const glyph = st.type === 'fire' ? 'F' : st.type === 'hospital' ? 'H' : 'P';
        const el = buildPinElement('#38BDF8', glyph, false);
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([st.lng, st.lat])
          .setPopup(new maplibregl.Popup({ offset: 14 }).setText(st.name))
          .addTo(this.osmMap);
        this.osmMarkers.push(marker);
      }
    }

    for (const inc of state.incidents) {
      const color = SEVERITY_COLORS[inc.severity];
      const badge = inc.isDemo ? 'D' : inc.severity === 'critical' ? '!' : '';
      const el = buildPinElement(color, badge, inc.severity === 'critical' || Boolean(inc.isDemo));
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.onIncidentClick?.(inc);
      });
      const marker = new maplibregl.Marker({ element: el }).setLngLat([inc.lng, inc.lat]).addTo(this.osmMap);
      this.osmMarkers.push(marker);
    }
  }

  private applyOsmGeoJsonLayers(state: MapOptionsState): void {
    if (!this.osmMap || !this.osmMap.isStyleLoaded()) return;

    const cleanupIds = ['qq-districts-fill', 'qq-districts-line', 'qq-heat-circles', 'qq-detour-line'];
    cleanupIds.forEach((id) => {
      if (this.osmMap?.getLayer(id)) this.osmMap.removeLayer(id);
    });
    ['qq-districts-src', 'qq-heat-src', 'qq-detour-src'].forEach((src) => {
      if (this.osmMap?.getSource(src)) this.osmMap.removeSource(src);
    });

    if (state.showDistricts) {
      this.osmMap.addSource('qq-districts-src', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: state.city.districts.map((d) => {
            const ring = createDistrictPolygonCoords(d.center[0], d.center[1]).map(([lat, lng]) => [lng, lat]);
            ring.push(ring[0]);
            return {
              type: 'Feature',
              properties: { name: d.name[state.language] },
              geometry: { type: 'Polygon', coordinates: [ring] },
            };
          }),
        },
      });
      this.osmMap.addLayer({
        id: 'qq-districts-fill',
        type: 'fill',
        source: 'qq-districts-src',
        paint: { 'fill-color': '#00D4E8', 'fill-opacity': 0.08 },
      });
      this.osmMap.addLayer({
        id: 'qq-districts-line',
        type: 'line',
        source: 'qq-districts-src',
        paint: { 'line-color': '#00D4E8', 'line-width': 1.5, 'line-opacity': 0.75 },
      });
    }

    if (state.showHeatmap && state.incidents.length > 0) {
      this.osmMap.addSource('qq-heat-src', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: state.incidents.map((inc) => ({
            type: 'Feature',
            properties: {
              color: SEVERITY_COLORS[inc.severity],
              radius: inc.severity === 'critical' ? 34 : inc.severity === 'high' ? 26 : 18,
            },
            geometry: { type: 'Point', coordinates: [inc.lng, inc.lat] },
          })),
        },
      });
      this.osmMap.addLayer({
        id: 'qq-heat-circles',
        type: 'circle',
        source: 'qq-heat-src',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.28,
          'circle-blur': 0.5,
        },
      });
    }

    if (state.showAltRoute || state.showTraffic) {
      this.osmMap.addSource('qq-detour-src', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [state.city.lng - 0.025, state.city.lat - 0.02],
              [state.city.lng - 0.008, state.city.lat - 0.005],
              [state.city.lng + 0.012, state.city.lat + 0.009],
              [state.city.lng + 0.026, state.city.lat + 0.022],
            ],
          },
        },
      });
      this.osmMap.addLayer({
        id: 'qq-detour-line',
        type: 'line',
        source: 'qq-detour-src',
        paint: {
          'line-color': state.showAltRoute ? '#00D4E8' : '#F59E0B',
          'line-width': 4,
          'line-opacity': 0.85,
          'line-dasharray': [2, 1],
        },
      });
    }
  }

  private teardownActiveMap(): void {
    this.googleMarkers.forEach((m) => (m.map = null));
    this.googleMarkers = [];
    this.googleShapes.forEach((s) => s.setMap(null));
    this.googleShapes = [];
    this.googleTrafficLayer?.setMap(null);
    this.googleTrafficLayer = null;
    this.googleInfoWindow?.close();
    this.googleInfoWindow = null;
    this.googleMap = null;

    this.osmMarkers.forEach((m) => m.remove());
    this.osmMarkers = [];
    if (this.osmMap) {
      this.osmMap.remove();
      this.osmMap = null;
    }
    this.activeProvider = null;
  }

  public dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.teardownActiveMap();
  }
}
