import React from "react";

function toEmbedUrl(youtubeUrl, autoplay) {
  if (!youtubeUrl) return null;
  let id = null;
  try {
    const url = new URL(youtubeUrl);
    id = url.searchParams.get("v") || url.pathname.split("/").pop();
  } catch {
    id = youtubeUrl;
  }
  return `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&rel=0`;
}

export default function VideoPlayer({ youtubeUrl, autoplay = false, square = true }) {
  const embedUrl = toEmbedUrl(youtubeUrl, autoplay);
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: square ? "1 / 1" : "16 / 9",
        background: "#000",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        border: "1px solid var(--border-color)",
      }}
    >
      {embedUrl ? (
        <iframe
          key={embedUrl}
          src={embedUrl}
          title="Video question"
          style={{ width: "100%", height: "100%", border: "none" }}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
          No video selected
        </div>
      )}
    </div>
  );
}
