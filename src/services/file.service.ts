import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { Capacitor } from "@capacitor/core";

export interface FileResult {
  path: string;
  name: string;
  base64?: string;
  preview?: string;
  mimeType?: string;
  size?: number;
}

export class FileService {
  // Ensure directories exist before saving files
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: dirPath,
        directory: Directory.Data,
        recursive: true,
      });
      console.log(`Directory ${dirPath} created or already exists`);
    } catch (error) {
      console.log(`Directory ${dirPath} might already exist:`, error);
      // Directory might already exist, which is fine
    }
  }

  async pickImage(): Promise<FileResult | null> {
    try {
      console.log("[FileService] Starting image picker...");

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      });

      console.log("[FileService] Image picker result:", image);

      if (image.webPath || image.path) {
        const fileName = `img_${Date.now()}.jpg`;
        return await this.processImageFile(image, fileName);
      }
      return null;
    } catch (error) {
      console.error("Error picking image:", error);
      return null;
    }
  }

  async takePhoto(): Promise<FileResult | null> {
    try {
      console.log("[FileService] Starting photo capture...");

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: true,
      });

      console.log("[FileService] Photo capture result:", image);

      if (image.webPath || image.path) {
        const fileName = `photo_${Date.now()}.jpg`;
        return await this.processImageFile(image, fileName);
      }
      return null;
    } catch (error) {
      console.error("Error taking photo:", error);

      // Fallback: try with base64 result type
      try {
        console.log("[FileService] Trying fallback method with base64...");
        const fallbackImage = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
          saveToGallery: true,
        });

        if (fallbackImage.base64String) {
          const fileName = `photo_${Date.now()}.jpg`;
          await this.ensureDirectoryExists("uploads");

          const savedFile = await Filesystem.writeFile({
            path: `uploads/${fileName}`,
            data: fallbackImage.base64String,
            directory: Directory.Data,
          });

          const preview = `data:image/jpeg;base64,${fallbackImage.base64String}`;

          return {
            path: savedFile.uri,
            name: fileName,
            base64: fallbackImage.base64String,
            preview: preview,
            mimeType: "image/jpeg",
            size: fallbackImage.base64String.length,
          };
        }
      } catch (fallbackError) {
        console.error("Fallback method also failed:", fallbackError);
      }

      return null;
    }
  }

  private async processImageFile(
    image: any,
    fileName: string
  ): Promise<FileResult | null> {
    try {
      await this.ensureDirectoryExists("uploads");

      let base64Data = "";
      let filePath = "";

      if (Capacitor.getPlatform() === "web") {
        // Web platform handling
        if (image.webPath) {
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          base64Data = await this.convertBlobToBase64(blob);

          const savedFile = await Filesystem.writeFile({
            path: `uploads/${fileName}`,
            data: base64Data,
            directory: Directory.Data,
          });

          filePath = savedFile.uri;
        }
      } else {
        // Mobile platform handling
        const photoPath = image.webPath || image.path;

        try {
          // Try to read the file directly
          const fileContent = await Filesystem.readFile({
            path: photoPath,
          });

          base64Data =
            typeof fileContent.data === "string" ? fileContent.data : "";
        } catch (readError) {
          console.warn(
            "[FileService] Direct file read failed, trying Capacitor conversion:",
            readError
          );

          try {
            // Convert the file URI and try to fetch it
            const convertedUri = Capacitor.convertFileSrc(photoPath);
            const response = await fetch(convertedUri);
            const blob = await response.blob();
            base64Data = await this.convertBlobToBase64(blob);
          } catch (convertError) {
            console.error(
              "[FileService] All conversion methods failed:",
              convertError
            );
            throw convertError;
          }
        }

        if (base64Data) {
          const savedFile = await Filesystem.writeFile({
            path: `uploads/${fileName}`,
            data: base64Data,
            directory: Directory.Data,
          });

          filePath = savedFile.uri;
        }
      }

      if (base64Data && filePath) {
        const preview = `data:image/jpeg;base64,${base64Data}`;

        console.log(
          "[FileService] File processed successfully, base64 size:",
          base64Data.length
        );

        return {
          path: filePath,
          name: fileName,
          base64: base64Data,
          preview: preview,
          mimeType: "image/jpeg",
          size: base64Data.length,
        };
      }

      return null;
    } catch (error) {
      console.error("[FileService] Error processing image file:", error);
      throw error;
    }
  }

  async pickPDF(): Promise<FileResult | null> {
    try {
      console.log("[FileService] Starting PDF picker...");

      const result = await FilePicker.pickFiles({
        types: ["application/pdf"],
        limit: 1,
        readData: true,
      });

      console.log("[FileService] PDF picker result:", result);

      if (result.files.length > 0) {
        const file = result.files[0];
        const fileName = file.name || `pdf_${Date.now()}.pdf`;

        await this.ensureDirectoryExists("documents");

        const savedFile = await Filesystem.writeFile({
          path: `documents/${fileName}`,
          data: file.data!,
          directory: Directory.Data,
        });

        console.log("[FileService] PDF saved successfully:", savedFile.uri);

        return {
          path: savedFile.uri,
          name: fileName,
          base64: file.data,
          mimeType: "application/pdf",
          size: file.data?.length || 0,
        };
      }

      console.log("[FileService] No PDF file selected");
      return null;
    } catch (error) {
      console.error("Error picking PDF:", error);
      return null;
    }
  }

  private async saveFile(webPath: string, fileName: string): Promise<string> {
    try {
      console.log("[FileService] Saving file:", { webPath, fileName });

      const response = await fetch(webPath);
      const blob = await response.blob();
      const base64Data = await this.convertBlobToBase64(blob);

      console.log(
        "[FileService] File converted to base64, size:",
        base64Data.length
      );

      const savedFile = await Filesystem.writeFile({
        path: `uploads/${fileName}`,
        data: base64Data,
        directory: Directory.Data,
      });

      console.log("[FileService] File saved successfully:", savedFile.uri);
      return savedFile.uri;
    } catch (error) {
      console.error("Error saving file:", error);
      throw error;
    }
  }

  private convertBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(",")[1]); // Remove data:image/jpeg;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // New method to get file preview
  async getFilePreview(
    fileName: string,
    fileType: "image" | "pdf"
  ): Promise<string | null> {
    try {
      const directory = fileType === "pdf" ? "documents" : "uploads";

      const fileContent = await Filesystem.readFile({
        path: `${directory}/${fileName}`,
        directory: Directory.Data,
      });

      const base64Data =
        typeof fileContent.data === "string" ? fileContent.data : "";

      if (fileType === "image") {
        return `data:image/jpeg;base64,${base64Data}`;
      } else {
        return `data:application/pdf;base64,${base64Data}`;
      }
    } catch (error) {
      console.error("[FileService] Error getting file preview:", error);
      return null;
    }
  }

  // Method to get file as base64 for database storage
  async getFileAsBase64(
    fileName: string,
    fileType: "image" | "pdf"
  ): Promise<string | null> {
    try {
      const directory = fileType === "pdf" ? "documents" : "uploads";

      const fileContent = await Filesystem.readFile({
        path: `${directory}/${fileName}`,
        directory: Directory.Data,
      });

      return typeof fileContent.data === "string" ? fileContent.data : null;
    } catch (error) {
      console.error("[FileService] Error getting file base64:", error);
      return null;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const pathParts = filePath.split("/");
      const fileName = pathParts[pathParts.length - 1];
      let directory = "uploads";

      if (filePath.includes("documents")) {
        directory = "documents";
      }

      await Filesystem.deleteFile({
        path: `${directory}/${fileName}`,
        directory: Directory.Data,
      });

      console.log("[FileService] File deleted successfully:", filePath);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  }

  async getSecureFilePath(
    fileName: string,
    fileType: "image" | "pdf"
  ): Promise<string | null> {
    try {
      const directory = fileType === "pdf" ? "documents" : "uploads";
      const fileStat = await Filesystem.stat({
        path: `${directory}/${fileName}`,
        directory: Directory.Data,
      });
      return fileStat.uri;
    } catch (error) {
      console.error("Error getting file path:", error);
      return null;
    }
  }

  async listSecureFiles(): Promise<{ images: string[]; pdfs: string[] }> {
    try {
      const images: string[] = [];
      const pdfs: string[] = [];

      try {
        const uploadsDir = await Filesystem.readdir({
          path: "uploads",
          directory: Directory.Data,
        });
        images.push(...uploadsDir.files.map((f) => f.name));
      } catch (error) {
        console.log("Uploads directory might not exist yet");
      }

      try {
        const documentsDir = await Filesystem.readdir({
          path: "documents",
          directory: Directory.Data,
        });
        pdfs.push(...documentsDir.files.map((f) => f.name));
      } catch (error) {
        console.log("Documents directory might not exist yet");
      }

      return { images, pdfs };
    } catch (error) {
      console.error("Error listing files:", error);
      return { images: [], pdfs: [] };
    }
  }

  async checkPermissions(): Promise<{ camera: boolean; storage: boolean }> {
    try {
      const cameraPermissions = await Camera.checkPermissions();

      return {
        camera: cameraPermissions.camera === "granted",
        storage: true,
      };
    } catch (error) {
      console.error("Error checking permissions:", error);
      return { camera: false, storage: false };
    }
  }

  async requestPermissions(): Promise<{ camera: boolean; storage: boolean }> {
    try {
      const cameraPermissions = await Camera.requestPermissions();

      return {
        camera: cameraPermissions.camera === "granted",
        storage: true,
      };
    } catch (error) {
      console.error("Error requesting permissions:", error);
      return { camera: false, storage: false };
    }
  }
}

export const fileService = new FileService();
