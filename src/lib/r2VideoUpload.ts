import { supabase } from "@/integrations/supabase/client";

interface UploadVideoToR2Options {
  file: File;
  title?: string;
  timeoutMs?: number;
  onProgress?: (progress: number) => void;
}

interface UploadVideoToR2Result {
  publicUrl: string;
  videoId: string;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Upload failed";
};

export const uploadVideoToR2 = async ({
  file,
  title,
  timeoutMs = 30 * 60 * 1000,
  onProgress,
}: UploadVideoToR2Options): Promise<UploadVideoToR2Result> => {
  let videoId: string | null = null;

  try {
    const { data, error } = await supabase.functions.invoke("get-r2-upload-url", {
      body: {
        filename: file.name,
        contentType: file.type,
        title: title || file.name,
      },
    });

    if (error || !data?.uploadUrl || !data?.videoId) {
      throw new Error(data?.error || error?.message || "Failed to start upload");
    }

    videoId = data.videoId;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("PUT", data.uploadUrl);
      xhr.timeout = timeoutMs;
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100);
          resolve();
          return;
        }

        reject(new Error(`Upload failed (HTTP ${xhr.status})`));
      };

      xhr.onerror = () => reject(new Error("Network error while uploading video"));
      xhr.ontimeout = () => reject(new Error("Upload timed out. Try a smaller file or a faster connection."));
      xhr.send(file);
    });

    const { data: confirmData, error: confirmError } = await supabase.functions.invoke("confirm-r2-upload", {
      body: {
        videoId,
        fileSizeBytes: file.size,
      },
    });

    if (confirmError || !confirmData?.publicUrl) {
      throw new Error(confirmData?.error || confirmError?.message || "Upload finished but confirmation failed");
    }

    return {
      videoId,
      publicUrl: confirmData.publicUrl,
    };
  } catch (error) {
    if (videoId) {
      try {
        await supabase.functions.invoke("confirm-r2-upload", {
          body: {
            videoId,
            failed: true,
            errorMessage: getErrorMessage(error),
          },
        });
      } catch {
        // best effort cleanup
      }
    }

    throw error;
  }
};