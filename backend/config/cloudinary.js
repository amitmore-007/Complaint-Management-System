import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (file, folder = "cms-complaints") => {
  try {
    // Handle buffer uploads (from memory storage)
    if (file?.buffer) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            resource_type: "auto",
            transformation: [
              { width: 1920, height: 1920, crop: "limit" }, // Limit size
              { quality: "auto:low", fetch_format: "auto" }, // Faster processing
            ],
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(new Error("Failed to upload image"));
            } else {
              resolve({
                publicId: result.public_id,
                url: result.secure_url,
                originalName: file.originalname,
              });
            }
          }
        );
        uploadStream.end(file.buffer);
      });
    }

    // Legacy support for file path uploads (if needed)
    const filePath = typeof file === "string" ? file : file?.path;
    if (!filePath) {
      throw new Error("Missing required parameter - file");
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: "auto",
      transformation: [
        { width: 1920, height: 1920, crop: "limit" },
        { quality: "auto:low", fetch_format: "auto" },
      ],
    });

    return {
      publicId: result.public_id,
      url: result.secure_url,
      originalName: typeof file === "object" ? file?.originalname : undefined,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image");
  }
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
  }
};

export default cloudinary;
