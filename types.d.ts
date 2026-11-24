declare module 'troika-three-text' {
  export * from 'troika-types/packages/troika-three-text/dist/src/index';
}

declare namespace google.maps {
  export interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  export interface LatLng {
    lat(): number;
    lng(): number;
    toJSON(): LatLngLiteral;
  }

  export interface MapMouseEvent {
    latLng: LatLng | null;
  }

  export interface MapsEventListener {
    remove(): void;
  }

  export interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    mapId?: string;
    mapTypeId?: string;
    disableDefaultUI?: boolean;
    zoomControl?: boolean;
    fullscreenControl?: boolean;
    gestureHandling?: string;
    renderingType?: string;
    internalUsageAttributionIds?: string[];
  }

  export class Map {
    constructor(mapDiv: HTMLElement, opts?: MapOptions);
    setOptions(opts: MapOptions): void;
    setCenter(latLng: LatLngLiteral): void;
    setZoom(zoom: number): void;
    getCenter(): LatLng | undefined;
    getZoom(): number | undefined;
    panTo(latLng: LatLngLiteral): void;
    setMapTypeId(mapTypeId: string): void;
    addListener(eventName: string, handler: (e: MapMouseEvent) => void): MapsEventListener;
  }

  export class TrafficLayer {
    constructor(opts?: { map?: Map | null });
    setMap(map: Map | null): void;
  }

  export class Circle {
    constructor(opts?: {
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
      map?: Map | null;
      center?: LatLngLiteral;
      radius?: number;
      clickable?: boolean;
    });
    setMap(map: Map | null): void;
  }

  export class Polygon {
    constructor(opts?: {
      paths?: LatLngLiteral[];
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
      map?: Map | null;
      clickable?: boolean;
    });
    setMap(map: Map | null): void;
  }

  export class Polyline {
    constructor(opts?: {
      path?: LatLngLiteral[];
      geodesic?: boolean;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      map?: Map | null;
    });
    setMap(map: Map | null): void;
  }

  export class InfoWindow {
    constructor(opts?: { content?: string | HTMLElement });
    setContent(content: string | HTMLElement): void;
    open(opts: { map?: Map; anchor?: unknown }): void;
    close(): void;
  }

  export namespace marker {
    export class AdvancedMarkerElement {
      constructor(opts?: {
        map?: Map | null;
        position?: LatLngLiteral;
        title?: string;
        content?: HTMLElement;
        gmpClickable?: boolean;
      });
      map: Map | null;
      position?: LatLngLiteral;
      addListener(eventName: string, handler: () => void): MapsEventListener;
    }
  }

  export namespace routes {
    export interface ComputeRoutesRequest {
      origin: LatLngLiteral;
      destination: LatLngLiteral;
      travelMode?: string;
      computeAlternativeRoutes?: boolean;
      fields?: string[];
    }
    export class Route {
      static computeRoutes(request: ComputeRoutesRequest): Promise<{
        routes?: Array<{
          path?: LatLngLiteral[];
          distanceMeters?: number;
          durationMillis?: number;
          createPolylines?: (opts?: unknown) => Polyline[];
        }>;
      }>;
    }
  }

  export interface MapsLibrary {
    Map: typeof Map;
    TrafficLayer: typeof TrafficLayer;
    Circle: typeof Circle;
    Polygon: typeof Polygon;
    Polyline: typeof Polyline;
    InfoWindow: typeof InfoWindow;
  }

  export interface MarkerLibrary {
    AdvancedMarkerElement: typeof marker.AdvancedMarkerElement;
  }

  export interface RoutesLibrary {
    Route: typeof routes.Route;
  }

  export interface ImportLibraryMap {
    maps: MapsLibrary;
    marker: MarkerLibrary;
    routes: RoutesLibrary;
    [key: string]: unknown;
  }
}
