import React, { useState, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";
import "./ImageUploadControl.css";

interface ImageUploadControlProps {
  currentImageUrl: string;
  onImageChange: (url: string) => void;
  folder?: string;
  label?: string;
}

export default function ImageUploadControl({
  currentImageUrl,
  onImageChange,
  folder = "catalog",
  label = "Product Image",
}: ImageUploadControlProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // 1. Validate file format
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const validExts = [".jpg", ".jpeg", ".png", ".webp"];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExts.some((ext) => lowerName.endsWith(ext));

    if (!validTypes.includes(file.type) && !hasValidExt) {
      setErrorMessage("Invalid file format. Please upload a JPG, PNG, or WEBP image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage("Image size exceeds the 5MB limit. Please select a smaller file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 3. Upload to Firebase Storage
    setIsUploading(true);
    setUploadProgress(15);

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${folder}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        }
      },
      (uploadError) => {
        console.error("Firebase Storage upload notice:", uploadError);
        setIsUploading(false);
        setErrorMessage(
          "Direct cloud upload failed: " +
            (uploadError.message || "Please check connection, or switch to 'Enter URL' mode.")
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          onImageChange(downloadUrl);
          setIsUploading(false);
          setUploadProgress(100);
          setErrorMessage(null);
        } catch (urlError) {
          console.error("Failed to retrieve image download URL:", urlError);
          setIsUploading(false);
          setErrorMessage("Failed to retrieve image URL.");
        }
      }
    );
  };

  const handleRemoveImage = () => {
    onImageChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="image-upload-control">
      <div className="image-upload-header">
        <label className="image-upload-label">{label} *</label>
        <button
          type="button"
          className="image-upload-toggle-manual"
          onClick={() => setManualMode(!manualMode)}
        >
          {manualMode ? "← Use Direct File Upload" : "Or Paste Image URL"}
        </button>
      </div>

      {manualMode ? (
        <div className="image-upload-manual-box">
          <input
            type="text"
            className="image-upload-url-input"
            placeholder="https://example.com/item.webp"
            value={currentImageUrl || ""}
            onChange={(e) => onImageChange(e.target.value)}
          />
        </div>
      ) : (
        <div className="image-upload-box">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
          />

          <div className="image-upload-preview-area">
            {currentImageUrl ? (
              <div className="image-upload-existing-box">
                <div className="image-upload-preview-wrapper">
                  <img src={currentImageUrl} alt="Product Preview" className="image-upload-preview-img" />
                </div>
                <div className="image-upload-actions-row">
                  <button
                    type="button"
                    className="image-upload-btn-action-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? "UPLOADING..." : "UPLOAD NEW IMAGE"}
                  </button>
                  <button
                    type="button"
                    className="image-upload-btn-action-secondary"
                    onClick={handleRemoveImage}
                    disabled={isUploading}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="image-upload-placeholder"
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <div className="image-upload-icon">📷</div>
                <div className="image-upload-prompt">
                  <strong>Select image from computer</strong>
                  <span>Supports JPG, PNG, or WEBP (Max 5MB)</span>
                </div>
                <button
                  type="button"
                  className="image-upload-btn-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                >
                  UPLOAD IMAGE
                </button>
              </div>
            )}
          </div>

          {isUploading && (
            <div className="image-upload-progress-bar-wrap">
              <div className="image-upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
              <span className="image-upload-progress-text">Uploading image... {uploadProgress}%</span>
            </div>
          )}
        </div>
      )}

      {errorMessage && <div className="image-upload-error">{errorMessage}</div>}
    </div>
  );
}
