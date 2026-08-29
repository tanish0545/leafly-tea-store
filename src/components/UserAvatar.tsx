import { useState } from "react";
import "./UserAvatar.css";

interface UserAvatarProps {
  photoURL?: string | null;
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  showBorder?: boolean;
}

export default function UserAvatar({
  photoURL,
  name,
  email,
  size = "md",
  className = "",
  showBorder = true,
}: UserAvatarProps) {
  const [prevPhotoURL, setPrevPhotoURL] = useState(photoURL);
  const [imgError, setImgError] = useState(false);

  if (prevPhotoURL !== photoURL) {
    setPrevPhotoURL(photoURL);
    setImgError(false);
  }

  const initials = (() => {
    const raw = (name || email || "LU").trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (raw.slice(0, 2) || "LU").toUpperCase();
  })();

  const sizeClass = typeof size === "string" ? `leafly-user-avatar-${size}` : "";
  const customStyle =
    typeof size === "number"
      ? { width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` }
      : undefined;

  return (
    <div
      className={`leafly-user-avatar ${sizeClass} ${showBorder ? "has-border" : ""} ${className}`}
      style={customStyle}
      aria-label={name || "User profile"}
    >
      {photoURL && !imgError ? (
        <img
          src={photoURL}
          alt={name || "Profile"}
          className="leafly-user-avatar-img"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="leafly-user-avatar-fallback" aria-label={`Avatar initials: ${initials}`}>
          {size === "xl" || size === "lg" ? (
            <span className="leafly-user-avatar-initials">{initials}</span>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="leafly-user-avatar-icon"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c.8-3.5 3.2-5.5 7-5.5s6.2 2 7 5.5" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
