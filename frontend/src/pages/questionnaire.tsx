import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { ChevronLeft, ChevronRight, Rocket, GraduationCap, Globe, Users, Calendar, Heart, Camera } from 'lucide-react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import SelfieCapture from '../components/SelfieCapture'

interface FormData {
  firstName: string
  nationality: string
  education: string
  languages: string
  interests: string
  hobbies: string
  selfie: string
}

const nationalityOptions = [
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'France',
  'Japan',
  'China',
  'India',
  'Brazil',
  'Australia',
  'Russia',
  'Italy',
  'Spain',
  'South Korea',
  'Other'
]

// Animated stars background with memoized positions and smooth transitions
const StarsBackground = ({ currentStep }: { currentStep: number }) => {
  // Memoize star positions so they don't change on every render
  const starPositions = useMemo(() => {
    const largeStars = Array.from({ length: 20 }, (_, i) => ({
      id: `large-${i}`,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 15 + Math.random() * 8,
      delay: Math.random() * 8,
    }))
    
    const mediumStars = Array.from({ length: 40 }, (_, i) => ({
      id: `medium-${i}`,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 12 + Math.random() * 6,
      delay: Math.random() * 6,
    }))
    
    const smallStars = Array.from({ length: 100 }, (_, i) => ({
      id: `small-${i}`,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 8 + Math.random() * 6,
      delay: Math.random() * 10,
    }))
    
    return { largeStars, mediumStars, smallStars }
  }, []) // Empty dependency array - positions only calculated once

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none bg-black">
      {/* Large bright stars */}
      {starPositions.largeStars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute w-2 h-2 bg-white rounded-full"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
          }}
          // Static stars - no animation
        />
      ))}
      
      {/* Medium stars */}
      {starPositions.mediumStars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute w-1 h-1 bg-white rounded-full"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
          }}
          // Static stars - no animation
        />
      ))}
      
      {/* Small twinkling stars */}
      {starPositions.smallStars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute w-0.5 h-0.5 bg-white rounded-full"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
          }}
          // Static stars - no animation
        />
      ))}
    </div>
  )
}

export default function Questionnaire() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>()
  
  const totalSteps = 7

  const onSubmit = async (data: FormData) => {
    console.log('=== QUESTIONNAIRE SUBMISSION START ===')
    console.log('Current step:', currentStep, 'Total steps:', totalSteps)
    console.log('Raw form data:', data)
    
    // Allow submission on the last two steps (hobbies or selfie)
    if (currentStep < totalSteps - 1) {
      console.log('Not on last step, current step:', currentStep, 'total steps:', totalSteps)
      return
    }
    
    console.log('Submitting form with data:', data)
    console.log('Form errors:', errors)
    console.log('Form is valid:', Object.keys(errors).length === 0)
    
    setIsSubmitting(true)
    try {
      // Transform data to match backend expected format
      const userProfile = {
        name: data.firstName,
        nationality: data.nationality,
        education: [{ institution: data.education }],
        occupations: data.interests.split(',').map(item => item.trim()).filter(item => item),
        interests: data.hobbies.split(',').map(item => item.trim()).filter(item => item),
        languages: data.languages.split(',').map(item => item.trim()).filter(item => item),
        selfie: data.selfie || null // Make selfie truly optional
      }
      
      console.log('Transformed user profile:', userProfile)
      
      const apiUrl = '/api/similar_astronauts'
      console.log('Making API call to:', apiUrl)
      console.log('Full URL will be:', window.location.origin + apiUrl)
      console.log('Request payload:', {
        user_profile: userProfile,
        top_k: 3
      })

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile: userProfile,
          top_k: 3
        }),
      })
      
      console.log('API Response status:', response.status, response.statusText)
      console.log('API Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error response:', errorText)
        throw new Error(`Failed to get astronaut matches: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('API Response data:', result)
      
      // Store results in sessionStorage for results page
      console.log('Storing results in sessionStorage')
      sessionStorage.setItem('astronautMatches', JSON.stringify(result))
      sessionStorage.setItem('userProfile', JSON.stringify(userProfile))
      
      console.log('Navigating to results page')
      router.push('/results')
    } catch (error) {
      console.error('=== SUBMISSION ERROR ===')
      console.error('Error object:', error)
      console.error('Error message:', error instanceof Error ? error.message : String(error))
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available')
      toast.error('Failed to process your questionnaire. Please try again.')
    } finally {
      console.log('=== SUBMISSION END ===')
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      // Validate current step before proceeding
      const currentData = watch()
      let isValid = true
      
      switch (currentStep) {
        case 1:
          isValid = !!currentData.firstName?.trim()
          break
        case 2:
          isValid = !!currentData.nationality?.trim()
          break
        case 3:
          isValid = !!currentData.education?.trim()
          break
        case 4:
          isValid = !!currentData.languages?.trim()
          break
        case 5:
          isValid = !!currentData.interests?.trim()
          break
        case 6:
          isValid = !!currentData.hobbies?.trim()
          break
        case 7:
          // Selfie is optional, so always valid
          isValid = true
          break
      }
      
      if (isValid) {
        setCurrentStep(currentStep + 1)
      } else {
        toast.error('Please fill in the required field before continuing')
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (currentStep < totalSteps) {
        nextStep()
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Rocket className="w-16 h-16 mx-auto mb-4 text-space-blue" />
              <h2 className="text-4xl font-bold text-white mb-4">Hi there!</h2>
              <p className="text-xl text-white/80">What's your first name?</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <input
                {...register('firstName', { required: 'First name is required' })}
                className="input-field text-center text-xl py-4"
                placeholder="Enter your first name"
                autoFocus
                onKeyPress={handleKeyPress}
              />
              {errors.firstName && <p className="text-red-400 mt-2 text-center">{errors.firstName.message}</p>}
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Globe className="w-16 h-16 mx-auto mb-4 text-space-blue" />
              <h2 className="text-4xl font-bold text-white mb-4">Where are you from?</h2>
              <p className="text-xl text-white/80">Select your nationality</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <select
                {...register('nationality', { required: 'Nationality is required' })}
                className="input-field text-center text-xl py-4"
                autoFocus
                onKeyPress={handleKeyPress}
              >
                <option value="">Choose your nationality</option>
                {nationalityOptions.map((option) => (
                  <option key={option} value={option} className="text-space-dark">
                    {option}
                  </option>
                ))}
              </select>
              {errors.nationality && <p className="text-red-400 mt-2 text-center">{errors.nationality.message}</p>}
            </div>
          </motion.div>
        )

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 text-space-blue" />
              <h2 className="text-4xl font-bold text-white mb-4">What's your education level?</h2>
              <p className="text-xl text-white/80">Tell us about your educational background</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <input
                {...register('education', { required: 'Education is required' })}
                className="input-field text-center text-xl py-4"
                placeholder="e.g., Bachelor's in Computer Science, High School, PhD in Physics"
                autoFocus
                onKeyPress={handleKeyPress}
              />
              {errors.education && <p className="text-red-400 mt-2 text-center">{errors.education.message}</p>}
            </div>
          </motion.div>
        )

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Globe className="w-16 h-16 mx-auto mb-4 text-space-blue" />
              <h2 className="text-4xl font-bold text-white mb-4">What languages do you speak?</h2>
              <p className="text-xl text-white/80">Tell us about your language skills</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <input
                {...register('languages', { required: 'Languages are required' })}
                className="input-field text-center text-xl py-4"
                placeholder="e.g., English, Spanish, French, Mandarin"
                autoFocus
                onKeyPress={handleKeyPress}
              />
              {errors.languages && <p className="text-red-400 mt-2 text-center">{errors.languages.message}</p>}
            </div>
          </motion.div>
        )

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Users className="w-16 h-16 mx-auto mb-4 text-space-blue" />
              <h2 className="text-4xl font-bold text-white mb-4">What are your career interests?</h2>
              <p className="text-xl text-white/80">Tell us what fields or areas interest you most</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <input
                {...register('interests', { required: 'Career interests are required' })}
                className="input-field text-center text-xl py-4"
                placeholder="e.g., Engineering, Medicine, Physics, Research, Aviation"
                autoFocus
                onKeyPress={handleKeyPress}
              />
              {errors.interests && <p className="text-red-400 mt-2 text-center">{errors.interests.message}</p>}
            </div>
          </motion.div>
        )

      case 6:
        return (
          <motion.div
            key="step6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Heart className="w-16 h-16 mx-auto mb-4 text-space-blue" />
              <h2 className="text-4xl font-bold text-white mb-4">What are some hobbies, passions, or creative activities you spend time on?</h2>
              <p className="text-xl text-white/80">Tell us what makes you unique outside of work</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <textarea
                {...register('hobbies', { required: 'Hobbies are required' })}
                className="input-field h-32 resize-none text-center text-xl py-4"
                placeholder="e.g., Photography, Music, Sports, Art, Cooking, Hiking, Reading..."
                autoFocus
                onKeyPress={handleKeyPress}
              />
              {errors.hobbies && <p className="text-red-400 mt-2 text-center">{errors.hobbies.message}</p>}
            </div>
          </motion.div>
        )

      case 7:
        return (
          <motion.div
            key="step7"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Camera className="w-16 h-16 mx-auto mb-4 text-space-blue" />
              <h2 className="text-4xl font-bold text-white mb-4">Take a selfie for your astronaut look!</h2>
              <p className="text-xl text-white/80">We'll create a fun space suit photo for you (optional)</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <SelfieCapture
                onCapture={(imageData) => {
                  // Store the captured image data
                  const currentData = watch()
                  currentData.selfie = imageData
                }}
                register={register}
                errors={errors}
              />
              
              {/* Skip button for optional selfie */}
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    // Skip selfie and proceed to next step
                    setCurrentStep(currentStep + 1)
                  }}
                  className="text-white/60 hover:text-white transition-colors underline"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <>
      <Head>
        <title>Questionnaire - Astronaut Career Matcher</title>
        <meta name="description" content="Complete our questionnaire to find your astronaut matches" />
      </Head>

      <main className="min-h-screen bg-black relative overflow-hidden">
        {/* Animated stars background */}
        <StarsBackground currentStep={currentStep} />
        
        <div className="container mx-auto px-4 py-8 relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center space-x-2 text-white hover:text-space-blue transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold gradient-text">Astronaut Career Matcher</h1>
              <p className="text-white/70">Question {currentStep} of {totalSteps}</p>
            </div>
            
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="w-full bg-white/20 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-space-blue to-accent-gold h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Form */}
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit(onSubmit)}>
              {renderStep()}
              
              {/* Navigation Buttons */}
              <div className="flex justify-between mt-12">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Previous</span>
                </button>
                
                {currentStep < totalSteps - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary flex items-center space-x-2 px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    <span>Continue</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={(e) => {
                      console.log('Find My Matches button clicked')
                      console.log('Current step:', currentStep)
                      console.log('Total steps:', totalSteps)
                      console.log('Form errors:', errors)
                    }}
                    className="btn-primary flex items-center space-x-2 px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Finding your matches...</span>
                      </>
                    ) : (
                      <>
                        <Rocket className="w-5 h-5" />
                        <span>Find My Matches</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
