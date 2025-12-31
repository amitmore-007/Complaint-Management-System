import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import {
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  Save,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { STORE_OPTIONS } from "../../utils/storeOptions";
import StoreDropdown from "../../components/common/StoreDropdown";
import { useCreateAdminComplaint } from "../../hooks/useComplaints";

const CreateComplaint = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const createComplaintMutation = useCreateAdminComplaint();
  const isSubmitting = createComplaintMutation.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm();

  const selectedLocation = watch("location");

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (photos.length + acceptedFiles.length > 5) {
        toast.error("Maximum 5 photos allowed");
        return;
      }

      const newPhotos = acceptedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substr(2, 9),
      }));

      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [photos]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: true,
  });

  const removePhoto = (id) => {
    setPhotos((prev) => {
      const updated = prev.filter((photo) => photo.id !== id);
      const photoToRemove = prev.find((photo) => photo.id === id);
      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.preview);
      }
      return updated;
    });
  };

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("location", data.location);
      formData.append("priority", data.priority);

      // Append photos
      photos.forEach((photo) => {
        formData.append("photos", photo.file);
      });

      await createComplaintMutation.mutateAsync(formData);

      toast.success("Complaint created successfully!");

      // Clean up object URLs
      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));

      navigate("/admin/complaints");
    } catch (error) {
      console.error("Error creating complaint:", error);
      toast.error(
        error.response?.data?.message || "Failed to create complaint"
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center space-x-2 mb-4 text-sm ${
              isDarkMode
                ? "text-gray-400 hover:text-white"
                : "text-gray-600 hover:text-gray-900"
            } transition-colors`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <h1
            className={`text-3xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Create New Complaint
          </h1>
          <p
            className={`mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            Fill out the form below to submit a complaint
          </p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-8 rounded-2xl shadow-lg border ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Complaint Title *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register("title", { required: "Title is required" })}
                  type="text"
                  placeholder="Brief description of the issue"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl transition-all duration-200 ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  }`}
                />
              </div>
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Description *
              </label>
              <textarea
                {...register("description", {
                  required: "Description is required",
                })}
                rows={4}
                placeholder="Provide detailed information about the issue..."
                className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 resize-none ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Store */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Store Name *
              </label>
              <input
                type="hidden"
                {...register("location", {
                  required: "Store selection is required",
                })}
              />
              <StoreDropdown
                isDarkMode={isDarkMode}
                options={STORE_OPTIONS}
                value={selectedLocation}
                onChange={(name) =>
                  setValue("location", name, { shouldValidate: true })
                }
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.location.message}
                </p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Priority
              </label>
              <div className="relative">
                <AlertTriangle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  {...register("priority")}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl transition-all duration-200 ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  }`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Photos */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Photos (Optional)
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : isDarkMode
                    ? "border-gray-600 hover:border-gray-500 bg-gray-700/50"
                    : "border-gray-300 hover:border-gray-400 bg-gray-50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload
                  className={`h-8 w-8 mx-auto mb-3 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                />
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {isDragActive
                    ? "Drop the files here..."
                    : "Drag & drop images here, or click to select"}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    isDarkMode ? "text-gray-500" : "text-gray-500"
                  }`}
                >
                  PNG, JPG, GIF up to 5MB each
                </p>
              </div>

              {/* Photo Previews */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {photos.map((photo) => (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                      <img
                        src={photo.preview}
                        alt="Preview"
                        className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={() => navigate("/admin/dashboard")}
                className={`flex-1 py-3 px-4 border rounded-xl font-semibold transition-all duration-200 ${
                  isDarkMode
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Cancel
              </button>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Submit Complaint</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default CreateComplaint;
