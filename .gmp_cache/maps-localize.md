# Localize a Map

You can customize a Google Map for a specific country, territory, or linguistic
audience in two primary ways:

1.  **Language Localization (`language`)**: Forces the map to display textual
    information (control names, copyright notices, driving directions, and map
    labels) in a specific language instead of defaulting to the user's browser
    preferences.
2.  **Region Localization (`region`)**: Alters the map's behavior based on a
    given country or territory, serving appropriate map tiles for compliance
    with local laws and biasing service results (such as Geocoding and Places
    Autocomplete) toward that region.

> **Prerequisite**: Ensure you have already set up an interactive map in your
> application before applying localization settings.

--------------------------------------------------------------------------------

## Core Concepts & Best Practices

### 1. Always Pair Language and Region

Whenever you override the `language` setting, you are strongly encouraged to set
the `region` parameter as well. Setting the `region` ensures your application
complies with local laws in the country where it is hosted and improves the
relevance of location services like Places Autocomplete and Geocoding.

### 2. Language Codes vs. Region Identifiers

*   **`language`**: Accepts standard language codes (e.g., `ja` for Japanese,
    `ar` for Arabic, `zh-CN` for Simplified Chinese, `en-GB` for British
    English, `es-419` for Latin American Spanish).
    *   *Service Impact*: While controls and labels change completely, geocoding
        street-level addresses returns the country name in your requested
        language while keeping the rest of the street address specific to the
        local location. Postal and political results are returned in the
        requested language.
*   **`region`**: Accepts
    [Unicode region subtag identifiers](http://www.unicode.org/reports/tr35/#Unicode_Language_and_Locale_Identifiers),
    which generally map to ISO 3166-1 alpha-2 codes and country code Top-Level
    Domains (ccTLDs), with notable exceptions:
    *   **Example Exception**: Great Britain's ccTLD is `.uk`, but its Unicode
        region identifier is `GB`.
    *   **Example Biasing**: Geocoding `"Toledo"` with `region=US` biases
        results to `"Toledo, Ohio"`, whereas `region=ES` biases results to
        `"Toledo, Spain"`.

### 3. Bi-Directional (Bidi) & Right-to-Left (RTL) Text

The Maps JavaScript API natively supports bi-directional text containing
characters in both Left-to-Right (LTR) and Right-to-Left (RTL) languages (such
as Arabic `ar`, Hebrew `iw`, and Farsi `fa`). When rendering an RTL page, always
add `dir="rtl"` to your page's root `<html>` element so controls and info
windows lay out properly.

--------------------------------------------------------------------------------

## Implementation Patterns

### 1. Standard Localization (e.g., Japanese / Japan)

To force a specific language and region for all users regardless of their
browser settings, pass the `language` and `region` parameters when loading the
Maps JavaScript API script.

#### HTML (`index.html`)

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>Localized Map - Japan</title>
    <style>
      #map {
        height: 100vh;
        width: 100%;
      }
      html, body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>

    <!-- Load the Maps JavaScript API with region=JP and language=ja -->
    <script
      async
      src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&loading=async&region=JP&language=ja&callback=initMap">
    </script>
    <script type="module" src="./index.js"></script>
  </body>
</html>
```

#### TypeScript / JavaScript (`index.ts`)

Based on
[samples/map-language/index.ts](https://github.com/googlemaps/js-samples/blob/HEAD/samples/map-language/index.ts?utm_campaign=gmp_git_agentskills_v1):

```typescript
async function initMap(): Promise<void> {
  const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;

  const map = new Map(document.getElementById("map") as HTMLElement, {
    zoom: 8,
    center: { lat: 35.717, lng: 139.731 }, // Tokyo, Japan
    internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
  });
}

declare global {
  interface Window {
    initMap: () => void;
  }
}
window.initMap = initMap;
export {};
```

--------------------------------------------------------------------------------

### 2. Right-to-Left (RTL) Localization (e.g., Arabic / Egypt)

When localizing for an RTL language like Arabic (`language=ar`) and setting the
region to Egypt (`region=EG`), include `dir="rtl"` on the `<html>` tag.

#### HTML (`index.html`)

```html
<!DOCTYPE html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8" />
    <title>RTL Map - Cairo, Egypt</title>
    <style>
      #map {
        height: 100vh;
        width: 100%;
      }
      html, body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>

    <!-- Load the Maps JavaScript API with region=EG and language=ar -->
    <script
      async
      src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&loading=async&region=EG&language=ar&callback=initMap">
    </script>
    <script type="module" src="./index.js"></script>
  </body>
</html>
```

#### TypeScript / JavaScript (`index.ts`)

Based on
[samples/map-rtl/index.ts](https://github.com/googlemaps/js-samples/blob/HEAD/samples/map-rtl/index.ts?utm_campaign=gmp_git_agentskills_v1):

```typescript
async function initMap(): Promise<void> {
  const cairo = { lat: 30.064742, lng: 31.249509 };

  const { Map, InfoWindow } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
  const { AdvancedMarkerElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;

  const map = new Map(document.getElementById("map") as HTMLElement, {
    scaleControl: true,
    center: cairo,
    zoom: 10,
    mapId: "DEMO_MAP_ID",
    internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
  });

  const infowindow = new InfoWindow({
    content: "<b>القاهرة</b>",
  });

  const marker = new AdvancedMarkerElement({
    map,
    position: cairo,
  });

  marker.addListener("click", () => {
    infowindow.open({
      anchor: marker,
      map,
    });
  });
}

declare global {
  interface Window {
    initMap: () => void;
  }
}
window.initMap = initMap;
export {};
```

--------------------------------------------------------------------------------

### 3. React Integration (`@vis.gl/react-google-maps`)

If you are using `@vis.gl/react-google-maps` (see
[examples/basic-map/src/app.tsx](https://github.com/visgl/react-google-maps/blob/HEAD/examples/basic-map/src/app.tsx?utm_campaign=gmp_git_agentskills_v1)),
configure `language` and `region` directly on the `<APIProvider>` component.

```tsx
import React from 'react';
import { APIProvider, Map } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY as string;

const LocalizedMapApp = () => (
  <APIProvider apiKey={API_KEY} language="ja" region="JP">
    <Map
      style={{ width: '100vw', height: '100vh' }}
      defaultZoom={8}
      defaultCenter={{ lat: 35.717, lng: 139.731 }}
      gestureHandling="greedy"
      internalUsageAttributionIds={['gmp_git_agentskills_v1']}
    />
  </APIProvider>
);

export default LocalizedMapApp;
```

--------------------------------------------------------------------------------

## Supported Language Codes Reference

Google frequently updates supported languages. Common codes include:

| Code    | Language      | Code    | Language   | Code      | Language   |
| :------ | :------------ | :------ | :--------- | :-------- | :--------- |
| `af`    | Afrikaans     | `el`    | Greek      | `pl`      | Polish     |
| `sq`    | Albanian      | `gu`    | Gujarati   | `pt`      | Portuguese |
| `am`    | Amharic       | `iw`    | Hebrew     | `pt-BR`   | Portuguese |
:         :               :         :            :           : (Brazil)   :
| `ar`    | Arabic        | `hi`    | Hindi      | `pt-PT`   | Portuguese |
:         :               :         :            :           : (Portugal) :
| `hy`    | Armenian      | `hu`    | Hungarian  | `pa`      | Punjabi    |
| `az`    | Azerbaijani   | `is`    | Icelandic  | `ro`      | Romanian   |
| `eu`    | Basque        | `id`    | Indonesian | `ru`      | Russian    |
| `be`    | Belarusian    | `it`    | Italian    | `sr`      | Serbian    |
:         :               :         :            :           : (Cyrillic) :
| `bn`    | Bengali       | `ja`    | Japanese   | `sr-Latn` | Serbian    |
:         :               :         :            :           : (Latin     :
:         :               :         :            :           : script)    :
| `bs`    | Bosnian       | `kn`    | Kannada    | `si`      | Sinhalese  |
| `bg`    | Bulgarian     | `kk`    | Kazakh     | `sk`      | Slovak     |
| `my`    | Burmese       | `km`    | Khmer      | `sl`      | Slovenian  |
| `ca`    | Catalan       | `ko`    | Korean     | `es`      | Spanish    |
| `zh`    | Chinese       | `ky`    | Kyrgyz     | `es-419`  | Spanish    |
:         :               :         :            :           : (Latin     :
:         :               :         :            :           : America)   :
| `zh-CN` | Chinese       | `lo`    | Lao        | `sw`      | Swahili    |
:         : (Simplified)  :         :            :           :            :
| `zh-HK` | Chinese (Hong | `lv`    | Latvian    | `sv`      | Swedish    |
:         : Kong)         :         :            :           :            :
| `zh-TW` | Chinese       | `lt`    | Lithuanian | `ta`      | Tamil      |
:         : (Traditional) :         :            :           :            :
| `hr`    | Croatian      | `mk`    | Macedonian | `te`      | Telugu     |
| `cs`    | Czech         | `ms`    | Malay      | `th`      | Thai       |
| `da`    | Danish        | `ml`    | Malayalam  | `tr`      | Turkish    |
| `nl`    | Dutch         | `mr`    | Marathi    | `uk`      | Ukrainian  |
| `en`    | English       | `mn`    | Mongolian  | `ur`      | Urdu       |
| `en-AU` | English       | `ne`    | Nepali     | `uz`      | Uzbek      |
:         : (Australian)  :         :            :           :            :
| `en-GB` | English       | `no`    | Norwegian  | `vi`      | Vietnamese |
:         : (Great        :         :            :           :            :
:         : Britain)      :         :            :           :            :
| `et`    | Estonian      | `fa`    | Farsi      | `zu`      | Zulu       |
| `fi`    | Finnish       | `fil`   | Filipino   |           |            |
| `fr`    | French        | `fr-CA` | French     |           |            |
:         :               :         : (Canada)   :           :            :
| `gl`    | Galician      | `ka`    | Georgian   |           |            |
| `de`    | German        |         |            |           |            |
