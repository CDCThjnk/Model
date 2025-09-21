import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Rocket, Star, Moon, Target, ChevronRight, ChevronLeft, Camera } from 'lucide-react'
import Head from 'next/head'
import Link from 'next/link'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Sphere, Line } from '@react-three/drei'
import * as THREE from 'three'
import toast from 'react-hot-toast'

// ===== INTERFACES =====
interface AstronautMatch {
  name?: string
  'Profile.Name'?: string
  'Profile.Nationality'?: string
  'Profile.Birth Year'?: number
  'Profile.Lifetime Statistics.Mission duration'?: number
  'Profile.Lifetime Statistics.Mission count'?: number
  'Mission.Role'?: string
  similarity: number
  education?: any[]
  occupations?: string[]
  interests?: string[]
  nationality?: string
  age?: number
  time_in_space?: string
  degrees?: string[]
  // AI-generated biography for the astronaut
  biography?: string
  // Career timeline points for the astronaut
  careerTimeline?: string[]
}

interface UserProfile {
  name: string
  age?: number
  nationality?: string
  education?: any[]
  occupations?: string[]
  interests?: string[]
  // User's selfie for face swap
  selfie?: string
}

interface MatchResults {
  top_astronauts: AstronautMatch[]
  role_scores: Record<string, number>
}

// ===== MAIN COMPONENT =====
export default function Results() {
  // State management for the slide presentation
  const [currentSlide, setCurrentSlide] = useState(0)
  const [matches, setMatches] = useState<MatchResults | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [faceSwapImage, setFaceSwapImage] = useState<string | null>(null)
  
  // Analysis screen states
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [astronautCount, setAstronautCount] = useState(0)
  const [biographiesGenerated, setBiographiesGenerated] = useState(0)
  const [totalAstronauts, setTotalAstronauts] = useState(570)
  
  // Animation states
  const [rocketPosition, setRocketPosition] = useState(0)
  const [starsVisible, setStarsVisible] = useState(false)

  // ===== EFFECTS =====
  useEffect(() => {
    // Load data from sessionStorage on component mount
    const storedMatches = sessionStorage.getItem('astronautMatches')
    const storedProfile = sessionStorage.getItem('userProfile')
    
    console.log('=== DEBUGGING SESSION STORAGE ===')
    console.log('Raw storedMatches:', storedMatches)
    console.log('Raw storedProfile:', storedProfile)
    console.log('All sessionStorage keys:', Object.keys(sessionStorage))
    
    if (storedMatches && storedProfile) {
      try {
      const parsedMatches = JSON.parse(storedMatches)
        const parsedProfile = JSON.parse(storedProfile)
        
        console.log('Parsed matches:', parsedMatches)
        console.log('Parsed profile:', parsedProfile)
        
        // Use exact astronauts returned (no padding to avoid duplicates)
        const topAstronauts = parsedMatches.top_astronauts || []
        console.log('Loaded astronauts from sessionStorage:', topAstronauts)
        console.log('First astronaut name:', topAstronauts[0]?.name)
        console.log('First astronaut keys:', topAstronauts[0] ? Object.keys(topAstronauts[0]) : 'No astronauts')
        console.log('First astronaut full object:', topAstronauts[0])
        
        setMatches({
          ...parsedMatches,
          top_astronauts: topAstronauts
        })
        setUserProfile(parsedProfile)
        
        // Start analysis process
        startAnalysisProcess(topAstronauts)
        
      } catch (error) {
        console.error('Error parsing stored data:', error)
        toast.error('Error loading results')
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [])

  // Handle face swap when userProfile is ready
  useEffect(() => {
    if (userProfile?.selfie && matches?.top_astronauts) {
      console.log('Processing face swap for user selfie')
      processFaceSwap(userProfile.selfie).then(result => {
        console.log('Face swap result:', result ? 'Success' : 'Failed')
        if (result) {
          console.log('Face swap completed successfully')
          setFaceSwapImage(result)
        } else {
          console.log('Face swap failed, using fallback')
          setFaceSwapImage('fallback')
        }
      }).catch(error => {
        console.error('Face swap error:', error)
        setFaceSwapImage('fallback')
      })
    } else if (userProfile && !userProfile.selfie) {
      console.log('No selfie provided, using fallback')
      setFaceSwapImage('fallback')
    }
  }, [userProfile, matches])

  // ===== HELPER FUNCTIONS =====
  
  // Start the analysis process with dynamic counter
  const startAnalysisProcess = async (astronauts: AstronautMatch[]) => {
    console.log('Starting analysis process with astronauts:', astronauts)
    setIsLoading(false) // Hide the old loading screen
    setIsAnalyzing(true) // Show the new analysis screen
    setStarsVisible(true)
    
    // Animate counter from 0 to 570 astronauts over 6 seconds
    let currentCount = 0
    const counterInterval = setInterval(() => {
      currentCount += Math.floor(Math.random() * 8) + 5 // Random increment 5-13 (slower)
      if (currentCount >= 570) {
        currentCount = 570
        clearInterval(counterInterval)
      }
      setAstronautCount(currentCount)
    }, 60) // 60ms interval for smoother animation
    
    // Show results after exactly 8 seconds for longer display
    setTimeout(() => {
      console.log('Analysis complete, moving to results')
      clearInterval(counterInterval) // Stop counter
      setAstronautCount(570) // Ensure it shows 570
      setIsAnalyzing(false)
      setCurrentSlide(0) // Move to first results slide
    }, 8000) // Exactly 8 seconds for longer display
    
    // Generate biographies and timelines in background (completely async)
    setTimeout(async () => {
      generateAstronautBiographies(astronauts)
      await generateCareerTimelines(astronauts)
      
      // Force state update to trigger timeline re-render
      setMatches(prev => prev ? {
        ...prev,
        top_astronauts: [...prev.top_astronauts]
      } : prev)
      
      // Process face swap for user's selfie if available
      if (userProfile?.selfie) {
        processFaceSwap(userProfile.selfie)
      }
    }, 100) // Start background processing after 100ms
  }
  
  // Generate AI-powered biographies for astronauts
  const generateAstronautBiographies = async (astronauts: AstronautMatch[]) => {
    for (let i = 0; i < astronauts.length; i++) {
      const astronaut = astronauts[i]
      try {
        const response = await fetch('/api/generate_biography', {
        method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            astronaut_name: astronaut['Profile.Name'] || astronaut.name,
            nationality: astronaut['Profile.Nationality'] || astronaut.nationality,
            mission_count: astronaut['Profile.Lifetime Statistics.Mission count'],
            mission_duration: astronaut['Profile.Lifetime Statistics.Mission duration'],
            role: astronaut['Mission.Role']
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          astronaut.biography = data.biography
        } else {
          // Fallback biography if API fails
          astronaut.biography = `A distinguished astronaut from ${astronaut['Profile.Nationality'] || 'unknown nationality'} with ${astronaut['Profile.Lifetime Statistics.Mission count'] || 0} space missions and ${astronaut['Profile.Lifetime Statistics.Mission duration'] || 0} days in space.`
        }
      } catch (error) {
        console.error('Error generating biography:', error)
        astronaut.biography = `An accomplished astronaut with extensive space experience.`
      }
      
      // Update biography generation progress
      setBiographiesGenerated(i + 1)
      
      // No delay - process as fast as possible since it's in background
    }
  }

  // Generate career timeline points for astronauts
  const generateCareerTimelines = async (astronauts: AstronautMatch[]) => {
    console.log('=== GENERATING CAREER TIMELINES ===')
    for (let i = 0; i < astronauts.length; i++) {
      const astronaut = astronauts[i]
      console.log(`Processing astronaut ${i + 1}:`, astronaut['Profile.Name'])
      try {
        const response = await fetch('/api/generate_career_timeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            astronaut_name: astronaut['Profile.Name'] || astronaut.name,
            mission_count: astronaut['Profile.Lifetime Statistics.Mission count'],
            mission_duration: astronaut['Profile.Lifetime Statistics.Mission duration'],
            role: astronaut['Mission.Role']
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          const astronautName = astronaut['Profile.Name'] || 'Unknown'
          console.log(`Timeline data for ${astronautName}:`, data)
          // Normalize to exactly 4 points
          const baseTimeline = Array.isArray(data.timeline) ? data.timeline.filter(Boolean) : []
          const normalizedTimeline = baseTimeline.slice(0, 4)
          const fallbacks = [
            'Selected for astronaut training program',
            'Completed intensive space mission preparation', 
            'First space mission launch',
            'Advanced to senior astronaut role'
          ]
          while (normalizedTimeline.length < 4) {
            normalizedTimeline.push(fallbacks[normalizedTimeline.length])
          }
          astronaut.careerTimeline = normalizedTimeline
          console.log(`Final timeline for ${astronautName}:`, astronaut.careerTimeline)
        } else {
          const astronautName = astronaut['Profile.Name'] || 'Unknown'
          console.log(`API failed for ${astronautName}, using fallback`)
          // Fallback timeline - exactly 4 points
          astronaut.careerTimeline = [
            'Selected for astronaut training program',
            'Completed intensive space mission preparation',
            'First space mission launch',
            'Advanced to senior astronaut role'
          ]
        }
    } catch (error) {
        console.error(`Error generating timeline for ${astronaut['Profile.Name']}:`, error)
        astronaut.careerTimeline = [
          'Astronaut training',
          'First mission',
          'Advanced missions',
          'Senior role'
        ]
      }
    }
    console.log('=== CAREER TIMELINES COMPLETE ===')
  }

  // Generate user's current career development steps
  const generateUserCareerSuggestions = (userProfile: UserProfile): string[] => {
    const suggestions = []
    const interests = userProfile.interests || []
    const education = userProfile.education?.[0]?.institution || 'your field'
    
    // More grounded, current steps based on interests
    if (interests.includes('Engineering') || interests.includes('engineering')) {
      suggestions.push('Join engineering professional organizations')
      suggestions.push('Complete aerospace engineering projects')
    }
    if (interests.includes('Medicine') || interests.includes('medicine')) {
      suggestions.push('Volunteer in emergency medical services')
      suggestions.push('Study human physiology and space health')
    }
    if (interests.includes('Physics') || interests.includes('physics')) {
      suggestions.push('Participate in physics research projects')
      suggestions.push('Attend space science conferences')
    }
    
    // Default grounded suggestions
    suggestions.push('Join local astronomy or space clubs')
    suggestions.push('Volunteer for STEM education programs')
    suggestions.push('Start regular physical fitness routine')
    suggestions.push('Learn about space industry careers')
    
    // Ensure exactly 4 suggestions
    const finalSuggestions = suggestions.slice(0, 4)
    while (finalSuggestions.length < 4) {
      const fallbacks = [
        'Build technical skills in STEM fields',
        'Develop leadership and teamwork abilities',
        'Gain experience in high-pressure environments',
        'Pursue advanced education opportunities'
      ]
      finalSuggestions.push(fallbacks[finalSuggestions.length % fallbacks.length])
    }
    
    return finalSuggestions // Always return exactly 4 suggestions
  }

  // Professional face swap processing using backend API with OpenCV
  const processFaceSwap = async (selfieData: string) => {
    if (!selfieData) {
      console.log('📷 No selfie data provided for face swap')
      return null
    }
    
    try {
      console.log('🎭 Starting face swap API call...')
      console.log('📏 Selfie data length:', selfieData.length, 'characters')
      
      const response = await fetch('/api/process_face_swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selfie: selfieData
        }),
      })
      
      console.log('🔍 Face swap API response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Face swap API success!')
        console.log('📤 Result image length:', result.astronaut_image?.length || 0, 'characters')
        return result.astronaut_image
      } else {
        console.log('❌ Face swap API failed with status:', response.status)
        const errorText = await response.text()
        console.log('📜 Error details:', errorText)
        return null
      }
    } catch (error) {
      console.error('❌ Face swap processing error:', error)
      return null
    }
  }

  // ===== ANIMATION COMPONENTS =====
  
  // Animated stars background with memoized positions
  const StarsBackground = () => {
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
          <div
            key={star.id}
            className="absolute w-2 h-2 bg-white rounded-full"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
            }}
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

  // Analysis screen with dynamic counter
  const AnalysisScreen = () => (
    <motion.div
      className="fixed inset-0 bg-black flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center max-w-2xl mx-auto px-8">
        {/* Main text */}
        <motion.h1
          className="text-5xl font-bold text-white mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Analyzing Your Profile...
        </motion.h1>
        
        {/* Dynamic counter - main focus */}
        <motion.div
          className="text-8xl font-mono text-accent-gold mb-4 font-bold drop-shadow-2xl"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          style={{ textShadow: '0 0 20px rgba(245, 158, 11, 0.5)' }}
        >
          {astronautCount.toLocaleString()}
        </motion.div>
        
        <motion.div
          className="text-3xl text-white/90 mb-8 font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          astronauts scanned
        </motion.div>
        
        {/* Status messages */}
        <motion.div
          className="space-y-4 text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <motion.p
            className="text-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Searching through our astronaut database...
          </motion.p>
          
          {astronautCount >= 570 && (
            <motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-2xl font-bold text-accent-gold"
            >
              Found 2 matches!
            </motion.p>
          )}
        </motion.div>
      </div>
    </motion.div>
  )

  // Spider graph component for role similarity scores
  const SpiderGraph = ({ scores }: { scores: Record<string, number> }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [animationProgress, setAnimationProgress] = useState(0)
    
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radius = 250
      const categories = Object.keys(scores)
      const values = Object.values(scores)
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw grid circles
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath()
        ctx.arc(centerX, centerY, (radius * i) / 5, 0, 2 * Math.PI)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      
      // Draw category lines
      categories.forEach((category, index) => {
        const angle = (index * 2 * Math.PI) / categories.length - Math.PI / 2
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(x, y)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        
        // Draw category labels (positioned closer to center)
        ctx.fillStyle = 'white'
        ctx.font = 'bold 18px Inter'
        ctx.textAlign = 'center'
        ctx.fillText(category, x + Math.cos(angle) * 40, y + Math.sin(angle) * 40)
        
        // Draw values at the end of each axis (positioned much further out)
        const value = (values[index] || 0) * 2 * animationProgress
        ctx.fillStyle = '#F59E0B'
        ctx.font = 'bold 20px Inter'
        ctx.fillText(`${(value * 100).toFixed(0)}%`, x + Math.cos(angle) * 100, y + Math.sin(angle) * 100)
      })
      
      // Draw data polygon with animation
      ctx.beginPath()
      categories.forEach((category, index) => {
        const angle = (index * 2 * Math.PI) / categories.length - Math.PI / 2
        const value = (values[index] || 0) * 2 * animationProgress // Apply animation progress and multiply by 2
        const x = centerX + Math.cos(angle) * radius * value
        const y = centerY + Math.sin(angle) * radius * value
        
        if (index === 0) {
          ctx.moveTo(x, y)
    } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.closePath()
      ctx.fillStyle = 'rgba(59, 130, 246, 0.4)'
      ctx.fill()
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 3
      ctx.stroke()
    }, [scores, animationProgress])
    
    // Animate the spider graph smoothly and keep it visible
    useEffect(() => {
      const duration = 3000 // 3 seconds for slower, more visible animation
      const startTime = Date.now()
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        setAnimationProgress(progress)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          // Ensure it stays at 1 (fully visible) after animation completes
          setAnimationProgress(1)
        }
      }
      
      const timer = setTimeout(() => {
        requestAnimationFrame(animate)
      }, 200) // Start animation after 200ms
      
      return () => clearTimeout(timer)
    }, [])
    
    return (
      <div className="relative w-full h-[600px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={700}
          height={700}
          className="max-w-full max-h-full"
        />
        {animationProgress === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-accent-gold text-lg font-bold"
          >
            Analysis Complete
          </motion.div>
        )}
      </div>
    )
  }

  // Career timeline component
  const CareerTimeline = ({ 
    astronautTimeline, 
    userTimeline, 
    astronautName 
  }: { 
    astronautTimeline: string[], 
    userTimeline: string[], 
    astronautName: string 
  }) => {
    const [rocketProgress, setRocketProgress] = useState(0)
    
    useEffect(() => {
      const timer = setTimeout(() => {
        setRocketProgress(100)
      }, 1000)
      return () => clearTimeout(timer)
    }, [])
    
    return (
      <div className="relative">
        {/* Astronaut Timeline (Top) */}
        <div className="mb-12">
          <h3 className="text-xl font-bold text-white mb-6">{astronautName}'s Journey</h3>
          <div className="relative bg-white/10 rounded-lg p-6 min-h-48">
            {/* Main timeline container */}
            <div className="relative pt-8 pb-4">
              {/* Timeline line - horizontal across the container */}
              <div className="absolute top-12 left-8 right-8 h-0.5 bg-accent-gold z-10"></div>
              
              {/* Timeline points */}
              <div className="flex justify-between items-start px-8">
                {astronautTimeline.map((point, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    {/* Star positioned on the timeline line */}
                    <motion.div
                      className="w-6 h-6 bg-accent-gold rounded-full flex items-center justify-center border-2 border-accent-gold z-20 relative"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.2 }}
                    >
                      {index === astronautTimeline.length - 1 ? (
                        <Moon className="w-4 h-4 text-space-dark" />
                      ) : (
                        <Star className="w-4 h-4 text-space-dark" />
                      )}
                    </motion.div>
                    
                    {/* Text box positioned below the star */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10 mt-4 max-w-36 text-center">
                      <p className="text-xs text-white font-medium leading-tight">{point}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <motion.div
              className="absolute top-2 right-2"
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              transition={{ delay: 2 }}
            >
              <Rocket className="w-6 h-6 text-accent-gold" />
            </motion.div>
          </div>
        </div>
        
        {/* User Timeline (Bottom) */}
        <div className="mt-8">
          <h3 className="text-xl font-bold text-white mb-6">Your Journey</h3>
          <div className="relative bg-white/10 rounded-lg p-6 min-h-48">
            {/* Main timeline container */}
            <div className="relative pt-8 pb-4">
              {/* Timeline line - horizontal across the container */}
              <div className="absolute top-12 left-8 right-8 h-0.5 bg-space-blue z-10"></div>
              
              {/* Timeline points */}
              <div className="flex justify-between items-start px-8">
                {userTimeline.map((point, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    {/* Star positioned on the timeline line */}
                    <motion.div
                      className="w-6 h-6 bg-space-blue rounded-full flex items-center justify-center border-2 border-space-blue z-20 relative"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.2 }}
                    >
                      {index === userTimeline.length - 1 ? (
                        <Moon className="w-4 h-4 text-white" />
                      ) : (
                        <Star className="w-4 h-4 text-white" />
                      )}
                    </motion.div>
                    
                    {/* Text box positioned below the star */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10 mt-4 max-w-36 text-center">
                      <p className="text-xs text-white font-medium leading-tight">{point}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <motion.div
              className="absolute top-2 left-2"
              animate={{ x: rocketProgress * 2.5 }}
              transition={{ duration: 3, ease: "easeInOut" }}
            >
              <Rocket className="w-6 h-6 text-space-blue" />
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  // ===== SLIDE COMPONENTS =====
  
  // Slide 1: Top 2 astronaut matches with biographies
  const Slide1 = () => (
    <motion.div
      key="slide1"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="min-h-screen flex items-center justify-center p-8 bg-black/50"
    >
      <div className="max-w-6xl mx-auto">
        <motion.h1
          className="text-5xl font-bold text-center mb-12 gradient-text"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Your Astronaut Matches
        </motion.h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {matches?.top_astronauts.slice(0, 3).map((astronaut, index) => (
            <motion.div
              key={index}
              className="card p-8"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.3 }}
            >
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-r from-space-blue to-accent-gold rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {(astronaut['Profile.Name'] || astronaut.name || 'Unknown').split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {astronaut['Profile.Name'] || astronaut.name || 'Unknown Astronaut'}
                </h3>
                <p className="text-accent-gold font-semibold">
                  {Math.round((astronaut.similarity || 0) * 100)}% Match
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Biography</h4>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {astronaut.biography || 'Loading biography...'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/60">Nationality:</span>
                    <p className="text-white">{astronaut['Profile.Nationality'] || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-white/60">Missions:</span>
                    <p className="text-white">{astronaut['Profile.Lifetime Statistics.Mission count'] || 0}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )

  // Slide 2: Role similarity spider graph
  const Slide2 = () => (
    <motion.div
      key="slide2"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="min-h-screen flex items-center justify-center p-8 bg-black/50"
    >
      <div className="max-w-6xl mx-auto">
        <motion.h1
          className="text-5xl font-bold text-center mb-12 gradient-text"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Role Similarity Analysis
        </motion.h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex justify-center"
          >
            <SpiderGraph scores={matches?.role_scores || {}} />
          </motion.div>
          
          <motion.div
            className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
          >
            <h3 className="text-2xl font-bold text-white mb-4">Analysis</h3>
            <p className="text-white/80 text-lg leading-relaxed">
              Based on your interests, our model indicates that you show strong potential in mission specialist roles, with particular strength in technical and operational areas.
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )

  // Slide 3: Career timelines and face swap
  const Slide3 = () => (
    <motion.div
      key="slide3"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="min-h-screen flex items-center justify-center p-8 bg-black/50"
    >
      <div className="max-w-7xl mx-auto">
        <motion.h1
          className="text-5xl font-bold text-center mb-12 gradient-text"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Your Journey to Space
        </motion.h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Face Swap Section */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="card p-6 text-center">
              <h3 className="text-xl font-bold text-white mb-4">Your Astronaut Look</h3>
              {faceSwapImage && faceSwapImage !== 'fallback' ? (
                <img
                  src={faceSwapImage}
                  alt="Your astronaut selfie"
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
              ) : (
                <div className="w-full h-64 bg-white/10 rounded-lg flex items-center justify-center mb-4">
                  <Camera className="w-12 h-12 text-white/50" />
                </div>
              )}
              <p className="text-white/70 text-sm">
                {faceSwapImage && faceSwapImage !== 'fallback' ? 'Ready for your space mission!' : 
                 faceSwapImage === 'fallback' ? 'Take a selfie in the questionnaire to see your astronaut look!' : 'Face swap processing...'}
              </p>
            </div>
          </motion.div>
          
          {/* Career Timelines */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
          >
            <CareerTimeline
              astronautTimeline={matches?.top_astronauts[0]?.careerTimeline || []}
              userTimeline={userProfile ? generateUserCareerSuggestions(userProfile) : []}
              astronautName={matches?.top_astronauts[0]?.['Profile.Name'] || matches?.top_astronauts[0]?.name || 'Astronaut'}
            />
            
            {/* Summary */}
            <motion.div
              className="mt-8 mb-20 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
            >
              <h3 className="text-xl font-bold text-white mb-4">Summary</h3>
              <p className="text-white/80 leading-relaxed">
                Your profile shows remarkable alignment with accomplished astronauts. 
                Focus on building technical expertise, leadership skills, and maintaining 
                physical fitness to advance toward your space career goals.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )

  // ===== NAVIGATION FUNCTIONS =====
  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  // ===== MAIN RENDER =====
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          className="text-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Rocket className="w-16 h-16 text-accent-gold mx-auto mb-4" />
          <p className="text-white text-xl">Loading...</p>
        </motion.div>
      </div>
    )
  }

  if (!matches || !userProfile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">No Results Found</h1>
          <p className="text-white/70 mb-8">Please complete the questionnaire first.</p>
          <Link href="/questionnaire">
            <button className="btn-primary">Take Questionnaire</button>
          </Link>
        </div>
      </div>
    )
  }

  const slides = [Slide1, Slide2, Slide3]

  return (
    <>
      <Head>
        <title>Your Astronaut Matches - Results</title>
        <meta name="description" content="Discover your astronaut matches and career path" />
      </Head>

      <main className="min-h-screen bg-black relative overflow-hidden">
        {/* Animated stars background */}
        {starsVisible && <StarsBackground />}
        
        {/* Debug button */}
        <button 
          onClick={() => {
            console.log('Clearing all storage...')
            sessionStorage.clear()
            localStorage.clear()
            console.log('Storage cleared, reloading...')
            window.location.href = '/questionnaire'
          }}
          className="fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
        >
          Clear Cache & Go to Questionnaire
        </button>
        
        {/* Analysis screen */}
        {isAnalyzing && <AnalysisScreen />}
        
        {/* Navigation header */}
        <div className="absolute top-0 left-0 right-0 z-40 p-6">
          <div className="flex justify-between items-center">
            <Link href="/questionnaire">
              <motion.button
                className="flex items-center space-x-2 text-white hover:text-space-blue transition-colors"
                whileHover={{ scale: 1.05 }}
              >
              <ArrowLeft className="w-5 h-5" />
                <span>Back to Questionnaire</span>
              </motion.button>
            </Link>
            
            <div className="flex space-x-2">
              {slides.map((_, index) => (
                <div
                      key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-accent-gold' : 'bg-white/30'
                  }`}
                />
              ))}
                          </div>
                        </div>
                      </div>
                      
        {/* Slide content */}
        {!isAnalyzing && (
          <AnimatePresence mode="wait">
            {slides[currentSlide]()}
          </AnimatePresence>
        )}

        {/* Navigation footer */}
        <div className="absolute bottom-0 left-0 right-0 z-40 p-6">
          <div className="flex justify-between items-center">
            {/* Previous button */}
            {currentSlide > 0 && (
              <motion.button
                onClick={prevSlide}
                className="btn-secondary flex items-center space-x-2 px-6 py-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous</span>
              </motion.button>
            )}
            
            {/* Spacer when no previous button */}
            {currentSlide === 0 && <div></div>}
            
            {/* Next/Start Over button */}
            <div className="flex justify-center">
              {currentSlide < slides.length - 1 ? (
                <motion.button
                  onClick={nextSlide}
                  className="btn-primary flex items-center space-x-2 px-8 py-4 text-lg font-semibold"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>Next</span>
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => setCurrentSlide(0)}
                  className="btn-secondary flex items-center space-x-2 px-8 py-4 text-lg font-semibold"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Rocket className="w-5 h-5" />
                  <span>Start Over</span>
                </motion.button>
              )}
            </div>
            
            {/* Spacer for alignment */}
            <div></div>
          </div>
        </div>
      </main>
    </>
  )
}