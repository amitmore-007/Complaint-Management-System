import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Crosshair,
  Loader2,
  MapPin,
  MapPinOff,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useStoresList, useUpdateStoreGeofence } from "../../../../hooks/useStores";
import { getBestPosition } from "../../../../utils/geolocation";

/**
 * Pins each store on the map. A store with no pin is never geofenced, so this
 * screen is what actually switches the on-site check on, store by store.
 *
 * Capturing from the device while standing at the store beats geocoding an
 * address: geocoders resolve to street centroids that can sit 50-200m off,
 * which is the entire fence budget.
 */

/** Accepts a Google Maps link, "lat, lng", or a plain pair. */
const parseCoordinates = (raw) => {
  const text = String(raw || "").trim();
  if (!text) return null;

  const fromMapsUrl = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const fromQueryParam = text.match(/[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const fromPlainPair = text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);

  const match = fromMapsUrl || fromQueryParam || fromPlainPair;
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || Math.abs(lat) > 90) return null;
  if (!Number.isFinite(lng) || Math.abs(lng) > 180) return null;

  return { lat, lng };
};

const StoreLocationsTab = ({ isDarkMode }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStore, setEditingStore] = useState(null);
  const [form, setForm] = useState({ lat: "", lng: "", accuracy: null, radius: "150" });
  const [isCapturing, setIsCapturing] = useState(false);
  const [pasteValue, setPasteValue] = useState("");

  const { data: stores = [], isLoading, refetch } = useStoresList();
  const updateGeofenceMutation = useUpdateStoreGeofence();

  const pinnedCount = useMemo(
    () => stores.filter((store) => store?.location?.coordinates?.length).length,
    [stores],
  );

  const filteredStores = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((store) =>
      String(store?.name || "").toLowerCase().includes(q),
    );
  }, [stores, searchTerm]);

  const openEditor = (store) => {
    const coordinates = store?.location?.coordinates;
    setEditingStore(store);
    setPasteValue("");
    setForm({
      lat: coordinates?.length ? String(coordinates[1]) : "",
      lng: coordinates?.length ? String(coordinates[0]) : "",
      accuracy: store?.location?.accuracyMeters ?? null,
      radius: String(store?.geofenceRadiusMeters ?? 150),
    });
  };

  const closeEditor = () => {
    if (updateGeofenceMutation.isPending || isCapturing) return;
    setEditingStore(null);
  };

  const captureCurrentLocation = async () => {
    setIsCapturing(true);
    try {
      const position = await getBestPosition();
      setForm((prev) => ({
        ...prev,
        lat: String(position.coords.latitude),
        lng: String(position.coords.longitude),
        accuracy: position.coords.accuracy,
      }));
      toast.success(
        `Location captured (accurate to about ${Math.round(
          position.coords.accuracy,
        )}m)`,
      );
    } catch (error) {
      toast.error(error.message || "Could not capture location");
    } finally {
      setIsCapturing(false);
    }
  };

  const applyPastedCoordinates = () => {
    const parsed = parseCoordinates(pasteValue);
    if (!parsed) {
      toast.error("Could not read coordinates. Paste a Google Maps link or “lat, lng”.");
      return;
    }
    // Typed coordinates carry no device accuracy figure.
    setForm((prev) => ({
      ...prev,
      lat: String(parsed.lat),
      lng: String(parsed.lng),
      accuracy: null,
    }));
    setPasteValue("");
    toast.success("Coordinates applied");
  };

  const savePin = async () => {
    if (!editingStore?._id) return;
    if (!form.lat || !form.lng) {
      toast.error("Capture or enter a location first");
      return;
    }

    try {
      await updateGeofenceMutation.mutateAsync({
        storeId: editingStore._id,
        latitude: form.lat,
        longitude: form.lng,
        accuracyMeters: form.accuracy,
        radiusMeters: form.radius,
      });
      toast.success("Store location saved");
      setEditingStore(null);
      refetch?.();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to save store location",
      );
    }
  };

  const clearPin = async () => {
    if (!editingStore?._id) return;

    try {
      await updateGeofenceMutation.mutateAsync({
        storeId: editingStore._id,
        latitude: null,
        longitude: null,
        radiusMeters: form.radius,
      });
      toast.success("Store location cleared. This store is no longer checked.");
      setEditingStore(null);
      refetch?.();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to clear store location",
      );
    }
  };

  const inputClass = `w-full px-3 py-2 text-sm border rounded-lg transition-colors ${
    isDarkMode
      ? "bg-white/10 border-white/10 text-white placeholder-gray-400"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
  }`;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          />
          <input
            type="text"
            placeholder="Search store..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 text-sm border rounded-lg transition-colors ${
              isDarkMode
                ? "bg-white/10 border-white/10 text-white placeholder-gray-400"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
            }`}
          />
        </div>

        <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          <strong>{pinnedCount}</strong> of <strong>{stores.length}</strong> stores
          pinned. Unpinned stores are never location-checked.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => {
            const coordinates = store?.location?.coordinates;
            const isPinned = Boolean(coordinates?.length);

            return (
              <motion.div
                key={store._id}
                className={`border rounded-xl p-6 transition-colors ${
                  isDarkMode
                    ? "bg-white/5 border-white/10"
                    : "bg-white border-gray-200"
                }`}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isPinned
                          ? isDarkMode
                            ? "bg-emerald-600/20"
                            : "bg-emerald-100"
                          : isDarkMode
                            ? "bg-white/10"
                            : "bg-gray-100"
                      }`}
                    >
                      {isPinned ? (
                        <MapPin
                          className={`h-6 w-6 ${
                            isDarkMode ? "text-emerald-400" : "text-emerald-600"
                          }`}
                        />
                      ) : (
                        <MapPinOff
                          className={`h-6 w-6 ${
                            isDarkMode ? "text-gray-500" : "text-gray-400"
                          }`}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className={`font-semibold truncate ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {store.name}
                      </h3>
                      <p
                        className={`text-sm mt-1 ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {isPinned
                          ? `Within ${store.geofenceRadiusMeters ?? 150}m`
                          : "Not pinned"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => openEditor(store)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                      isDarkMode
                        ? "bg-white/10 hover:bg-white/20 text-white"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                    }`}
                  >
                    {isPinned ? "Edit" : "Pin"}
                  </button>
                </div>

                {isPinned && (
                  <p
                    className={`mt-4 text-xs font-mono ${
                      isDarkMode ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    {coordinates[1].toFixed(6)}, {coordinates[0].toFixed(6)}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pin editor */}
      <AnimatePresence>
        {editingStore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={closeEditor}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`rounded-2xl p-6 w-full max-w-lg max-h-[95vh] overflow-y-auto mx-4 ${
                isDarkMode ? "bg-[#111]" : "bg-white"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2
                    className={`text-xl font-bold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Store Location
                  </h2>
                  <p
                    className={`mt-1 text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {editingStore.name}
                  </p>
                </div>
                <button
                  onClick={closeEditor}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? "text-gray-400 hover:text-white hover:bg-white/10"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Capture on site — the accurate path */}
                <div>
                  <button
                    type="button"
                    onClick={captureCurrentLocation}
                    disabled={isCapturing}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
                  >
                    {isCapturing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crosshair className="h-4 w-4" />
                    )}
                    <span>
                      {isCapturing
                        ? "Finding your location…"
                        : "Capture from my current location"}
                    </span>
                  </button>
                  <p
                    className={`mt-2 text-xs ${
                      isDarkMode ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    Most accurate when done standing at the store.
                  </p>
                </div>

                {/* Paste from Google Maps */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Or paste a Google Maps link / coordinates
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pasteValue}
                      onChange={(e) => setPasteValue(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && applyPastedCoordinates()
                      }
                      placeholder="https://maps.google.com/…@19.0760,72.8777"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={applyPastedCoordinates}
                      className={`px-4 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                        isDarkMode
                          ? "bg-white/10 hover:bg-white/20 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                      }`}
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Coordinates + radius */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className={`block text-xs font-medium mb-1.5 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Latitude
                    </label>
                    <input
                      type="text"
                      value={form.lat}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          lat: e.target.value,
                          accuracy: null,
                        }))
                      }
                      placeholder="19.076000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-xs font-medium mb-1.5 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Longitude
                    </label>
                    <input
                      type="text"
                      value={form.lng}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          lng: e.target.value,
                          accuracy: null,
                        }))
                      }
                      placeholder="72.877700"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-xs font-medium mb-1.5 ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Allowed radius (metres)
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={2000}
                    value={form.radius}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, radius: e.target.value }))
                    }
                    className={inputClass}
                  />
                  <p
                    className={`mt-2 text-xs leading-relaxed ${
                      isDarkMode ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    150m is a safe default. Phone GPS degrades badly indoors, so
                    a tighter radius can reject a technician standing inside the
                    store. Lower it only once the recorded distances show it is
                    safe.
                  </p>
                </div>

                {form.accuracy !== null && (
                  <div
                    className={`text-xs rounded-lg px-3 py-2 ${
                      isDarkMode
                        ? "bg-white/10 text-gray-400"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Captured with an accuracy of about{" "}
                    {Math.round(form.accuracy)}m.
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  {editingStore?.location?.coordinates?.length ? (
                    <button
                      type="button"
                      onClick={clearPin}
                      disabled={updateGeofenceMutation.isPending}
                      className={`py-3 px-4 rounded-xl font-semibold transition-colors disabled:opacity-60 ${
                        isDarkMode
                          ? "bg-red-900/30 hover:bg-red-900/50 text-red-300"
                          : "bg-red-50 hover:bg-red-100 text-red-600"
                      }`}
                    >
                      Clear pin
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={savePin}
                    disabled={updateGeofenceMutation.isPending || isCapturing}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {updateGeofenceMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <span>Save location</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StoreLocationsTab;
