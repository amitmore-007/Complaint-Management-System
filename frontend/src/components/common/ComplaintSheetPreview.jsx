import { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";

import { complaintService } from "../../services/complaintService";

/**
 * Inline view of the signed complaint sheet uploaded at resolve time.
 *
 * Photos (Cloudinary) carry a public URL. PDFs sit in a private S3 bucket, so
 * a short-lived signed URL is fetched from the API first, then embedded with
 * <object>, which falls back to an open link where the browser has no inline
 * PDF viewer.
 */
const ComplaintSheetPreview = ({
  complaintId,
  sheet,
  isDarkMode,
  title = "Signed Complaint Sheet",
}) => {
  const needsSignedUrl = sheet?.storage === "s3" || (!sheet?.url && sheet?.key);
  const [signedUrl, setSignedUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!needsSignedUrl || !complaintId) return;
    let cancelled = false;
    setSignedUrl(null);
    setError(null);
    complaintService
      .getSheetUrl(complaintId)
      .then(({ url }) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || "Could not load complaint sheet"
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [needsSignedUrl, complaintId, sheet?.key]);

  if (!sheet?.url && !sheet?.key) return null;

  const url = needsSignedUrl ? signedUrl : sheet.url;
  const isPdf =
    sheet.mimeType === "application/pdf" || /\.pdf($|\?)/i.test(url ?? "");

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h6
          className={`font-medium flex items-center gap-2 ${
            isDarkMode ? "text-green-200" : "text-green-800"
          }`}
        >
          <FileText className="h-4 w-4" />
          {title}
        </h6>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap ${
              isDarkMode
                ? "border-white/10 text-gray-200 hover:bg-white/5"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open full size
          </a>
        )}
      </div>

      <div
        className={`rounded-lg border overflow-hidden ${
          isDarkMode ? "border-white/10 bg-[#111]" : "border-gray-200 bg-white"
        }`}
      >
        {error ? (
          <p className="p-4 text-sm text-red-500">{error}</p>
        ) : !url ? (
          <div className="h-40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
          </div>
        ) : isPdf ? (
          // <object> renders the PDF with the browser's viewer and shows its
          // children instead where that is unavailable (most mobile browsers).
          <object
            data={url}
            type="application/pdf"
            aria-label={sheet.originalName || "Complaint sheet"}
            className="w-full h-[480px]"
          >
            <div className="h-40 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <FileText className="h-10 w-10 text-red-500" />
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-blue-500 hover:underline"
              >
                Tap to open the PDF
              </a>
            </div>
          </object>
        ) : (
          <a href={url} target="_blank" rel="noreferrer">
            <img
              src={url}
              alt={sheet.originalName || "Complaint sheet"}
              className="w-full max-h-[480px] object-contain"
            />
          </a>
        )}
      </div>

      {sheet.originalName && (
        <p
          className={`mt-1 text-xs truncate ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {sheet.originalName}
        </p>
      )}
    </div>
  );
};

export default ComplaintSheetPreview;
