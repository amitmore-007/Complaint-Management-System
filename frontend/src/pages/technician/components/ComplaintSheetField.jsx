import { FileText, X } from "lucide-react";

/** Required upload for the signed hard-copy complaint sheet (photo or PDF). */
const ComplaintSheetField = ({ sheet, onChange, onRemove, isDarkMode }) => {
  const isPdf = sheet?.type === "application/pdf";

  return (
    <div>
      <label
        className={`block text-sm font-medium mb-2 ${
          isDarkMode ? "text-gray-300" : "text-gray-700"
        }`}
      >
        Signed Complaint Sheet *
      </label>

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
              className="h-16 w-16 object-cover rounded-lg flex-shrink-0"
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
            className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center ${
            isDarkMode
              ? "border-white/10 hover:border-gray-500"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={onChange}
            className="hidden"
            id="complaint-sheet"
          />
          <label htmlFor="complaint-sheet" className="cursor-pointer">
            <FileText
              className={`h-8 w-8 mx-auto mb-2 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            />
            <p
              className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Click to upload a photo or PDF of the signed hard-copy sheet
            </p>
            <p className="text-xs mt-1 text-gray-500">
              JPG, PNG or PDF — one file, up to 50 MB
            </p>
          </label>
        </div>
      )}
    </div>
  );
};

export default ComplaintSheetField;
