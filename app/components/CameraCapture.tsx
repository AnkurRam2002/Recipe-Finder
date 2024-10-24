import { useRef, useEffect, useState } from 'react'
import { Camera, X } from 'lucide-react'

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void
  onClose: () => void
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        setIsLoading(true)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        })
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            setIsLoading(false)
          }
        }
      } catch (err) {
        setError('Unable to access camera. Please check permissions.')
        setIsLoading(false)
        console.error("Error accessing camera:", err)
      }
    }

    startCamera()

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      try {
        const video = videoRef.current
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        if (context) {
          // Set canvas dimensions to match video
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight

          // Draw the video frame to the canvas
          context.drawImage(video, 0, 0)

          // Convert to blob with good quality
          canvas.toBlob(
            (blob) => {
              if (blob) {
                onCapture(blob)
              } else {
                setError('Failed to capture image. Please try again.')
              }
            },
            'image/jpeg',
            0.95
          )
        }
      } catch (err) {
        setError('Error capturing photo. Please try again.')
        console.error('Error capturing photo:', err)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Take Photo</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Camera View */}
        <div className="relative aspect-video bg-black">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <div className="text-white text-center p-4">
                <p className="mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-6 flex justify-center gap-4">
          <button
            onClick={captureImage}
            disabled={isLoading || !!error}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="h-5 w-5" />
            Capture Photo
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default CameraCapture