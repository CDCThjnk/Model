import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Camera, RotateCcw, Check } from 'lucide-react'

interface SelfieCaptureProps {
  onCapture: (imageData: string) => void
  register: any
  errors: any
}

/**
 * SelfieCapture Component
 * 
 * This component provides a camera interface for users to take selfies.
 * It handles camera permissions, photo capture, and image processing.
 * 
 * Features:
 * - Camera access with permission handling
 * - Photo capture and preview
 * - Retake functionality
 * - Image data conversion to base64
 * - Responsive design with space theme
 */
export default function SelfieCapture({ onCapture, register, errors }: SelfieCaptureProps) {
  // State management for camera and photo capture
  const [isCaptured, setIsCaptured] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Refs for video and canvas elements
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  /**
   * Start camera stream
   * Requests user media access and sets up video stream
   */
  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera for selfies
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Unable to access camera. Please check permissions and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Stop camera stream
   * Cleans up media stream to free up camera resources
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  /**
   * Capture photo from video stream
   * Draws current video frame to canvas and converts to base64
   */
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to base64 image data
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    
    // Update state and call parent callback
    setCapturedImage(imageData)
    setIsCaptured(true)
    onCapture(imageData)
    
    // Stop camera after capture
    stopCamera()
  }, [onCapture, stopCamera])

  /**
   * Retake photo
   * Resets capture state and restarts camera
   */
  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    setIsCaptured(false)
    setError(null)
    startCamera()
  }, [startCamera])

  // Start camera when component mounts
  useState(() => {
    startCamera()
    
    // Cleanup on unmount
    return () => {
      stopCamera()
    }
  })

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Hidden input for form registration */}
      <input
        {...register('selfie')}
        type="hidden"
        value={capturedImage || ''}
      />
      
      {/* Camera/Photo Display Area */}
      <div className="relative w-full h-64 bg-white/10 rounded-lg overflow-hidden mb-6">
        {!isCaptured ? (
          // Camera view
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            
            {/* No overlay - clean camera view */}
            
            {/* Loading state */}
            {isLoading && (
              <div className="absolute inset-0 bg-space-dark/80 flex items-center justify-center">
                <motion.div
                  className="text-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Camera className="w-8 h-8 text-accent-gold mx-auto mb-2" />
                  <p className="text-white text-sm">Starting camera...</p>
                </motion.div>
              </div>
            )}
          </div>
        ) : (
          // Captured photo preview
          <div className="relative w-full h-full">
            <img
              src={capturedImage || ''}
              alt="Captured selfie"
              className="w-full h-full object-cover"
            />
            
            {/* Success overlay */}
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <motion.div
                className="text-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-white text-sm font-semibold">Photo captured!</p>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-red-300 text-sm text-center">{error}</p>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center space-x-4">
        {!isCaptured ? (
          <motion.button
            onClick={capturePhoto}
            disabled={isLoading || !videoRef.current}
            className="btn-primary flex items-center space-x-2 px-6 py-3 disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Camera className="w-5 h-5" />
            <span>Capture Photo</span>
          </motion.button>
        ) : (
          <motion.button
            onClick={retakePhoto}
            className="btn-secondary flex items-center space-x-2 px-6 py-3"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RotateCcw className="w-5 h-5" />
            <span>Retake</span>
          </motion.button>
        )}
      </div>

      {/* Instructions */}
      <motion.p
        className="text-white/60 text-sm text-center mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {!isCaptured 
          ? "Position your face in the circle and click capture"
          : "Great! Your photo is ready for the space suit effect"
        }
      </motion.p>

      {/* Hidden canvas for photo processing */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {/* No validation error since selfie is optional */}
    </div>
  )
}
