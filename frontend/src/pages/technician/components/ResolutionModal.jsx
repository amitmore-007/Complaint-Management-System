import { createPortal } from "react-dom";
import { Camera, CheckSquare, Video, X } from "lucide-react";

import VideoPlayer from "../../../components/player/VideoPlayer";
import ComplaintSheetField from "./ComplaintSheetField";
import MaterialsUsedFields from "./MaterialsUsedFields";
import UploadDropzone, { FieldLabel } from "./UploadDropzone";

const MAX_PHOTOS = 5;
const MAX_VIDEOS = 2;

// What still blocks submitting, shown above the button so a disabled button
// is never a mystery.
const getMissing = (data) => {
  const missing = [];
  if (!data.notes.trim()) missing.push("notes");
  if (!data.photos.length) missing.push("a photo");
  if (!data.sheet) missing.push("the signed sheet");
  if (
    data.materialsUsed &&
    !(data.materials ?? []).some((m) => m.itemId && Number(m.quantity) > 0)
  ) {
    missing.push("a material with quantity");
  }
  return missing;
};

const joinList = (items) =>
  items.length > 1
    ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
    : items[0];

/**
 * "Mark as resolved" form, shared by the technician Dashboard and Assignments
 * pages. A bottom sheet on phones (header and buttons stay put while the form
 * scrolls), a centred dialog from `sm` up.
 */
const ResolutionModal = ({
  complaint,
  resolutionData,
  setResolutionData,
  inventoryItems,
  materialHandlers,
  onPhotoChange,
  onRemovePhoto,
  onVideoChange,
  onRemoveVideo,
  onSheetChange,
  onRemoveSheet,
  onClose,
  onSubmit,
  isSubmitting,
  isDarkMode,
}) => {
  const missing = getMissing(resolutionData);
  const isComplete = missing.length === 0;
  const muted = isDarkMode ? "text-gray-400" : "text-gray-600";
  const divider = isDarkMode ? "border-white/10" : "border-gray-200";

  // Portalled to <body> so it sits above the dashboard header instead of
  // inside the page's stacking context.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 pt-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolution-modal-title"
        className={`flex w-full max-w-2xl max-h-full sm:max-h-[90vh] flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl ${
          isDarkMode ? "bg-[#111]" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-start justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b ${divider}`}
        >
          <div className="min-w-0">
            <h3
              id="resolution-modal-title"
              className={`text-lg sm:text-xl font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Mark as Resolved
            </h3>
            <p className={`text-sm truncate ${muted}`}>
              {complaint.complaintId} · {complaint.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`-mr-2 p-2 rounded-lg transition-colors ${
              isDarkMode
                ? "text-gray-400 hover:bg-white/10"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form */}
        <div
          className={`flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-5 ${
            isDarkMode ? "dark-scrollbar" : ""
          }`}
        >
          <div>
            <FieldLabel required isDarkMode={isDarkMode}>
              Resolution notes
            </FieldLabel>
            <textarea
              value={resolutionData.notes}
              onChange={(e) =>
                setResolutionData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              placeholder="Describe how the complaint was resolved..."
              // 16px on phones stops iOS zooming into the field.
              className={`w-full px-3 py-2.5 border rounded-xl text-base sm:text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDarkMode
                  ? "bg-white/10 border-white/10 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              }`}
            />
          </div>

          <MaterialsUsedFields
            isDarkMode={isDarkMode}
            materialsUsed={resolutionData.materialsUsed}
            materials={resolutionData.materials ?? []}
            inventoryItems={inventoryItems}
            {...materialHandlers}
          />

          {/* Photos */}
          <div>
            <FieldLabel
              required
              meta={`${resolutionData.photos.length}/${MAX_PHOTOS}`}
              isDarkMode={isDarkMode}
            >
              Proof photos
            </FieldLabel>
            {resolutionData.photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
                {resolutionData.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Resolution proof ${index + 1}`}
                      className="h-full w-full object-cover rounded-lg"
                    />
                    {/* Always visible: there is no hover on a phone. */}
                    <button
                      type="button"
                      onClick={() => onRemovePhoto(index)}
                      aria-label={`Remove photo ${index + 1}`}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {resolutionData.photos.length < MAX_PHOTOS && (
              <UploadDropzone
                id="resolution-photos"
                icon={Camera}
                title={
                  resolutionData.photos.length ? "Add more photos" : "Add photos"
                }
                hint="Photos of the resolved work, up to 10 MB each"
                accept="image/*"
                multiple
                onChange={onPhotoChange}
                isDarkMode={isDarkMode}
              />
            )}
          </div>

          {/* Videos */}
          <div>
            <FieldLabel
              optional
              meta={`${resolutionData.videos.length}/${MAX_VIDEOS}`}
              isDarkMode={isDarkMode}
            >
              Proof videos
            </FieldLabel>
            {resolutionData.videos.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {resolutionData.videos.map((video, index) => (
                  <div key={index} className="relative rounded-xl overflow-hidden">
                    <VideoPlayer src={URL.createObjectURL(video)} />
                    <button
                      type="button"
                      onClick={() => onRemoveVideo(index)}
                      aria-label={`Remove video ${index + 1}`}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center z-10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {resolutionData.videos.length < MAX_VIDEOS && (
              <UploadDropzone
                id="resolution-videos"
                icon={Video}
                title={
                  resolutionData.videos.length ? "Add another video" : "Add videos"
                }
                hint="MP4, MOV or WebM, up to 100 MB each"
                accept="video/mp4,video/quicktime,video/webm,video/avi,video/*"
                multiple
                onChange={onVideoChange}
                isDarkMode={isDarkMode}
              />
            )}
          </div>

          <ComplaintSheetField
            sheet={resolutionData.sheet}
            onChange={onSheetChange}
            onRemove={onRemoveSheet}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Footer */}
        <div
          className={`px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 border-t ${divider}`}
        >
          {missing.length > 0 && (
            <p className={`text-xs mb-2 ${muted}`}>
              Add {joinList(missing)} to continue.
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 px-4 border rounded-xl font-semibold transition-colors ${
                isDarkMode
                  ? "border-white/10 text-gray-300 hover:bg-white/10"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!isComplete || isSubmitting}
              className={`flex-[2] py-3 px-4 rounded-xl font-semibold whitespace-nowrap flex items-center justify-center gap-2 transition-colors ${
                isComplete
                  ? "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-70 disabled:cursor-wait"
                  : isDarkMode
                    ? "bg-white/10 text-gray-500 cursor-not-allowed"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <CheckSquare className="h-5 w-5" />
                  Mark as Resolved
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ResolutionModal;
