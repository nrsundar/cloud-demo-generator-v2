import React, { useState } from "react";

const HomePage = () => {
  const handleDownloadZip = async (repoId: number) => {
    try {
      const response = await fetch(`/api/repositories/${repoId}/zip`);
      if (!response.ok) throw new Error("Failed to download ZIP");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `repository-${repoId}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("ZIP download error:", error);
      alert("Could not download the ZIP file.");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Cloud Demo Generator</h1>
      <button onClick={() => handleDownloadZip(101)}>
        Download ZIP for Repository 101
      </button>
    </div>
  );
};

export default HomePage;