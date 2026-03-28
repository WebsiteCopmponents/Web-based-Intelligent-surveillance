"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Camera, StopCircle, RotateCcw, Check } from "lucide-react";

export default function WebcamCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

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
      setIsStreaming(true);
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
      console.error("Camera error:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    if (onCapture) {
      onCapture(dataUrl);
    }
  }, [onCapture]);

  const retake = useCallback(() => {
    setCapturedImage(null);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-700/50 aspect-video flex items-center justify-center">
        {capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${
                isStreaming ? "block" : "hidden"
              }`}
              muted
              playsInline
            />
            {!isStreaming && (
              <div className="text-center text-slate-500">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Camera not started</p>
              </div>
            )}
          </>
        )}
        {isStreaming && !capturedImage && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-500/90 text-white text-xs font-mono px-2 py-1 rounded">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {!isStreaming && !capturedImage && (
          <button
            onClick={startCamera}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Camera className="w-4 h-4" />
            Start Camera
          </button>
        )}

        {isStreaming && !capturedImage && (
          <>
            <button
              onClick={captureFrame}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Camera className="w-4 h-4" />
              Capture
            </button>
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              Stop
            </button>
          </>
        )}

        {capturedImage && (
          <>
            <button
              onClick={retake}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Retake
            </button>
            <div className="flex items-center gap-1.5 px-3 text-emerald-400 text-sm">
              <Check className="w-4 h-4" />
              Captured
            </div>
          </>
        )}
      </div>
    </div>
  );
}
