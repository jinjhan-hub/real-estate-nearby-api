export async function lookupGoogleNearbyFacilities() {
  return {
    success: false,
    reason: "NOT_IMPLEMENTED",
    message: "Google nearby provider is not implemented yet.",
    googleApiCalled: false,
    dataSource: "not_implemented",
    facilities: {},
    summary: []
  };
}
