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
            
        # Get suit dimensions for background sizing
        suit_height, suit_width = suit_img.shape[:2]
        
        # Resize user's selfie to match suit dimensions (as background)
        background_img = cv2.resize(selfie_cv, (suit_width, suit_height))
        
        # Load suit image with alpha channel (transparency)
        # If the suit image doesn't have alpha channel, we'll create one
        if suit_img.shape[2] == 3:  # BGR image without alpha
            # Convert suit to BGRA
            suit_bgra = cv2.cvtColor(suit_img, cv2.COLOR_BGR2BGRA)
        else:
            suit_bgra = suit_img
        
        # Convert background to BGRA as well
        background_bgra = cv2.cvtColor(background_img, cv2.COLOR_BGR2BGRA)
        
        # Create the composite image - background (user photo) with suit overlay
        result_img = background_bgra.copy()
        
        # Overlay the suit on top of the background
        # The transparent areas in the helmet will show the user's photo behind
        for y in range(suit_height):
            for x in range(suit_width):
                # If suit pixel is not completely transparent
                suit_pixel = suit_bgra[y, x]
                if len(suit_pixel) >= 4 and suit_pixel[3] > 0:  # Has alpha and not transparent
                    result_img[y, x] = suit_pixel
                # Otherwise keep the background (user's photo)
        
        # Convert back to BGR for final output
        result_img = cv2.cvtColor(result_img, cv2.COLOR_BGRA2BGR)
        
        return encode_image_to_base64(result_img)
        
    except Exception as e:
        log.error(f"Error in face swap processing: {e}")
        return None


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