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
  medical: ["hospital", "doctor", "pharmacy"],
  finance: ["bank"]
};

function buildProviderResult({
  success = false,
  reason = "NOT_IMPLEMENTED",
  message = "Google nearby provider is not implemented yet.",
  googleApiCalled = false,
  dataSource = "not_implemented",
  facilities = {},
  summary = [],
  googleApiCalls = [],
  googleErrorStage = "unknown",
  googleHttpStatus = null,
  googleErrorStatus = null,
  googleErrorCode = null
} = {}) {
  return {
    success,
    reason,
    message,
    googleApiCalled,
    dataSource,
    facilities,
    summary,
    googleApiCalls,
    googleErrorStage,
    googleHttpStatus,
    googleErrorStatus,
    googleErrorCode
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

function hasValidCoordinates(input) {
  const lat = Number(input?.lat);
  const lng = Number(input?.lng);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function hasValidProviderInput(input) {
  const hasAddressInput = safeString(input?.address) !== "";
  const hasCoordinateInput =
    input?.locationInputType === "coordinates" && hasValidCoordinates(input);

  return Boolean(
    input &&
      input.storeId &&
      (hasAddressInput || hasCoordinateInput) &&
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

function getGoogleUsageStatus(error) {
  const googleStatus = safeString(error?.googleStatus);

  if (googleStatus === "TIMEOUT") return "timeout";
  if (googleStatus === "OVER_QUERY_LIMIT") return "rate_limited";

  return "failed";
}

async function fetchJsonWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS);

  try {
    let response;

    try {
      response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } catch (error) {
      const requestError = new Error("Google provider request failed.");
      requestError.httpStatus = null;
      requestError.googleStatus = error?.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR";
      requestError.googleCode = requestError.googleStatus;
      throw requestError;
    }

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error("Google provider request failed.");
      error.httpStatus = response.status;
      error.googleStatus = safeString(body?.status) || null;
      error.googleCode = `HTTP_${response.status}`;
      throw error;
    }

    return {
      body,
      httpStatus: response.status
    };
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

  let body;
  let httpStatus;

  try {
    const result = await fetchJsonWithTimeout(`${GOOGLE_GEOCODING_URL}?${params.toString()}`);
    body = result.body;
    httpStatus = result.httpStatus;
  } catch (error) {
    error.stage = "geocoding";
    throw error;
  }

  if (body.status !== "OK" || !Array.isArray(body.results) || body.results.length === 0) {
    const error = new Error("Google geocoding failed.");
    error.stage = "geocoding";
    error.httpStatus = httpStatus;
    error.googleStatus = body.status || "NO_RESULTS";
    error.googleCode = null;
    throw error;
  }

  const location = body.results[0]?.geometry?.location;
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const error = new Error("Google geocoding location was invalid.");
    error.stage = "geocoding";
    error.httpStatus = httpStatus;
    error.googleStatus = "INVALID_LOCATION";
    error.googleCode = null;
    throw error;
  }

  return { lat, lng };
}

async function searchNearbyByCategory({ category, lat, lng, radius, language, region, apiKey }) {
  try {
    const { body } = await fetchJsonWithTimeout(GOOGLE_PLACES_NEARBY_URL, {
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
          },
        }
      })
    });

    return Array.isArray(body.places)
      ? body.places.map(normalizePlace).filter((place) => place.name)
      : [];
  } catch (error) {
    error.stage = "places";
    throw error;
  }
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
  const googleApiCalls = [];

  if (categories.length === 0) {
    return buildProviderResult({
      reason: "PROVIDER_INPUT_INVALID",
      message: "Google nearby provider input is invalid."
    });
  }

  try {
    let lat;
    let lng;

    if (input.locationInputType === "coordinates") {
      lat = Number(input.lat);
      lng = Number(input.lng);
    } else {
      try {
        const location = await geocodeAddress({
          address: input.address,
          language: input.language,
          region: input.region,
          apiKey
        });
        lat = location.lat;
        lng = location.lng;
        googleApiCalls.push({
          googleApi: "geocoding",
          category: null,
          status: "success"
        });
      } catch (error) {
        googleApiCalls.push({
          googleApi: "geocoding",
          category: null,
          status: getGoogleUsageStatus(error)
        });
        throw error;
      }
    }

    for (const category of categories) {
      try {
        facilities[category] = await searchNearbyByCategory({
          category,
          lat,
          lng,
          radius: Number(input.radius),
          language: input.language,
          region: input.region,
          apiKey
        });
        googleApiCalls.push({
          googleApi: "places_nearby_search",
          category,
          status: "success"
        });
      } catch (error) {
        googleApiCalls.push({
          googleApi: "places_nearby_search",
          category,
          status: getGoogleUsageStatus(error)
        });
        throw error;
      }
    }

    return buildProviderResult({
      success: true,
      reason: "OK",
      message: "Nearby facilities fetched from Google Places.",
      googleApiCalled: true,
      dataSource: "google_places",
      facilities,
      summary: [],
      googleApiCalls
    });
  } catch (error) {
    return buildProviderResult({
      reason: "GOOGLE_PROVIDER_ERROR",
      message: "Google nearby provider failed.",
      googleApiCalled: true,
      dataSource: "google_places_error",
      googleApiCalls,
      googleErrorStage: error?.stage || "unknown",
      googleHttpStatus: Number.isInteger(error?.httpStatus) ? error.httpStatus : null,
      googleErrorStatus: safeString(error?.googleStatus) || null,
      googleErrorCode: safeString(error?.googleCode) || null
    });
  }
}
