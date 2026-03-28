import io
import math
import hashlib
from typing import List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False

# OpenCV face detector (always available)
_face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
_profile_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_profileface.xml"
)


def _load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """Load an image from raw bytes into a numpy RGB array."""
    image = Image.open(io.BytesIO(image_bytes))
    image = image.convert("RGB")
    return np.array(image)


def _cv2_detect_faces(image_rgb: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Detect faces using OpenCV Haar cascades.
    Tries frontal face first, then profile face for angled faces.
    Returns list of (top, right, bottom, left) bounding boxes.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    gray = cv2.equalizeHist(gray)

    # Try frontal face detection with multiple scale factors for robustness
    faces = _face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60),
        flags=cv2.CASCADE_SCALE_IMAGE
    )

    if len(faces) == 0:
        # Try with more lenient params
        faces = _face_cascade.detectMultiScale(
            gray, scaleFactor=1.05, minNeighbors=3, minSize=(40, 40),
            flags=cv2.CASCADE_SCALE_IMAGE
        )

    if len(faces) == 0:
        # Try profile face (for left/right angled faces)
        faces = _profile_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=3, minSize=(40, 40),
            flags=cv2.CASCADE_SCALE_IMAGE
        )

    if len(faces) == 0:
        # Try flipped image for opposite profile
        flipped = cv2.flip(gray, 1)
        faces_flipped = _profile_cascade.detectMultiScale(
            flipped, scaleFactor=1.1, minNeighbors=3, minSize=(40, 40),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        if len(faces_flipped) > 0:
            h_img, w_img = gray.shape[:2]
            faces = []
            for (x, y, w, h) in faces_flipped:
                faces.append((w_img - x - w, y, w, h))
            faces = np.array(faces)

    # Convert from (x, y, w, h) to (top, right, bottom, left)
    locations = []
    for (x, y, w, h) in faces:
        locations.append((y, x + w, y + h, x))

    return locations


def _generate_cv2_encoding(image_rgb: np.ndarray, face_box: Tuple[int, int, int, int]) -> List[float]:
    """
    Generate a pseudo face encoding from a detected face region using OpenCV.
    Uses pixel histogram features + spatial features to create a 128-d vector.
    Not as accurate as dlib/face_recognition but works for matching.
    """
    top, right, bottom, left = face_box
    # Pad the box slightly
    h, w = image_rgb.shape[:2]
    pad = int((bottom - top) * 0.1)
    top = max(0, top - pad)
    left = max(0, left - pad)
    bottom = min(h, bottom + pad)
    right = min(w, right + pad)

    face_region = image_rgb[top:bottom, left:right]
    if face_region.size == 0:
        return [0.0] * 128

    # Resize to standard size
    face_resized = cv2.resize(face_region, (64, 64))

    # Convert to different color spaces for feature extraction
    gray = cv2.cvtColor(face_resized, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(face_resized, cv2.COLOR_RGB2HSV)

    encoding = []

    # 1. Histogram of grayscale (32 bins, normalized)
    hist_gray = cv2.calcHist([gray], [0], None, [32], [0, 256]).flatten()
    hist_gray = hist_gray / (hist_gray.sum() + 1e-7)
    encoding.extend(hist_gray.tolist())  # 32 features

    # 2. LBP-like texture features from 4 quadrants
    mid_y, mid_x = 32, 32
    quadrants = [
        gray[:mid_y, :mid_x],
        gray[:mid_y, mid_x:],
        gray[mid_y:, :mid_x],
        gray[mid_y:, mid_x:],
    ]
    for quad in quadrants:
        hist_q = cv2.calcHist([quad], [0], None, [8], [0, 256]).flatten()
        hist_q = hist_q / (hist_q.sum() + 1e-7)
        encoding.extend(hist_q.tolist())  # 4 * 8 = 32 features

    # 3. Hue histogram (16 bins)
    hist_hue = cv2.calcHist([hsv], [0], None, [16], [0, 180]).flatten()
    hist_hue = hist_hue / (hist_hue.sum() + 1e-7)
    encoding.extend(hist_hue.tolist())  # 16 features

    # 4. Edge features using Sobel
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    edge_mag = np.sqrt(sobelx ** 2 + sobely ** 2)
    # Split into 4x4 grid and compute mean edge magnitude
    for gy in range(4):
        for gx in range(4):
            cell = edge_mag[gy*16:(gy+1)*16, gx*16:(gx+1)*16]
            encoding.append(float(cell.mean()) / 255.0)
    # 16 features

    # 5. Spatial intensity features - means of 4x4 grid
    for gy in range(4):
        for gx in range(4):
            cell = gray[gy*16:(gy+1)*16, gx*16:(gx+1)*16]
            encoding.append(float(cell.mean()) / 255.0)
    # 16 features

    # 6. Aspect ratio and shape features
    face_h = bottom - top
    face_w = right - left
    encoding.append(face_w / max(face_h, 1))
    encoding.append(float(gray.std()) / 255.0)
    encoding.append(float(gray.mean()) / 255.0)
    encoding.append(float(np.median(gray)) / 255.0)
    # 4 features

    # Total: 32 + 32 + 16 + 16 + 16 + 4 = 116
    # Pad to 128
    while len(encoding) < 128:
        encoding.append(0.0)

    # Normalize the encoding
    enc_array = np.array(encoding[:128], dtype=np.float64)
    norm = np.linalg.norm(enc_array)
    if norm > 0:
        enc_array = enc_array / norm

    return enc_array.tolist()


def encode_face(image_bytes: bytes) -> List[List[float]]:
    """
    Extract face encodings from an image.
    Uses face_recognition if available, falls back to OpenCV.
    """
    image_array = _load_image_from_bytes(image_bytes)

    if FACE_RECOGNITION_AVAILABLE:
        face_locations = face_recognition.face_locations(image_array, model="hog")
        if not face_locations:
            return []
        encodings = face_recognition.face_encodings(image_array, face_locations)
        return [enc.tolist() for enc in encodings]

    # OpenCV fallback
    locations = _cv2_detect_faces(image_array)
    if not locations:
        return []

    encodings = []
    for loc in locations:
        enc = _generate_cv2_encoding(image_array, loc)
        encodings.append(enc)

    return encodings


def compare_faces(
    known_encodings_map: dict,
    face_encoding: List[float],
    tolerance: float = 0.5,
) -> Tuple[bool, Optional[str], Optional[str], float]:
    """
    Compare a face encoding against known users' encodings.
    """
    if FACE_RECOGNITION_AVAILABLE:
        face_encoding_np = np.array(face_encoding)
        best_match_user_id = None
        best_match_name = None
        best_distance = float("inf")

        for user_id, user_data in known_encodings_map.items():
            for known_enc in user_data["encodings"]:
                known_enc_np = np.array(known_enc)
                distance = np.linalg.norm(known_enc_np - face_encoding_np)
                if distance < best_distance:
                    best_distance = distance
                    best_match_user_id = user_id
                    best_match_name = user_data["name"]

        if best_distance <= tolerance:
            confidence = max(0.0, min(1.0, 1.0 - (best_distance / tolerance)))
            return True, best_match_user_id, best_match_name, round(confidence, 4)
        return False, None, None, 0.0

    # OpenCV fallback: use cosine similarity
    face_enc_np = np.array(face_encoding)
    best_match_user_id = None
    best_match_name = None
    best_similarity = -1.0

    for user_id, user_data in known_encodings_map.items():
        for known_enc in user_data["encodings"]:
            known_enc_np = np.array(known_enc)
            dot = np.dot(face_enc_np, known_enc_np)
            norm_a = np.linalg.norm(face_enc_np)
            norm_b = np.linalg.norm(known_enc_np)
            if norm_a > 0 and norm_b > 0:
                similarity = dot / (norm_a * norm_b)
            else:
                similarity = 0.0

            if similarity > best_similarity:
                best_similarity = similarity
                best_match_user_id = user_id
                best_match_name = user_data["name"]

    # Threshold for cosine similarity (0.7+ is a good match for this method)
    cv2_threshold = 0.7
    if best_similarity >= cv2_threshold:
        confidence = max(0.0, min(1.0, (best_similarity - cv2_threshold) / (1.0 - cv2_threshold)))
        return True, best_match_user_id, best_match_name, round(max(confidence, 0.5), 4)

    return False, None, None, 0.0


def classify_behavior(
    face_location: Tuple[int, int, int, int],
    frame_width: int,
    frame_height: int,
    face_landmarks: Optional[dict] = None,
    prev_locations: Optional[List[Tuple[int, int, int, int]]] = None,
) -> str:
    """
    Classify behaviour from face geometry / position heuristics.
    """
    top, right, bottom, left = face_location
    face_width = right - left
    face_height = bottom - top
    face_center_x = (left + right) / 2
    face_center_y = (top + bottom) / 2

    norm_x = face_center_x / max(frame_width, 1)
    norm_y = face_center_y / max(frame_height, 1)

    aspect_ratio = face_width / max(face_height, 1)

    # Landmark-based yaw estimation
    yaw_ratio = 0.5
    if face_landmarks and "nose_bridge" in face_landmarks and "chin" in face_landmarks:
        nose_bridge = face_landmarks["nose_bridge"]
        if len(nose_bridge) >= 2:
            nose_x = nose_bridge[-1][0]
            yaw_ratio = (nose_x - left) / max(face_width, 1)

    # Movement analysis
    movement_magnitude = 0.0
    if prev_locations and len(prev_locations) >= 2:
        prev = prev_locations[-2]
        prev_cx = (prev[1] + prev[3]) / 2
        prev_cy = (prev[0] + prev[2]) / 2
        dx = face_center_x - prev_cx
        dy = face_center_y - prev_cy
        movement_magnitude = math.sqrt(dx * dx + dy * dy) / max(frame_width, 1)

    # Classification rules
    if yaw_ratio < 0.3 or yaw_ratio > 0.7:
        return "looking_around"

    if aspect_ratio > 1.3:
        return "looking_around"

    if movement_magnitude > 0.08:
        return "mass_copying"

    if norm_y > 0.7 and face_height < frame_height * 0.15:
        return "phone_usage"

    if norm_y > 0.55:
        return "normal_writing"

    return "normal_writing"


def detect_faces_in_frame(
    image_bytes: bytes,
) -> Tuple[List[Tuple[int, int, int, int]], List[List[float]], int, int, Optional[List[dict]]]:
    """
    Detect faces in a frame and return locations, encodings, and frame dimensions.
    """
    image_array = _load_image_from_bytes(image_bytes)
    frame_height, frame_width = image_array.shape[:2]

    if FACE_RECOGNITION_AVAILABLE:
        face_locations = face_recognition.face_locations(image_array, model="hog")
        if not face_locations:
            return [], [], frame_width, frame_height, []
        face_encodings_raw = face_recognition.face_encodings(image_array, face_locations)
        face_encodings = [enc.tolist() for enc in face_encodings_raw]
        try:
            face_landmarks_list = face_recognition.face_landmarks(image_array, face_locations)
        except Exception:
            face_landmarks_list = [None] * len(face_locations)
        return face_locations, face_encodings, frame_width, frame_height, face_landmarks_list

    # OpenCV fallback
    locations = _cv2_detect_faces(image_array)
    if not locations:
        return [], [], frame_width, frame_height, []

    encodings = []
    for loc in locations:
        enc = _generate_cv2_encoding(image_array, loc)
        encodings.append(enc)

    return locations, encodings, frame_width, frame_height, [None] * len(locations)
