import cv2
import numpy as np
import base64
from io import BytesIO
import logging

log = logging.getLogger(__name__)

# Try to import PIL, fallback if not available
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    log.warning("PIL/Pillow not available, face swap will use fallback")

def process_face_swap(selfie_base64: str, astronaut_suit_path: str = None) -> str:
    """
    Process face swapping by detecting face in selfie and overlaying it onto astronaut suit helmet visor.
    
    Args:
        selfie_base64: Base64 encoded selfie image
        astronaut_suit_path: Path to astronaut suit image
        
    Returns:
        Base64 encoded result image or None if processing fails
    """
    # Set default path relative to project root - use new spacesuit
    if astronaut_suit_path is None:
        import os
        astronaut_suit_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'public', 'new-astronaut-suit.png')
    
    print(f'\n🎭 === FACE SWAP PROCESSING START ===')
    print(f'📷 Selfie data provided: {"✅ Yes" if selfie_base64 else "❌ No"}')
    print(f'🛠️  Astronaut suit path: {astronaut_suit_path}')
    if selfie_base64:
        print(f'📏 Data length: {len(selfie_base64)} characters')
    try:
        # Check if PIL is available
        if not PIL_AVAILABLE:
            log.warning("PIL not available, returning astronaut suit fallback")
            return encode_astronaut_suit_fallback()
            
        # Decode the selfie image
        if not selfie_base64 or 'data:image' not in selfie_base64:
            log.warning("Invalid or missing selfie data")
            return encode_astronaut_suit_fallback()
            
        # Remove data URL prefix and decode
        image_data = selfie_base64.split(',')[1]
        selfie_bytes = base64.b64decode(image_data)
        
        # Convert to OpenCV format
        selfie_pil = Image.open(BytesIO(selfie_bytes))
        selfie_cv = cv2.cvtColor(np.array(selfie_pil), cv2.COLOR_RGB2BGR)
        
        # Load astronaut suit image
        suit_img = cv2.imread(astronaut_suit_path)
        if suit_img is None:
            log.error(f"Could not load astronaut suit image from {astronaut_suit_path}")
            return None
            
        # Face detection using Haar cascade
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(selfie_cv, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) == 0:
            log.warning("No face detected in selfie")
            # Return original suit image
            return encode_image_to_base64(suit_img)
        
        # Get the largest face
        face = max(faces, key=lambda f: f[2] * f[3])  # Sort by area (width * height)
        x, y, w, h = face
        
        # Add padding around face for better cropping
        padding = int(min(w, h) * 0.2)
        x_start = max(0, x - padding)
        y_start = max(0, y - padding)
        x_end = min(selfie_cv.shape[1], x + w + padding)
        y_end = min(selfie_cv.shape[0], y + h + padding)
        
        # Crop face from selfie with padding
        face_crop = selfie_cv[y_start:y_end, x_start:x_end]
        
        # Define helmet visor area in astronaut suit (approximate coordinates)
        # These coordinates are based on the CDC spacesuit image provided
        suit_height, suit_width = suit_img.shape[:2]
        
        # Visor area - adjust these coordinates based on the actual helmet position
        visor_x = int(suit_width * 0.25)  # 25% from left
        visor_y = int(suit_height * 0.15)  # 15% from top
        visor_width = int(suit_width * 0.5)  # 50% of image width
        visor_height = int(suit_height * 0.4)  # 40% of image height
        
        # Resize face to fit visor area
        face_resized = cv2.resize(face_crop, (visor_width, visor_height))
        
        # Create elliptical mask for visor shape
        mask = np.zeros((visor_height, visor_width), dtype=np.uint8)
        center_x, center_y = visor_width // 2, visor_height // 2
        axes = (visor_width // 2 - 10, visor_height // 2 - 10)  # Slightly smaller than visor
        cv2.ellipse(mask, (center_x, center_y), axes, 0, 0, 360, 255, -1)
        
        # Apply the mask to the resized face
        face_masked = cv2.bitwise_and(face_resized, face_resized, mask=mask)
        
        # Create inverse mask for the suit
        mask_inv = cv2.bitwise_not(mask)
        suit_region = suit_img[visor_y:visor_y + visor_height, visor_x:visor_x + visor_width]
        suit_masked = cv2.bitwise_and(suit_region, suit_region, mask=mask_inv)
        
        # Combine face and suit
        visor_final = cv2.add(suit_masked, face_masked)
        
        # Replace visor area in suit image
        result_img = suit_img.copy()
        result_img[visor_y:visor_y + visor_height, visor_x:visor_x + visor_width] = visor_final
        
        # Apply subtle lighting adjustment to make face blend better
        face_region = result_img[visor_y:visor_y + visor_height, visor_x:visor_x + visor_width]
        face_region = apply_helmet_lighting(face_region, mask)
        result_img[visor_y:visor_y + visor_height, visor_x:visor_x + visor_width] = face_region
        
        return encode_image_to_base64(result_img)
        
    except Exception as e:
        log.error(f"Error in face swap processing: {e}")
        return None

def apply_helmet_lighting(face_region, mask):
    """Apply subtle lighting effects to simulate helmet glass reflection."""
    # Create subtle darkening around edges
    h, w = face_region.shape[:2]
    
    # Create radial gradient for glass effect
    center_x, center_y = w // 2, h // 2
    y, x = np.ogrid[:h, :w]
    distance = np.sqrt((x - center_x)**2 + (y - center_y)**2)
    
    # Normalize distance
    max_distance = np.sqrt((w/2)**2 + (h/2)**2)
    distance = distance / max_distance
    
    # Create gradient (darker at edges, normal at center)
    gradient = 1.0 - (distance * 0.3)  # 30% darkening at edges
    gradient = np.clip(gradient, 0.5, 1.0)
    
    # Apply gradient to each channel
    result = face_region.astype(np.float32)
    for i in range(3):
        result[:, :, i] *= gradient
    
    # Apply only where the mask is active
    mask_3channel = cv2.merge([mask, mask, mask]) / 255.0
    result = result * mask_3channel + face_region.astype(np.float32) * (1 - mask_3channel)
    
    return np.clip(result, 0, 255).astype(np.uint8)

def encode_image_to_base64(cv_image):
    """Convert OpenCV image to base64 string."""
    _, buffer = cv2.imencode('.png', cv_image)
    image_base64 = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/png;base64,{image_base64}"

def encode_astronaut_suit_fallback():
    """Return base64 encoded astronaut suit image as fallback."""
    import os
    # Try multiple possible paths for new astronaut suit
    possible_paths = [
        os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'public', 'new-astronaut-suit.png'),
        'frontend/public/new-astronaut-suit.png',
        os.path.join('frontend', 'public', 'new-astronaut-suit.png'),
        # Fallback to old suit if new one not found
        os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'public', 'astronaut-suit.png'),
        'frontend/public/astronaut-suit.png'
    ]
    
    for path in possible_paths:
        try:
            print(f'🔍 Trying astronaut suit path: {path}')
            with open(path, "rb") as f:
                suit_data = base64.b64encode(f.read()).decode('utf-8')
                print(f'✅ Successfully loaded astronaut suit from: {path}')
                return f"data:image/png;base64,{suit_data}"
        except Exception as e:
            print(f'❌ Failed to load from {path}: {e}')
            continue
    
    print('❌ Could not find astronaut suit image in any expected location')
    return None