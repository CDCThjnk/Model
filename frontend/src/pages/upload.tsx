import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

export default function UploadResume() {
  const router = useRouter()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadedFile(file)
      toast.success('Resume uploaded successfully!')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB
  })

  const removeFile = () => {
    setUploadedFile(null)
    setExtractedData(null)
  }

  const processResume = async () => {
    if (!uploadedFile) return

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('resume', uploadedFile)

      const response = await fetch('http://127.0.0.1:4000/parse_resume', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to parse resume')
      }

      const result = await response.json()
      setExtractedData(result)
      
      // Store extracted data for matching
      sessionStorage.setItem('extractedProfile', JSON.stringify(result))
      
      toast.success('Resume processed successfully!')
    } catch (error) {
      console.error('Error processing resume:', error)
      toast.error('Failed to process resume. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const findMatches = async () => {
    if (!extractedData) return

    setIsProcessing(true)
    try {
      const response = await fetch('http://127.0.0.1:4000/similar_astronauts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile: extractedData,
          top_k: 3
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get astronaut matches')
      }

      const result = await response.json()
      
      // Store results for results page
      sessionStorage.setItem('astronautMatches', JSON.stringify(result))
      sessionStorage.setItem('userProfile', JSON.stringify(extractedData))
      
      router.push('/results')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to find matches. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Head>
        <title>Upload Resume - Astronaut Career Matcher</title>
        <meta name="description" content="Upload your resume to find astronaut matches" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-space-dark via-space-navy to-space-blue">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center space-x-2 text-white hover:text-space-blue transition-colors">
              <X className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold gradient-text">Upload Your Resume</h1>
              <p className="text-white/70">Let AI analyze your background</p>
            </div>
            
            <div className="w-24"></div>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Upload Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card mb-8"
            >
              <div className="text-center mb-6">
                <Upload className="w-16 h-16 mx-auto mb-4 text-space-blue" />
                <h2 className="text-2xl font-bold text-white mb-2">Upload Your Resume</h2>
                <p className="text-white/70">Supported formats: PDF, DOC, DOCX, TXT (max 5MB)</p>
              </div>

              {!uploadedFile ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? 'border-space-blue bg-space-blue/10'
                      : 'border-white/30 hover:border-space-blue hover:bg-white/5'
                  }`}
                >
                  <input {...getInputProps()} />
                  <FileText className="w-12 h-12 mx-auto mb-4 text-white/50" />
                  <p className="text-white text-lg mb-2">
                    {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume here'}
                  </p>
                  <p className="text-white/50">or click to browse files</p>
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="text-white font-medium">{uploadedFile.name}</p>
                        <p className="text-white/50 text-sm">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeFile}
                      className="text-white/50 hover:text-red-400 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={processResume}
                      disabled={isProcessing}
                      className="btn-primary disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Process Resume'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Extracted Data Preview */}
            {extractedData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card mb-8"
              >
                <h3 className="text-xl font-bold text-white mb-4">Extracted Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-white font-medium mb-2">Personal Info</h4>
                    <div className="space-y-1 text-white/70">
                      <p><strong>Name:</strong> {extractedData.name || 'Not found'}</p>
                      <p><strong>Email:</strong> {extractedData.email || 'Not found'}</p>
                      <p><strong>Phone:</strong> {extractedData.phone || 'Not found'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-white font-medium mb-2">Education</h4>
                    <div className="space-y-1 text-white/70">
                      {extractedData.education?.length > 0 ? (
                        extractedData.education.map((edu: any, index: number) => (
                          <p key={index}>
                            <strong>{edu.institution || 'Institution'}:</strong> {edu.qualification || 'Degree'}
                          </p>
                        ))
                      ) : (
                        <p>No education information found</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-white font-medium mb-2">Experience</h4>
                    <div className="space-y-1 text-white/70">
                      {extractedData.occupations?.length > 0 ? (
                        extractedData.occupations.map((occ: string, index: number) => (
                          <p key={index}>• {occ}</p>
                        ))
                      ) : (
                        <p>No experience information found</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-white font-medium mb-2">Skills</h4>
                    <div className="space-y-1 text-white/70">
                      {extractedData.skills?.length > 0 ? (
                        extractedData.skills.map((skill: string, index: number) => (
                          <p key={index}>• {skill}</p>
                        ))
                      ) : (
                        <p>No skills information found</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <button
                    onClick={findMatches}
                    disabled={isProcessing}
                    className="btn-primary text-lg px-8 py-3 disabled:opacity-50"
                  >
                    {isProcessing ? 'Finding Matches...' : 'Find My Astronaut Matches'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Alternative Option */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card text-center"
            >
              <h3 className="text-xl font-bold text-white mb-4">Prefer a Questionnaire?</h3>
              <p className="text-white/70 mb-4">
                If you'd rather answer questions about your background, we have a detailed questionnaire option.
              </p>
              <Link href="/questionnaire">
                <button className="btn-secondary">
                  Take Questionnaire Instead
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  )
}
