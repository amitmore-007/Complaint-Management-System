import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

/**
 * PDFs (the signed complaint sheet) live in a private S3 bucket rather than
 * Cloudinary, which refuses to deliver PDFs on default account settings.
 * Nothing in the bucket is public: readers get a short-lived signed URL.
 */
let client = null;
const getClient = () => {
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION,
      // Retry against the bucket's real region if AWS_REGION is off.
      followRegionRedirects: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
};

const bucket = () => process.env.AWS_BUCKET_NAME;

// The bucket is shared with other projects; everything this app writes stays
// under this top-level folder.
const ROOT_FOLDER = "cms";

export const uploadToS3 = async (file, folder = "complaint-sheets") => {
  if (!file?.buffer) {
    throw new Error("Missing required parameter - file buffer");
  }

  const ext = file.mimetype === "application/pdf" ? ".pdf" : "";
  const key = `${ROOT_FOLDER}/${folder}/${Date.now()}-${crypto.randomUUID()}${ext}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return { key, originalName: file.originalname, mimeType: file.mimetype };
};

/** Signed GET that the browser renders inline (not as a download). */
export const getS3ViewUrl = (key, { expiresIn = 600, contentType } = {}) =>
  getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: "inline",
      ...(contentType ? { ResponseContentType: contentType } : {}),
    }),
    { expiresIn }
  );

export const deleteFromS3 = async (key) => {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: bucket(), Key: key })
    );
  } catch (error) {
    console.error("S3 delete error:", error);
  }
};
