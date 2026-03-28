"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Square,
  Video,
  AlertCircle,
  Activity,
  User,
  Zap,
} from "lucide-react";
import EventBadge, { getBoxColor } from "../../components/EventBadge";
import {
  startDetection,
  stopDetection,
  processFrame,
} from "../../lib/api";

export default function MonitorPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [detectionLog, setDetectionLog] = useState([]);
  const [currentDetections, setCurrentDetections] = useState([]);
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const lastFrameTime = useRef(Date.now());

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
    } catch (err) {
      setError("Could not access camera. Check permissions.");
      console.error("Camera error:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, []);

  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

    try {
      const result = await processFrame(base64);
      const detections = Array.isArray(result) ? result : (result.detections || []);
      setCurrentDetections(detections);
      drawOverlay(detections, canvas.width, canvas.height);

      if (detections.length > 0) {
        const now = new Date();
        const logEntries = detections.map((d) => ({
          id: Date.now() + Math.random(),
          name: d.name || "Unknown",
          event_type: d.event_type || "unknown_person",
          confidence: d.confidence || 0,
          time: now.toLocaleTimeString(),
        }));
        setDetectionLog((prev) => [...logEntries, ...prev].slice(0, 100));
      }

      const now = Date.now();
      const delta = now - lastFrameTime.current;
      if (delta > 0) {
        setFps(Math.round(1000 / delta));
      }
      lastFrameTime.current = now;
      setFrameCount((c) => c + 1);
    } catch (err) {
      console.error("Frame processing error:", err);
    }
  }, []);

  function drawOverlay(detections, width, height) {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    overlay.width = width;
    overlay.height = height;
    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    detections.forEach((det) => {
      const box = det.bounding_box || det.bbox;
      if (!box) return;

      // Backend returns [top, right, bottom, left], convert to [x, y, w, h]
      let x, y, w, h;
      if (Array.isArray(box) && box.length === 4) {
        const [top, right, bottom, left] = box;
        x = left;
        y = top;
        w = right - left;
        h = bottom - top;
      } else {
        x = box.x; y = box.y; w = box.width; h = box.height;
      }

      const color = getBoxColor(det.event_type);

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Draw label background
      const label = `${det.name || "Unknown"} - ${(det.event_type || "").replace(/_/g, " ")}`;
      ctx.font = "bold 12px JetBrains Mono, monospace";
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 22, textWidth + 12, 22);

      // Draw label text
      ctx.fillStyle = "#000";
      ctx.fillText(label, x + 6, y - 6);

      // Draw corner accents
      const cornerSize = 10;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(x, y + cornerSize);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerSize, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + w - cornerSize, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cornerSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, y + h - cornerSize);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + cornerSize, y + h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + w - cornerSize, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - cornerSize);
      ctx.stroke();
    });
  }

  async function handleStartDetection() {
    if (!isCameraOn) {
      await startCamera();
    }
    try {
      await startDetection();
      setIsDetecting(true);
      intervalRef.current = setInterval(captureAndProcess, 1000);
    } catch (err) {
      console.error("Start detection error:", err);
      setError("Failed to start detection. Is the backend running?");
    }
  }

  function handleStopDetection() {
    setIsDetecting(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stopDetection().catch(() => {});
    setCurrentDetections([]);
    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext("2d");
      ctx.clearRect(
        0,
        0,
        overlayCanvasRef.current.width,
        overlayCanvasRef.current.height
      );
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      stopDetection().catch(() => {});
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Monitor</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time camera feed with AI-powered detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDetecting && (
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              DETECTING
            </div>
          )}
          {!isDetecting ? (
            <button
              onClick={handleStartDetection}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Detection
            </button>
          ) : (
            <button
              onClick={handleStopDetection}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop Detection
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Video Feed */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50 video-feed">
            <div className="aspect-video relative">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${
                  isCameraOn ? "block" : "hidden"
                }`}
                muted
                playsInline
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-slate-600">
                    <Video className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Camera feed inactive</p>
                    <p className="text-xs text-slate-700 mt-1">
                      Click &quot;Start Detection&quot; to begin
                    </p>
                  </div>
                </div>
              )}

              {/* HUD Overlay */}
              {isCameraOn && (
                <>
                  <div className="absolute top-3 left-3 flex items-center gap-3">
                    <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" />
                      {fps} FPS
                    </div>
                    <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-slate-400">
                      FRAMES: {frameCount}
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-slate-400">
                    {new Date().toLocaleTimeString()}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-slate-400">
                    CAM-01 | 640x480
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    {currentDetections.length} detected
                  </div>
                </>
              )}
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {/* Current Detections Summary */}
          {currentDetections.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {currentDetections.map((det, i) => (
                <div
                  key={i}
                  className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: getBoxColor(det.event_type) + "20",
                      color: getBoxColor(det.event_type),
                    }}
                  >
                    {(det.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">
                      {det.name || "Unknown"}
                    </p>
                    <p
                      className="text-[10px] font-mono"
                      style={{ color: getBoxColor(det.event_type) }}
                    >
                      {(det.event_type || "").replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detection Log Sidebar */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Detection Log
          </h3>
          <div className="space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto">
            {detectionLog.length === 0 && (
              <p className="text-slate-500 text-xs text-center py-8 font-mono">
                No detections yet
              </p>
            )}
            {detectionLog.map((entry) => (
              <div
                key={entry.id}
                className="p-2 bg-slate-900/50 rounded-lg border border-slate-700/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white truncate">
                    {entry.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {entry.time}
                  </span>
                </div>
                <div className="mt-1">
                  <EventBadge type={entry.event_type} />
                </div>
                {entry.confidence > 0 && (
                  <div className="mt-1.5 w-full bg-slate-700 rounded-full h-1">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${entry.confidence * 100}%`,
                        backgroundColor: getBoxColor(entry.event_type),
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
