const PROVIDER_ENABLED_ENV = "GOOGLE_NEARBY_PROVIDER_ENABLED";
const GOOGLE_MAPS_API_KEY_ENV = "GOOGLE_MAPS_API_KEY";
const GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_PLACES_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const GOOGLE_TIMEOUT_MS = 8000;
const MAX_PLACES_PER_CATEGORY = 3;

const CATEGORY_TYPE_MAP = {
  park: ["park"],
  school: ["school"],
  shopping: ["shopping_mall", "supermarket"],
  transport: ["train_station", "bus_station", "transit_station"],
  medical: ["hospital", "doctor", "pharmacy"]
};

function buildProviderResult({
  success = false,
  reason = "NOT_IMPLEMENTED",
  message = "Google nearby provider is not implemented yet.",
  googleApiCalled = false,
  dataSource = "not_implemented",
  facilities = {},
  summary = []
} = {}) {
  return {
    success,
    reason,
    message,
    googleApiCalled,
    dataSource,
    facilities,
    summary
  };
}

function safeString(value) {
  return String(value || "").trim();
}

function isProviderEnabled() {
  return safeString(process.env[PROVIDER_ENABLED_ENV]).toLowerCase() === "true";
}

function getGoogleMapsApiKey() {
  return safeString(process.env[GOOGLE_MAPS_API_KEY_ENV]);
}

function hasValidProviderInput(input) {
  return Boolean(
    input &&
      input.storeId &&
      input.address &&
      Number.isFinite(Number(input.radius)) &&
      Array.isArray(input.categories) &&
      input.categories.length > 0
  );
}

function buildEmptyFacilities(categories) {
  return categories.reduce((facilities, category) => {
    if (CATEGORY_TYPE_MAP[category]) facilities[category] = [];
    return facilities;
  }, {});
}

function normalizePlace(place) {
  return {
    name: safeString(place?.displayName?.text),
    address: safeString(place?.formattedAddress),
    lat: Number(place?.location?.latitude),
    lng: Number(place?.location?.longitude),
    types: Array.isArray(place?.types) ? place.types : []
  };
}

function getSafeCategories(categories) {
  return [...new Set(categories.filter((category) => CATEGORY_TYPE_MAP[category]))];
}

async function fetchJsonWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error("Google provider request failed.");
      error.status = response.status;
      throw error;
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function geocodeAddress({ address, language, region, apiKey }) {
  const params = new URLSearchParams({
    address,
    key: apiKey
  });

  if (language) params.set("language", language);
  if (region) params.set("region", region);

  const body = await fetchJsonWithTimeout(`${GOOGLE_GEOCODING_URL}?${params.toString()}`);

  if (body.status !== "OK" || !Array.isArray(body.results) || body.results.length === 0) {
    const error = new Error("Google geocoding failed.");
    error.status = body.status || "NO_RESULTS";
    throw error;
  }

  const location = body.results[0]?.geometry?.location;
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const error = new Error("Google geocoding location was invalid.");
    error.status = "INVALID_LOCATION";
    throw error;
  }

  return { lat, lng };
}

async function searchNearbyByCategory({ category, lat, lng, radius, language, region, apiKey }) {
  const body = await fetchJsonWithTimeout(GOOGLE_PLACES_NEARBY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.types"
      ].join(",")
    },
    body: JSON.stringify({
      includedTypes: CATEGORY_TYPE_MAP[category],
      maxResultCount: MAX_PLACES_PER_CATEGORY,
      languageCode: language,
      regionCode: region,
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng
          },
          radius
        }
      }
    })
  });

  return Array.isArray(body.places)
    ? body.places.map(normalizePlace).filter((place) => place.name)
    : [];
}

export async function lookupGoogleNearbyFacilities(input = {}) {
  if (!hasValidProviderInput(input)) {
    return buildProviderResult({
      reason: "PROVIDER_INPUT_INVALID",
      message: "Google nearby provider input is invalid."
    });
  }

  if (!isProviderEnabled()) {
    return buildProviderResult({
      reason: "PROVIDER_NOT_ENABLED",
      message: "Google nearby provider is not enabled.",
      dataSource: "provider_not_enabled"
    });
  }

  const apiKey = getGoogleMapsApiKey();

  if (!apiKey) {
    return buildProviderResult({
      reason: "MISSING_GOOGLE_API_KEY",
      message: "Google Maps API key is not configured.",
      dataSource: "provider_not_configured"
    });
  }

  const categories = getSafeCategories(input.categories);
  const facilities = buildEmptyFacilities(categories);

  if (categories.length === 0) {
    return buildProviderResult({
      reason: "PROVIDER_INPUT_INVALID",
      message: "Google nearby provider input is invalid."
    });
  }

  try {
    const { lat, lng } = await geocodeAddress({
      address: input.address,
      language: input.language,
      region: input.region,
      apiKey
    });

    for (const category of categories) {
      facilities[category] = await searchNearbyByCategory({
        category,
        lat,
        lng,
        radius: Number(input.radius),
        language: input.language,
        region: input.region,
        apiKey
      });
    }

    return buildProviderResult({
      success: true,
      reason: "OK",
      message: "Nearby facilities fetched from Google Places.",
      googleApiCalled: true,
      dataSource: "google_places",
      facilities,
      summary: []
    });
  } catch (error) {
    return buildProviderResult({
      reason: "GOOGLE_PROVIDER_ERROR",
      message: "Google nearby provider failed.",
      googleApiCalled: true,
      dataSource: "google_places_error"
    });
  }
}
