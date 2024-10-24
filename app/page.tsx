'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { Camera, Upload, ChefHat, Utensils, Globe, Info, X } from 'lucide-react'
import CameraCapture from './components/CameraCapture'
import { DishResult } from './types'

export default function Home() {
  const [image, setImage] = useState<File | Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [result, setResult] = useState<DishResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState<boolean>(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      identifyDish(file)
    }
  }

  const handleCameraCapture = (imageBlob: Blob) => {
    setImage(imageBlob)
    const imageUrl = URL.createObjectURL(imageBlob)
    setPreview(imageUrl)
    setShowCamera(false)
    identifyDish(imageBlob)

    // Cleanup URL
    return () => URL.revokeObjectURL(imageUrl)
  }

  const handleRemoveImage = () => {
    // Cancel ongoing analysis if it exists
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setImage(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setLoading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const identifyDish = async (imageFile: File | Blob): Promise<void> => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('image', imageFile)

      const response = await fetch('/api/identify', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: DishResult = await response.json()
      setResult(data)
    } catch (error) {
      // Only set error if it's not an abort error
      if (error instanceof Error && error.name !== 'AbortError') {
        setError('Failed to identify dish. Please try again.')
        console.error('Error identifying dish:', error)
      }
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const ResultSection = ({ title, icon: Icon, children, className = '' }: {
    title: string;
    icon: any;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={`mb-8 p-6 rounded-xl ${className}`}>
      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-purple-800">
        <Icon className="h-6 w-6" />
        {title}
      </h3>
      {children}
    </div>
  )

  const InputOptions = () => (
    <div className="flex flex-wrap gap-4 items-center justify-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white">
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full sm:w-auto flex-1 min-w-48 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        <Upload size={20} />
        Upload Photo
      </button>
      <button
        onClick={() => setShowCamera(true)}
        className="w-full sm:w-auto flex-1 min-w-48 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        <Camera size={20} />
        Take Photo
      </button>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
    </div>
  )

  return (
    <main className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <ChefHat className="h-16 w-16 text-purple-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
            Dish Identifier
          </h1>
          <p className="text-gray-600 text-lg">
            Discover recipes and stories behind your favorite dishes
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 shadow-sm">
            {error}
          </div>
        )}
        
        <InputOptions />

        {showCamera && (
          <CameraCapture
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}

        {preview && (
          <div className="mt-8 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white relative">
            <button
              onClick={handleRemoveImage}
              className="absolute -top-3 -right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors duration-200"
              aria-label="Remove image"
            >
              <X size={20} />
            </button>
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-96 object-contain rounded-xl"
            />
          </div>
        )}

        {loading && (
          <div className="mt-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Analyzing your dish...</p>
          </div>
        )}

        {result && (
          <div className="mt-8 bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white">
            <h2 className="text-3xl font-bold mb-6 text-purple-800">{result.name}</h2>
            
            {/* Region Section */}
            {result.region && (
              <ResultSection 
                title="Regional Information" 
                icon={Globe}
                className="bg-gradient-to-r from-purple-50 to-pink-50"
              >
                <p className="text-gray-700">{result.region}</p>
              </ResultSection>
            )}
            
            {/* Ingredients Section */}
            {result.ingredients && result.ingredients.length > 0 && (
              <ResultSection 
                title="Ingredients" 
                icon={Utensils}
                className="bg-blue-50"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-white/50 rounded-lg">
                      <span className="h-2 w-2 bg-blue-400 rounded-full"></span>
                      <span className="text-gray-700">{ingredient}</span>
                    </div>
                  ))}
                </div>
              </ResultSection>
            )}
            
            {/* Instructions Section */}
            {result.instructions && result.instructions.length > 0 && (
              <ResultSection 
                title="Instructions" 
                icon={Info}
                className="bg-pink-50"
              >
                <div className="space-y-4">
                  {result.instructions.map((step, index) => (
                    <div key={index} className="flex gap-4 p-4 bg-white/50 rounded-lg">
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-pink-200 text-pink-800 rounded-full font-semibold">
                        {index + 1}
                      </span>
                      <p className="text-gray-700">{step}</p>
                    </div>
                  ))}
                </div>
              </ResultSection>
            )}
            
            {/* Fun Facts Section */}
            {result.funFacts && result.funFacts.length > 0 && (
              <ResultSection 
                title={`Fun Facts about ${result.name}`} 
                icon={Info}
                className="bg-blue-50"
              >
                <ul className="space-y-3">
                  {result.funFacts.map((fact, index) => (
                    <li 
                      key={index}
                      className="flex items-start p-3 bg-white/50 rounded-lg"
                    >
                      <span className="inline-block mr-2 mt-1">
                        <svg 
                          className="w-5 h-5 text-blue-500" 
                          fill="none" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </span>
                      <span className="text-blue-700">{fact}</span>
                    </li>
                  ))}
                </ul>
              </ResultSection>
            )}
          </div>
        )}
      </div>
    </main>
  )
}