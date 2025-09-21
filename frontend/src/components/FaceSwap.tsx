import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Camera, Upload, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface FaceSwapProps {
  astronautName?: string
}

export default function FaceSwap({ astronautName }: FaceSwapProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const processFaceSwap = async () => {
    if (!uploadedImage) return

    setIsProcessing(true)
    try {
      // Simulate face swap processing
      // In a real implementation, you would call a face-swap API or use a library
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // For demo purposes, we'll just use the uploaded image
      setProcessedImage(uploadedImage)
      toast.success('Face swap completed!')
    } catch (error) {
      console.error('Error processing face swap:', error)
      toast.error('Failed to process face swap. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadImage = () => {
    if (!processedImage) return

    const link = document.createElement('a')
    link.href = processedImage
    link.download = `space-suit-${astronautName || 'astronaut'}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Image downloaded!')
  }

  const resetImage = () => {
    setUploadedImage(null)
    setProcessedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="card">
      <div className="text-center mb-6">
        <Camera className="w-16 h-16 mx-auto mb-4 text-accent-gold" />
        <h3 className="text-2xl font-bold text-white mb-2">Space Suit Face Swap</h3>
        <p className="text-white/70">
          Upload your photo to see yourself in a space suit
        </p>
      </div>

      {!uploadedImage ? (
        <div className="text-center">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/30 rounded-lg p-12 cursor-pointer hover:border-space-blue hover:bg-white/5 transition-all duration-300"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-white/50" />
            <p className="text-white text-lg mb-2">Click to upload your photo</p>
            <p className="text-white/50 text-sm">JPG, PNG, or GIF (max 5MB)</p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Original Image */}
          <div>
            <h4 className="text-white font-medium mb-3">Your Photo</h4>
            <div className="relative">
              <img
                src={uploadedImage}
                alt="Uploaded photo"
                className="w-full h-64 object-cover rounded-lg"
              />
              <button
                onClick={resetImage}
                className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Process Button */}
          <div className="text-center">
            <button
              onClick={processFaceSwap}
              disabled={isProcessing}
              className="btn-primary disabled:opacity-50 flex items-center space-x-2 mx-auto"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span>Create Space Suit Photo</span>
                </>
              )}
            </button>
          </div>

          {/* Processed Image */}
          {processedImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h4 className="text-white font-medium">Your Space Suit Photo</h4>
              <div className="relative">
                <img
                  src={processedImage}
                  alt="Space suit photo"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="font-semibold">Astronaut Candidate</p>
                  <p className="text-sm opacity-80">Ready for space mission</p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={downloadImage}
                  className="btn-secondary flex-1 flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(processedImage)
                    toast.success('Image copied to clipboard!')
                  }}
                  className="btn-primary flex-1"
                >
                  Share
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-blue-300 text-sm">
          <strong>Note:</strong> This is a demo feature. In a production version, 
          this would use advanced face-swapping technology to seamlessly integrate 
          your face into a space suit photo.
        </p>
      </div>
    </div>
  )
}
