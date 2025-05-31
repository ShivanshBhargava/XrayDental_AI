import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload } from "@fortawesome/free-solid-svg-icons";
import * as cornerstone from "cornerstone-core";
import * as cornerstoneMath from "cornerstone-math";
import * as cornerstoneTools from "cornerstone-tools";
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import * as dicomParser from "dicom-parser";
import Hammer from "hammerjs";

// Constants
const CANVAS_DEFAULT_SIZE = 512;
const ROBOFLOW_INPUT_SIZE = 640;
const ROBOFLOW_API_URL = "https://detect.roboflow.com/adr/6";
const ROBOFLOW_API_KEY = "NXGxnurQhkrzXtrff5Zv";

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5
};

// Colors for different confidence levels
const COLORS = {
  HIGH: "#00ff00",
  MEDIUM: "#ffff00",
  LOW: "#ff0000"
};

// Setup cornerstone-tools external dependencies
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.init({ showSVGCursors: false });

// Configure WADO Image Loader
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneWADOImageLoader.webWorkerManager.initialize({
  maxWebWorkers: navigator.hardwareConcurrency || 1,
  startWebWorkersOnDemand: true,
  taskConfiguration: {
    decodeTask: {
      initializeCodecsOnStartup: true,
      usePDFJS: false,
      strict: false,
    },
  },
});

export default function Front() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [detectionResults, setDetectionResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const imageRef = useRef(null);
  const originalImageRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  useEffect(() => {
    if (imageRef.current) cornerstone.enable(imageRef.current);
    return () => {
      if (imageRef.current) cornerstone.disable(imageRef.current);
    };
  }, []);

  const clearCanvas = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return COLORS.HIGH;
    if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return COLORS.MEDIUM;
    return COLORS.LOW;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSelectedFile(file);
      setError(null);
      setDetectionResults(null);
      clearCanvas();

      const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
      const image = await cornerstone.loadImage(imageId);
      originalImageRef.current = image;

      if (imageRef.current) {
        cornerstone.displayImage(imageRef.current, image);
      }
    } catch (err) {
      console.error("Error loading DICOM file:", err);
      setError("Error loading DICOM file. Please make sure it is a valid DICOM file.");
    }
  };

  const drawBoundingBoxes = (predictions) => {
    if (!overlayCanvasRef.current || !predictions?.length) return;
    if (!imageRef.current || !originalImageRef.current) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext("2d");

    const viewport = cornerstone.getViewport(imageRef.current);
    if (!viewport) return;

    const displayWidth = imageRef.current.clientWidth || CANVAS_DEFAULT_SIZE;
    const displayHeight = imageRef.current.clientHeight || CANVAS_DEFAULT_SIZE;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = displayWidth / ROBOFLOW_INPUT_SIZE;
    const scaleY = displayHeight / ROBOFLOW_INPUT_SIZE;

    predictions.forEach(({ x, y, width, height, class: label, confidence }) => {
      const color = getConfidenceColor(confidence);

      const boxWidth = width * scaleX;
      const boxHeight = height * scaleY;
      const topLeftX = (x - width / 2) * scaleX;
      const topLeftY = (y - height / 2) * scaleY;

      ctx.fillStyle = color + "33";
      ctx.fillRect(topLeftX, topLeftY, boxWidth, boxHeight);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(topLeftX, topLeftY, boxWidth, boxHeight);

      const cornerLength = Math.min(boxWidth, boxHeight) * 0.1;
      ctx.beginPath();
      ctx.moveTo(topLeftX, topLeftY + cornerLength);
      ctx.lineTo(topLeftX, topLeftY);
      ctx.lineTo(topLeftX + cornerLength, topLeftY);
      ctx.moveTo(topLeftX + boxWidth - cornerLength, topLeftY);
      ctx.lineTo(topLeftX + boxWidth, topLeftY);
      ctx.lineTo(topLeftX + boxWidth, topLeftY + cornerLength);
      ctx.moveTo(topLeftX + boxWidth, topLeftY + boxHeight - cornerLength);
      ctx.lineTo(topLeftX + boxWidth, topLeftY + boxHeight);
      ctx.lineTo(topLeftX + boxWidth - cornerLength, topLeftY + boxHeight);
      ctx.moveTo(topLeftX + cornerLength, topLeftY + boxHeight);
      ctx.lineTo(topLeftX, topLeftY + boxHeight);
      ctx.lineTo(topLeftX, topLeftY + boxHeight - cornerLength);
      ctx.stroke();

      const labelText = `${label} (${(confidence * 100).toFixed(1)}%)`;
      ctx.font = "bold 14px Arial";
      const textWidth = ctx.measureText(labelText).width;
      const textHeight = 18;
      const padding = 4;

      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(topLeftX, topLeftY - textHeight - padding, textWidth + 2 * padding, textHeight + padding);
      ctx.fillStyle = color;
      ctx.fillText(labelText, topLeftX + padding, topLeftY - padding);
    });
  };

  const handleSendToRoboflow = async () => {
    if (!imageRef.current || !selectedFile) return;

    try {
      setIsAnalyzing(true);
      setError(null);

      const canvas = imageRef.current.querySelector("canvas");
      if (!canvas) {
        throw new Error("No image canvas found to capture.");
      }

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const formData = new FormData();
      formData.append("file", blob, "dicom.png");

      const response = await fetch(
        `${ROBOFLOW_API_URL}?api_key=${ROBOFLOW_API_KEY}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Roboflow API error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Roboflow Prediction Result:", result);

      if (result?.predictions?.length) {
        setDetectionResults(result.predictions);
        drawBoundingBoxes(result.predictions);
      } else {
        setDetectionResults(null);
        setError("No objects detected in the image.");
        clearCanvas();
      }
    } catch (err) {
      console.error("Failed to send image to Roboflow:", err);
      setError(err.message || "Prediction failed. Please try again.");
      clearCanvas();
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100vw", gap: "20px", padding: "1rem" }}>
      <div style={{ display: "flex", gap: "10px" }}>
        <input type="file" id="actual-btn" hidden accept=".dcm" onChange={handleFileChange} />
        <label htmlFor="actual-btn" style={{ backgroundColor: "teal", color: "white", padding: "0.7rem", fontFamily: "sans-serif", borderRadius: "0.5rem", cursor: "pointer", marginTop: "0.5rem", userSelect: "none" }}>
          <FontAwesomeIcon icon={faUpload} /> Upload DICOM File
        </label>
      </div>

      {error && (
        <div style={{ color: "red", marginTop: "10px", maxWidth: CANVAS_DEFAULT_SIZE, textAlign: "center" }}>
          {error}
        </div>
      )}

      {detectionResults && (
        <div style={{ marginTop: "10px", maxWidth: CANVAS_DEFAULT_SIZE }}>
          <h3>Detection Results:</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {detectionResults.map((result, idx) => (
              <li key={idx} style={{ margin: "5px 0" }}>
                {result.class}: {Math.round(result.confidence * 100)}% confidence
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ position: "relative", width: CANVAS_DEFAULT_SIZE, height: CANVAS_DEFAULT_SIZE, border: "1px solid #ccc", borderRadius: 8, backgroundColor: "#000", userSelect: "none" }}>
        <div ref={imageRef} style={{ width: "100%", height: "100%", pointerEvents: "none" }} />
        <canvas ref={overlayCanvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
      </div>

      <button
        onClick={handleSendToRoboflow}
        disabled={!selectedFile || isAnalyzing}
        style={{
          marginTop: "1rem",
          padding: "0.7rem 1.2rem",
          backgroundColor: selectedFile ? "teal" : "#888",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: selectedFile ? "pointer" : "not-allowed",
          transition: "background-color 0.3s",
        }}
      >
        {isAnalyzing ? "Analyzing..." : "Analyze"}
      </button>
    </div>
  );
}
