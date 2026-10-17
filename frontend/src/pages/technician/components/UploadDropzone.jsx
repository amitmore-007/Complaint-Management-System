/** Field label with a required marker, or an "Optional" tag, and a right-aligned count. */
export const FieldLabel = ({ children, required, optional, meta, isDarkMode }) => (
  <div className="flex items-center justify-between gap-2 mb-2">
    <span
      className={`text-sm font-medium ${
        isDarkMode ? "text-gray-200" : "text-gray-800"
      }`}
    >
      {children}
      {required && <span className="text-red-500"> *</span>}
      {optional && (
        <span
          className={`ml-2 px-1.5 py-0.5 rounded text-[11px] font-normal align-middle ${
            isDarkMode ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-500"
          }`}
        >
          Optional
        </span>
      )}
    </span>
    {meta && (
      <span
        className={`text-xs tabular-nums ${
          isDarkMode ? "text-gray-500" : "text-gray-500"
        }`}
      >
        {meta}
      </span>
    )}
  </div>
);

/**
 * Compact tap target for picking files. The whole box is the <label>, so a tap
 * anywhere opens the picker (the old version only reacted on the text).
 */
const UploadDropzone = ({
  id,
  icon: Icon,
  title,
  hint,
  accept,
  multiple = false,
  disabled = false,
  onChange,
  isDarkMode,
}) => (
  <label
    htmlFor={id}
    className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 border-dashed transition-colors ${
      disabled
        ? "opacity-50 cursor-not-allowed"
        : isDarkMode
          ? "cursor-pointer border-white/10 hover:border-white/25 active:bg-white/5"
          : "cursor-pointer border-gray-300 hover:border-gray-400 active:bg-gray-50"
    } ${disabled ? (isDarkMode ? "border-white/10" : "border-gray-300") : ""}`}
  >
    <input
      type="file"
      id={id}
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      onChange={(e) => {
        onChange(e);
        // Allow picking the same file again after removing it.
        e.target.value = "";
      }}
      className="hidden"
    />
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
        isDarkMode ? "bg-white/5 text-gray-300" : "bg-gray-100 text-gray-600"
      }`}
    >
      <Icon className="h-5 w-5" />
    </span>
    <span className="min-w-0">
      <span
        className={`block text-sm font-medium ${
          isDarkMode ? "text-gray-200" : "text-gray-800"
        }`}
      >
        {title}
      </span>
      <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>
    </span>
  </label>
);

export default UploadDropzone;
