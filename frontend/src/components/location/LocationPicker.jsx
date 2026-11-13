import React, { useEffect, useRef, useState } from "react";

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const NOMINATIM_URL =
  "https://nominatim.openstreetmap.org";

const DEFAULT_LOCATION = {
  lat: 17.385044,
  lng: 78.486671,
};

function LocationPicker({
  initialLocation = null,
  onLocationConfirmed,
  onClose,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const googleRef = useRef(null);

  const [selectedLocation, setSelectedLocation] =
    useState(
      initialLocation || DEFAULT_LOCATION
    );

  const [selectedAddress, setSelectedAddress] =
    useState("");

  const [searchText, setSearchText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [searching, setSearching] =
    useState(false);

  const [confirming, setConfirming] =
    useState(false);

  const [error, setError] =
    useState("");

  const [confirmed, setConfirmed] =
    useState(false);

  /*
   * Load Google Maps script only once.
   */
  const loadGoogleMaps = () => {
    return new Promise((resolve, reject) => {
      if (
        window.google &&
        window.google.maps
      ) {
        resolve(window.google);
        return;
      }

      const existingScript =
        document.getElementById(
          "foodxpress-google-maps"
        );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(window.google)
        );

        existingScript.addEventListener(
          "error",
          () =>
            reject(
              new Error(
                "Google Maps failed to load."
              )
            )
        );

        return;
      }

      const script =
        document.createElement("script");

      script.id =
        "foodxpress-google-maps";

      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker`;

      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (
          window.google &&
          window.google.maps
        ) {
          resolve(window.google);
        } else {
          reject(
            new Error(
              "Google Maps API is unavailable."
            )
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            "Unable to load Google Maps."
          )
        );
      };

      document.head.appendChild(script);
    });
  };

  /*
   * Reverse geocode using free OpenStreetMap Nominatim.
   */
  const reverseGeocode = async (
    latitude,
    longitude
  ) => {
    try {
      const response = await fetch(
        `${NOMINATIM_URL}/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            Accept:
              "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Address lookup failed."
        );
      }

      const data =
        await response.json();

      const address =
        data.display_name || "";

      setSelectedAddress(address);

      return address;
    } catch (err) {
      console.error(
        "Reverse geocoding error:",
        err
      );

      return "";
    }
  };

  /*
   * Create a visible custom marker.
   *
   * We use AdvancedMarkerElement.
   * This avoids the deprecated google.maps.Marker.
   */
  const createAdvancedMarker = (
    google,
    map,
    location
  ) => {
    if (
      markerRef.current
    ) {
      markerRef.current.map = null;
      markerRef.current = null;
    }

    const pin =
      document.createElement("div");

    pin.style.width = "34px";
    pin.style.height = "34px";
    pin.style.borderRadius = "50% 50% 50% 0";
    pin.style.background =
      "#641bc2";
    pin.style.border =
      "3px solid white";
    pin.style.boxShadow =
      "0 3px 10px rgba(0,0,0,0.35)";
    pin.style.transform =
      "rotate(-45deg)";
    pin.style.position =
      "relative";

    const dot =
      document.createElement("div");

    dot.style.width = "10px";
    dot.style.height = "10px";
    dot.style.borderRadius =
      "50%";
    dot.style.background =
      "white";
    dot.style.position =
      "absolute";
    dot.style.left = "9px";
    dot.style.top = "9px";

    pin.appendChild(dot);

    const marker =
      new google.maps.marker.AdvancedMarkerElement(
        {
          map,
          position: location,
          content: pin,
          gmpDraggable: true,
        }
      );

    marker.addListener(
      "dragend",
      async (event) => {
        if (
          !event.latLng
        ) {
          return;
        }

        const newLocation = {
          lat:
            event.latLng.lat(),
          lng:
            event.latLng.lng(),
        };

        setSelectedLocation(
          newLocation
        );

        setConfirmed(false);

        await reverseGeocode(
          newLocation.lat,
          newLocation.lng
        );
      }
    );

    markerRef.current =
      marker;

    return marker;
  };

  /*
   * IMPORTANT:
   * This function completely replaces
   * the previous marker.
   *
   * Therefore clicking a different
   * location will visibly move the pin.
   */
  const moveMarkerTo = async (
    location,
    shouldReverseGeocode = true
  ) => {
    const cleanLocation = {
      lat: Number(
        location.lat
      ),
      lng: Number(
        location.lng
      ),
    };

    if (
      !Number.isFinite(
        cleanLocation.lat
      ) ||
      !Number.isFinite(
        cleanLocation.lng
      )
    ) {
      return;
    }

    setSelectedLocation(
      cleanLocation
    );

    setConfirmed(false);

    const google =
      googleRef.current;

    const map =
      mapRef.current;

    if (
      google &&
      map
    ) {
      /*
       * Remove old marker.
       */
      if (
        markerRef.current
      ) {
        markerRef.current.map =
          null;

        markerRef.current =
          null;
      }

      /*
       * Create a brand-new
       * marker at the clicked
       * location.
       */
      createAdvancedMarker(
        google,
        map,
        cleanLocation
      );

      /*
       * Move map to selected
       * location.
       */
      map.panTo(
        cleanLocation
      );

      map.setZoom(17);
    }

    if (
      shouldReverseGeocode
    ) {
      await reverseGeocode(
        cleanLocation.lat,
        cleanLocation.lng
      );
    }
  };

  /*
   * Initialize Google Map.
   */
  useEffect(() => {
    let cancelled = false;

    const initializeMap =
      async () => {
        try {
          setLoading(true);
          setError("");

          const google =
            await loadGoogleMaps();

          if (cancelled) {
            return;
          }

          googleRef.current =
            google;

          if (
            !mapContainerRef.current
          ) {
            return;
          }

          /*
           * IMPORTANT:
           * The map container is completely
           * empty.
           *
           * React must NOT render a loading
           * child inside this div because
           * Google Maps controls the DOM.
           */
          const startingLocation =
            initialLocation
              ? {
                  lat: Number(
                    initialLocation.lat
                  ),
                  lng: Number(
                    initialLocation.lng
                  ),
                }
              : DEFAULT_LOCATION;

          const map =
            new google.maps.Map(
              mapContainerRef.current,
              {
                center:
                  startingLocation,

                zoom: 16,

                mapTypeControl:
                  false,

                streetViewControl:
                  false,

                fullscreenControl:
                  false,

                gestureHandling:
                  "greedy",

                mapId:
                  "FOOD_XPRESS_LOCATION_MAP",
              }
            );

          mapRef.current =
            map;

          createAdvancedMarker(
            google,
            map,
            startingLocation
          );

          /*
           * Map click.
           *
           * THIS is the important part.
           * Every click creates a new
           * marker at the exact clicked
           * coordinates.
           */
          map.addListener(
            "click",
            async (event) => {
              if (
                !event.latLng
              ) {
                return;
              }

              const clickedLocation =
                {
                  lat:
                    event.latLng.lat(),
                  lng:
                    event.latLng.lng(),
                };

              console.log(
                "Map clicked:",
                clickedLocation
              );

              /*
               * Move marker immediately.
               */
              await moveMarkerTo(
                clickedLocation,
                true
              );
            }
          );

          if (
            initialLocation
          ) {
            await reverseGeocode(
              startingLocation.lat,
              startingLocation.lng
            );
          }
        } catch (err) {
          console.error(
            "Location picker error:",
            err
          );

          if (
            !cancelled
          ) {
            setError(
              err.message ||
                "Unable to load map."
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setLoading(false);
          }
        }
      };

    initializeMap();

    return () => {
      cancelled = true;

      if (
        markerRef.current
      ) {
        markerRef.current.map =
          null;

        markerRef.current =
          null;
      }

      if (
        mapRef.current
      ) {
        googleRef.current =
          null;

        mapRef.current =
          null;
      }
    };
  }, []);

  /*
   * Search a location using Nominatim.
   */
  const handleSearch =
    async () => {
      const query =
        searchText.trim();

      if (!query) {
        return;
      }

      try {
        setSearching(true);
        setError("");

        const response =
          await fetch(
            `${NOMINATIM_URL}/search?format=jsonv2&limit=1&q=${encodeURIComponent(
              query
            )}`,
            {
              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            "Location search failed."
          );
        }

        const results =
          await response.json();

        if (
          !results ||
          results.length === 0
        ) {
          setError(
            "Location not found. Try another search."
          );
          return;
        }

        const result =
          results[0];

        const location =
          {
            lat: Number(
              result.lat
            ),
            lng: Number(
              result.lon
            ),
          };

        await moveMarkerTo(
          location,
          false
        );

        setSelectedAddress(
          result.display_name ||
            ""
        );
      } catch (err) {
        console.error(
          "Location search error:",
          err
        );

        setError(
          "Unable to search this location."
        );
      } finally {
        setSearching(false);
      }
    };

  /*
   * Get current browser location.
   */
  const handleCurrentLocation =
    () => {
      if (
        !navigator.geolocation
      ) {
        setError(
          "Geolocation is not supported by this browser."
        );
        return;
      }

      setError("");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location =
            {
              lat:
                position.coords
                  .latitude,
              lng:
                position.coords
                  .longitude,
            };

          console.log(
            "Current location:",
            location
          );

          await moveMarkerTo(
            location,
            true
          );
        },
        (err) => {
          console.error(
            "Current location error:",
            err
          );

          setError(
            "Unable to get your current location. Please allow location permission."
          );
        },
        {
          enableHighAccuracy:
            true,

          timeout:
            15000,

          maximumAge:
            0,
        }
      );
    };

  /*
   * Confirm the location.
   */
  const handleConfirm =
    async () => {
      if (
        !selectedLocation
      ) {
        setError(
          "Please select a location first."
        );
        return;
      }

      try {
        setConfirming(true);
        setError("");

        let address =
          selectedAddress;

        /*
         * If address is empty,
         * try reverse geocoding
         * before returning.
         */
        if (
          !address
        ) {
          address =
            await reverseGeocode(
              selectedLocation.lat,
              selectedLocation.lng
            );
        }

        const locationData =
          {
            latitude:
              Number(
                selectedLocation.lat
              ),

            longitude:
              Number(
                selectedLocation.lng
              ),

            formattedAddress:
              address ||
              `Selected location: ${selectedLocation.lat.toFixed(
                6
              )}, ${selectedLocation.lng.toFixed(
                6
              )}`,
          };

        console.log(
          "CONFIRMED LOCATION:",
          locationData
        );

        setConfirmed(true);

        /*
         * Send selected location
         * back to CustomerAddresses.
         */
        if (
          typeof onLocationConfirmed ===
          "function"
        ) {
          onLocationConfirmed(
            locationData
          );
        }
      } catch (err) {
        console.error(
          "Confirm location error:",
          err
        );

        setError(
          "Unable to confirm this location."
        );
      } finally {
        setConfirming(false);
      }
    };

  return (
    <div style={styles.wrapper}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            📍 Select Delivery
            Location
          </h2>

          <p style={styles.subtitle}>
            Search or click on the
            map to choose your exact
            delivery location.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={styles.closeButton}
          >
            ✕
          </button>
        )}
      </div>

      {/* SEARCH */}
      <div style={styles.searchRow}>
        <input
          type="text"
          value={searchText}
          onChange={(e) =>
            setSearchText(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (
              e.key ===
              "Enter"
            ) {
              handleSearch();
            }
          }}
          placeholder="Search area, street, city..."
          style={styles.searchInput}
        />

        <button
          type="button"
          onClick={
            handleSearch
          }
          disabled={searching}
          style={
            styles.searchButton
          }
        >
          {searching
            ? "Searching..."
            : "Search"}
        </button>

        <button
          type="button"
          onClick={
            handleCurrentLocation
          }
          style={
            styles.currentButton
          }
        >
          📍 Use My Location
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div style={styles.error}>
          ⚠ {error}
        </div>
      )}

      {/* MAP */}
      <div style={styles.mapWrapper}>
        {/*
         * DO NOT put React children
         * inside this div.
         *
         * Google Maps owns this DOM.
         */}
        <div
          ref={mapContainerRef}
          style={styles.map}
        />

        {loading && (
          <div
            style={
              styles.loadingOverlay
            }
          >
            Loading map...
          </div>
        )}
      </div>

      {/* SELECTED LOCATION */}
      <div
        style={
          styles.selectedCard
        }
      >
        <div
          style={
            styles.selectedTitle
          }
        >
          📍 Selected Location
        </div>

        <div
          style={
            styles.coordinates
          }
        >
          Latitude:{" "}
          {selectedLocation.lat.toFixed(
            6
          )}
        </div>

        <div
          style={
            styles.coordinates
          }
        >
          Longitude:{" "}
          {selectedLocation.lng.toFixed(
            6
          )}
        </div>

        {selectedAddress && (
          <div
            style={
              styles.address
            }
          >
            {selectedAddress}
          </div>
        )}

        {confirmed && (
          <div
            style={
              styles.confirmed
            }
          >
            ✓ Location confirmed
            successfully
          </div>
        )}
      </div>

      {/* BUTTONS */}
      <div
        style={
          styles.buttonRow
        }
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={
              styles.cancelButton
            }
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={
            handleConfirm
          }
          disabled={
            confirming ||
            loading
          }
          style={
            styles.confirmButton
          }
        >
          {confirming
            ? "Confirming..."
            : "✓ Confirm Location"}
        </button>
      </div>

      <div
        style={
          styles.attribution
        }
      >
        © OpenStreetMap
        contributors
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxSizing: "border-box",
    boxShadow:
      "0 8px 30px rgba(53, 16, 120, 0.12)",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "18px",
  },

  title: {
    margin: 0,
    color: "#351078",
    fontSize: "24px",
  },

  subtitle: {
    margin:
      "7px 0 0",
    color: "#666",
    fontSize: "14px",
  },

  closeButton: {
    width: "38px",
    height: "38px",
    borderRadius:
      "50%",
    border:
      "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontSize: "17px",
  },

  searchRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "15px",
  },

  searchInput: {
    flex: "1 1 280px",
    minWidth: "0",
    padding:
      "12px 14px",
    border:
      "1px solid #d8d1e5",
    borderRadius:
      "9px",
    fontSize: "14px",
    outline: "none",
    boxSizing:
      "border-box",
  },

  searchButton: {
    border: "none",
    background:
      "#641bc2",
    color: "#fff",
    padding:
      "12px 18px",
    borderRadius:
      "9px",
    cursor: "pointer",
    fontWeight: 700,
  },

  currentButton: {
    border:
      "1px solid #641bc2",
    background: "#fff",
    color: "#641bc2",
    padding:
      "12px 16px",
    borderRadius:
      "9px",
    cursor: "pointer",
    fontWeight: 700,
  },

  error: {
    marginBottom:
      "12px",
    padding:
      "12px 14px",
    borderRadius:
      "9px",
    background:
      "#fff0f0",
    color: "#b42318",
    border:
      "1px solid #f2c2c2",
  },

  mapWrapper: {
    position: "relative",
    width: "100%",
    height: "480px",
    borderRadius:
      "12px",
    overflow: "hidden",
    border:
      "1px solid #ddd",
  },

  /*
   * IMPORTANT:
   * This div must remain
   * completely empty.
   */
  map: {
    width: "100%",
    height: "100%",
  },

  loadingOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "center",
    background:
      "rgba(255,255,255,0.85)",
    color: "#351078",
    fontWeight: 700,
    zIndex: 2,
  },

  selectedCard: {
    marginTop: "15px",
    padding: "16px",
    background:
      "#f7f2ff",
    border:
      "1px solid #ddcaff",
    borderRadius:
      "12px",
  },

  selectedTitle: {
    color: "#351078",
    fontWeight: 800,
    marginBottom:
      "8px",
  },

  coordinates: {
    fontSize: "12px",
    color: "#555",
    marginTop:
      "3px",
  },

  address: {
    marginTop:
      "10px",
    color: "#444",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  confirmed: {
    marginTop:
      "10px",
    padding:
      "9px 11px",
    borderRadius:
      "8px",
    background:
      "#eaf9ef",
    color: "#176b35",
    fontWeight: 700,
    fontSize: "13px",
  },

  buttonRow: {
    display: "flex",
    justifyContent:
      "flex-end",
    gap: "10px",
    marginTop:
      "18px",
  },

  cancelButton: {
    border:
      "1px solid #ccc",
    background: "#fff",
    color: "#444",
    padding:
      "12px 20px",
    borderRadius:
      "9px",
    cursor: "pointer",
    fontWeight: 700,
  },

  confirmButton: {
    border: "none",
    background:
      "#641bc2",
    color: "#fff",
    padding:
      "12px 22px",
    borderRadius:
      "9px",
    cursor: "pointer",
    fontWeight: 800,
  },

  attribution: {
    marginTop:
      "10px",
    textAlign:
      "right",
    fontSize: "11px",
    color: "#777",
  },
};

export default LocationPicker;