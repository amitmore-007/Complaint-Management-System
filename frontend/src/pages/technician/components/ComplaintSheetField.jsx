import { FileText, X } from "lucide-react";

import UploadDropzone, { FieldLabel } from "./UploadDropzone";

/** Required upload for the signed hard-copy complaint sheet (photo or PDF). */
const ComplaintSheetField = ({ sheet, onChange, onRemove, isDarkMode }) => {
  const isPdf = sheet?.type === "application/pdf";

  return (
    <div>
      <FieldLabel required isDarkMode={isDarkMode}>
        Signed complaint sheet
      </FieldLabel>

      {sheet ? (
        <div
          className={`flex items-center gap-3 p-3 rounded-xl border ${
            isDarkMode
              ? "border-white/10 bg-white/5"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          {isPdf ? (
            <FileText
              className={`h-10 w-10 flex-shrink-0 ${
                isDarkMode ? "text-red-400" : "text-red-500"
              }`}
            />
          ) : (
            <img
              src={URL.createObjectURL(sheet)}
              alt="Complaint sheet"
              className="h-12 w-12 object-cover rounded-lg flex-shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-medium truncate ${
                isDarkMode ? "text-gray-200" : "text-gray-800"
              }`}
            >
              {sheet.name}
            </p>
            <p className="text-xs text-gray-500">
              {(sheet.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove complaint sheet"
            className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <UploadDropzone
          id="complaint-sheet"
          icon={FileText}
          title="Upload signed sheet"
          hint="Photo or PDF of the hard copy, up to 50 MB"
          accept="image/*,application/pdf"
          onChange={onChange}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default ComplaintSheetField;
