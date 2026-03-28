"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  UserPlus,
  Upload,
  CheckCircle2,
  XCircle,
  Camera,
  Loader2,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ScanFace,
  ShieldCheck,
  RotateCcw,
  StopCircle,
  Sparkles,
  AlertTriangle,
  Eye,
  ImagePlus,
} from "lucide-react";
import { registerUser, uploadFace } from "../../lib/api";

const STEPS = [
  { id: 1, label: "Student Info", icon: UserPlus },
  { id: 2, label: "Capture Face", icon: ScanFace },
  { id: 3, label: "Confirm & Register", icon: ShieldCheck },
];

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({ name: "", student_id: "", email: "" });
  const [registeredUser, setRegisteredUser] = useState(null);
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [faceStatus, setFaceStatus] = useState(null);
  const fileInputRef = useRef(null);

  // Webcam state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [faceDetectHint, setFaceDetectHint] = useState(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // ── Step 1: Register student ──
  async function handleRegister(e) {
    e.preventDefault();
    setStatus(null);
    try {
      const user = await registerUser(form);
      setRegisteredUser(user);
      setStatus({
        type: "success",
        message: `Student "${user.name}" registered successfully!`,
      });
      setCurrentStep(2);
    } catch (err) {
      const msg =
        err.response?.data?.detail || err.message || "Registration failed";
      setStatus({ type: "error", message: msg });
    }
  }

  // ── Step 2: Camera ──
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
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
      setFaceDetectHint("Position your face in the center of the frame");
    } catch (err) {
      setCameraError("Could not access camera. Please check permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
    setFaceDetectHint(null);
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
    setCapturedPreview(dataUrl);
    setFaceDetectHint(null);
  }, []);

  function confirmCapture() {
    if (capturedPreview) {
      if (images.length >= 5) {
        setFaceDetectHint("Maximum 5 images allowed. Remove one to add more.");
        return;
      }
      setImages((prev) => [...prev, { type: "webcam", data: capturedPreview }]);
      setCapturedPreview(null);
      setFaceDetectHint(
        `Image ${images.length + 1} added! Capture more angles for better accuracy.`
      );
    }
  }

  function retakeCapture() {
    setCapturedPreview(null);
    setFaceDetectHint("Position your face and capture again");
  }

  function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      setFaceDetectHint("Maximum 5 images allowed.");
      e.target.value = "";
      return;
    }
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages((prev) => [
          ...prev,
          { type: "file", data: ev.target.result, file },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Step 3: Upload faces ──
  async function handleUploadFaces() {
    if (!registeredUser || images.length === 0) return;
    setUploading(true);
    setFaceStatus(null);
    try {
      const files = await Promise.all(
        images.map(async (img) => {
          if (img.file) return img.file;
          const response = await fetch(img.data);
          const blob = await response.blob();
          return new File([blob], `face_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
        })
      );
      const result = await uploadFace(registeredUser.id, files);
      setFaceStatus({
        type: "success",
        message:
          result.message || "Face registered successfully!",
        encodings: result.total_encodings,
      });
    } catch (err) {
      const msg =
        err.response?.data?.detail || err.message || "Face upload failed";
      setFaceStatus({ type: "error", message: msg });
    } finally {
      setUploading(false);
    }
  }

  function resetAll() {
    stopCamera();
    setCurrentStep(1);
    setRegisteredUser(null);
    setImages([]);
    setStatus(null);
    setFaceStatus(null);
    setCapturedPreview(null);
    setForm({ name: "", student_id: "", email: "" });
  }

  function getQualityTips() {
    const tips = [];
    if (images.length === 0) tips.push("Capture at least 1 face image");
    if (images.length < 3) tips.push("3-5 images recommended for best accuracy");
    if (images.length > 0 && images.length < 3) tips.push("Try different angles: front, slight left, slight right");
    return tips;
  }

  const isStep1Valid = form.name && form.student_id && form.email;
  const isStep2Valid = images.length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Student Registration</h1>
        <p className="text-sm text-slate-400 mt-1">
          Register students with face recognition for automated attendance &amp; monitoring
        </p>
      </div>

      {/* Step Progress Bar */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isFinalCompleted = step.id === 3 && faceStatus?.type === "success";

            return (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isFinalCompleted
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                        : isCompleted
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : isActive
                        ? "bg-emerald-500/10 text-emerald-400 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
                        : "bg-slate-700/50 text-slate-500 border border-slate-600/50"
                    }`}
                  >
                    {isCompleted || isFinalCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <p
                      className={`text-xs font-mono ${
                        isActive
                          ? "text-emerald-400"
                          : isCompleted
                          ? "text-emerald-400/70"
                          : "text-slate-500"
                      }`}
                    >
                      STEP {step.id}
                    </p>
                    <p
                      className={`text-sm font-medium ${
                        isActive ? "text-white" : isCompleted ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="flex-1 mx-4 h-px relative">
                    <div className="absolute inset-0 bg-slate-700/50" />
                    <div
                      className={`absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-500 ${
                        isCompleted ? "w-full" : "w-0"
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ═══════════ STEP 1: Student Information ═══════════ */}
      {currentStep === 1 && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 animate-fadeIn">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Student Information</h3>
              <p className="text-xs text-slate-400">Fill in the student details to begin registration</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 bg-slate-900/70 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Student ID
                </label>
                <input
                  type="text"
                  name="student_id"
                  value={form.student_id}
                  onChange={handleChange}
                  required
                  placeholder="e.g. STU-2024-001"
                  className="w-full px-4 py-3 bg-slate-900/70 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="e.g. john.doe@university.edu"
                className="w-full px-4 py-3 bg-slate-900/70 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {status && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  status.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {status.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0" />
                )}
                {status.message}
              </div>
            )}

            <button
              type="submit"
              disabled={!isStep1Valid}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/20"
            >
              Register &amp; Continue to Face Capture
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ═══════════ STEP 2: Face Capture ═══════════ */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-fadeIn">
          {/* Student info banner */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
                {registeredUser?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{registeredUser?.name}</p>
                <p className="text-xs text-slate-400 font-mono">ID: {registeredUser?.student_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono bg-emerald-500/10 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              REGISTERED
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Camera Section */}
            <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <ScanFace className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Face Capture</h3>
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {images.length}/5 captured
                </div>
              </div>

              {/* Face detection hint message */}
              {faceDetectHint && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-lg text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Eye className="w-4 h-4 shrink-0" />
                  {faceDetectHint}
                </div>
              )}

              {/* Camera viewport */}
              <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-700/30">
                <div className="aspect-video relative flex items-center justify-center">
                  {capturedPreview ? (
                    <img
                      src={capturedPreview}
                      alt="Captured"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        className={`w-full h-full object-cover ${isStreaming ? "block" : "hidden"}`}
                        muted
                        playsInline
                      />
                      {!isStreaming && (
                        <div className="text-center text-slate-600 py-16">
                          <div className="w-24 h-24 mx-auto mb-4 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                            <ScanFace className="w-12 h-12 opacity-30" />
                          </div>
                          <p className="text-sm font-medium text-slate-500">Camera not started</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Click &quot;Open Camera&quot; to begin face capture
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Face guide overlay */}
                  {isStreaming && !capturedPreview && (
                    <>
                      {/* Scan line animation */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent animate-scanline" />
                      </div>

                      {/* Face oval guide */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-60 border-2 border-dashed border-emerald-500/40 rounded-[50%] animate-pulse" />
                      </div>

                      {/* Corner markers */}
                      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-500/60" />
                      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-500/60" />
                      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-500/60" />
                      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-500/60" />

                      {/* Live badge */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-500/90 text-white text-[10px] font-mono px-2 py-1 rounded">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </div>

                      {/* Guide text */}
                      <div className="absolute bottom-3 left-0 right-0 text-center">
                        <span className="bg-black/60 backdrop-blur text-emerald-400 text-[11px] font-mono px-3 py-1 rounded">
                          Align face within the oval
                        </span>
                      </div>
                    </>
                  )}

                  {/* Captured preview overlay */}
                  {capturedPreview && (
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <span className="bg-emerald-500/90 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                        Preview - Confirm or Retake
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {/* Camera controls */}
              <div className="flex items-center gap-3 mt-4">
                {!isStreaming && !capturedPreview && (
                  <button
                    onClick={startCamera}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/20"
                  >
                    <Camera className="w-4 h-4" />
                    Open Camera
                  </button>
                )}

                {isStreaming && !capturedPreview && (
                  <>
                    <button
                      onClick={captureFrame}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                    >
                      <Camera className="w-5 h-5" />
                      Capture Face
                    </button>
                    <button
                      onClick={stopCamera}
                      className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <StopCircle className="w-4 h-4" />
                    </button>
                  </>
                )}

                {capturedPreview && (
                  <>
                    <button
                      onClick={confirmCapture}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm &amp; Add
                    </button>
                    <button
                      onClick={retakeCapture}
                      className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retake
                    </button>
                  </>
                )}
              </div>

              {/* File upload alternative */}
              <div className="mt-4 pt-4 border-t border-slate-700/30">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Upload from Files
                  </button>
                  <span className="text-xs text-slate-500">
                    or upload existing photos (JPG, PNG)
                  </span>
                </div>
              </div>

              {cameraError && (
                <div className="mt-4 flex items-center gap-2 p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {cameraError}
                </div>
              )}
            </div>

            {/* Right Panel - Captured Images & Tips */}
            <div className="space-y-4">
              {/* Captured images grid */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                  <ScanFace className="w-3.5 h-3.5 text-emerald-400" />
                  Captured Faces ({images.length}/5)
                </h4>

                {images.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-700/50 rounded-lg">
                    <ScanFace className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                    <p className="text-xs text-slate-500">No faces captured yet</p>
                    <p className="text-[10px] text-slate-600 mt-1">
                      Use the camera or upload images
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img.data}
                          alt={`Face ${i + 1}`}
                          className="w-full aspect-square object-cover rounded-lg border border-slate-700/50"
                        />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                          <span className="text-[9px] bg-black/70 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                            {img.type === "webcam" ? "CAM" : "FILE"}
                          </span>
                          <span className="text-[9px] bg-emerald-500/80 px-1.5 py-0.5 rounded text-white font-mono">
                            #{i + 1}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Image count progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>Quality Score</span>
                    <span>{Math.min(images.length * 20, 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        images.length >= 3
                          ? "bg-emerald-500"
                          : images.length >= 1
                          ? "bg-yellow-500"
                          : "bg-slate-600"
                      }`}
                      style={{ width: `${Math.min(images.length * 20, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quality tips */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  Tips for Best Results
                </h4>
                <ul className="space-y-2">
                  {[
                    { text: "Look directly at the camera", done: images.length >= 1 },
                    { text: "Slight left angle", done: images.length >= 2 },
                    { text: "Slight right angle", done: images.length >= 3 },
                    { text: "Good lighting on face", done: images.length >= 4 },
                    { text: "No obstructions (glasses off)", done: images.length >= 5 },
                  ].map((tip, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          tip.done
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-700/50 text-slate-500"
                        }`}
                      >
                        {tip.done ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <span className="text-[8px] font-bold">{i + 1}</span>
                        )}
                      </div>
                      <span className={tip.done ? "text-emerald-400" : "text-slate-400"}>
                        {tip.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Continue button */}
              <button
                onClick={() => {
                  stopCamera();
                  setCurrentStep(3);
                }}
                disabled={!isStep2Valid}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/20"
              >
                Continue to Confirmation
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ STEP 3: Confirm & Register Face ═══════════ */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-fadeIn">
          {faceStatus?.type === "success" ? (
            /* ── Success State ── */
            <div className="bg-slate-800/60 border border-emerald-500/30 rounded-xl p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center animate-bounce-slow">
                <ShieldCheck className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Registration Complete!</h2>
              <p className="text-sm text-slate-400 mb-2">
                <span className="text-emerald-400 font-semibold">{registeredUser?.name}</span> has been
                successfully registered with face recognition.
              </p>
              <p className="text-xs text-slate-500 font-mono mb-6">
                {faceStatus.encodings} face encoding(s) stored &bull; Student ID: {registeredUser?.student_id}
              </p>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={resetAll}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/20"
                >
                  <UserPlus className="w-4 h-4" />
                  Register Another Student
                </button>
              </div>
            </div>
          ) : (
            /* ── Confirmation Review ── */
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirm Registration</h3>
                  <p className="text-xs text-slate-400">
                    Review the details and submit face data for encoding
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student summary */}
                <div className="space-y-4">
                  <div className="bg-slate-900/50 rounded-lg border border-slate-700/30 p-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Student Details
                    </h4>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xl">
                        {registeredUser?.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{registeredUser?.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{registeredUser?.student_id}</p>
                        <p className="text-xs text-slate-500">{registeredUser?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Profile registered successfully
                    </div>
                  </div>

                  <div className="bg-slate-900/50 rounded-lg border border-slate-700/30 p-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Face Data Summary
                    </h4>
                    <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
                      <span className="text-xs text-slate-400">Images captured</span>
                      <span className="text-sm font-mono text-white">{images.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
                      <span className="text-xs text-slate-400">Quality score</span>
                      <span
                        className={`text-sm font-mono ${
                          images.length >= 3
                            ? "text-emerald-400"
                            : images.length >= 1
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {images.length >= 3 ? "Excellent" : images.length >= 1 ? "Acceptable" : "Poor"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs text-slate-400">Status</span>
                      <span className="text-sm font-mono text-yellow-400">Pending Upload</span>
                    </div>
                  </div>
                </div>

                {/* Face images preview */}
                <div>
                  <div className="bg-slate-900/50 rounded-lg border border-slate-700/30 p-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Face Images Preview
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((img, i) => (
                        <div key={i} className="relative">
                          <img
                            src={img.data}
                            alt={`Face ${i + 1}`}
                            className="w-full aspect-square object-cover rounded-lg border border-slate-700/50"
                          />
                          <span className="absolute bottom-1 right-1 text-[9px] bg-emerald-500/80 px-1.5 py-0.5 rounded text-white font-mono">
                            #{i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error status */}
              {faceStatus?.type === "error" && (
                <div className="mt-4 flex items-center gap-2 p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-red-400">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {faceStatus.message}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleUploadFaces}
                  disabled={uploading || images.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/20"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing Face Encodings...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      Register Face &amp; Complete
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
