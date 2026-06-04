const PROVIDER_ENABLED = false;

function buildProviderResult({
  reason = "NOT_IMPLEMENTED",
  message = "Google nearby provider is not implemented yet."
} = {}) {
  return {
    success: false,
    reason,
    message,
    googleApiCalled: false,
    dataSource: "not_implemented",
    facilities: {},
    summary: []
  };
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

export async function lookupGoogleNearbyFacilities(input = {}) {
  if (!hasValidProviderInput(input)) {
    return buildProviderResult({
      reason: "PROVIDER_INPUT_INVALID",
      message: "Google nearby provider input is invalid."
    });
  }

  if (!PROVIDER_ENABLED) {
    return buildProviderResult();
  }

  return buildProviderResult();
}
