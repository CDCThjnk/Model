import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Share2, Camera, Star, Users, Brain, Target } from 'lucide-react'
import Head from 'next/head'
import Link from 'next/link'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Sphere, Line } from '@react-three/drei'
import * as THREE from 'three'
import toast from 'react-hot-toast'
import FaceSwap from '../components/FaceSwap'

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
}

interface UserProfile {
  name: string
  age?: number
  nationality?: string
  education?: any[]
  occupations?: string[]
  interests?: string[]
}

interface MatchResults {
  top_astronauts: AstronautMatch[]
  role_scores: Record<string, number>
}

export default function Results() {
  const [matches, setMatches] = useState<MatchResults | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [selectedAstronaut, setSelectedAstronaut] = useState<AstronautMatch | null>(null)
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false)
  const [careerAdvice, setCareerAdvice] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const storedMatches = sessionStorage.getItem('astronautMatches')
    const storedProfile = sessionStorage.getItem('userProfile')
    
    if (storedMatches) {
      const parsedMatches = JSON.parse(storedMatches)
      console.log('Astronaut matches data:', parsedMatches)
      if (parsedMatches.top_astronauts?.length > 0) {
        console.log('First astronaut data:', parsedMatches.top_astronauts[0])
      }
      setMatches(parsedMatches)
    }
    if (storedProfile) {
      setUserProfile(JSON.parse(storedProfile))
    }
    
    if (storedMatches) {
      const parsedMatches = JSON.parse(storedMatches)
      if (parsedMatches.top_astronauts?.length > 0) {
        setSelectedAstronaut(parsedMatches.top_astronauts[0])
      }
    }
  }, [])

  const generateCareerAdvice = async () => {
    if (!selectedAstronaut || !userProfile) return

    setIsGeneratingAdvice(true)
    try {
      const response = await fetch('http://127.0.0.1:4000/generate_advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile: userProfile,
          astronaut_match: {
            ...selectedAstronaut,
            name: selectedAstronaut.name || selectedAstronaut['Profile.Name'] || 'Unknown Astronaut'
          },
          similarity_score: selectedAstronaut.similarity
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate advice')
      }

      const result = await response.json()
      setCareerAdvice(result.advice)
    } catch (error) {
      console.error('Error generating advice:', error)
      toast.error('Failed to generate career advice. Please try again.')
    } finally {
      setIsGeneratingAdvice(false)
    }
  }

  const downloadReport = () => {
    if (!matches || !userProfile) return

    const report = {
      user_profile: userProfile,
      matches: matches.top_astronauts,
      role_scores: matches.role_scores,
      generated_at: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'astronaut-career-report.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Report downloaded successfully!')
  }

  const shareResults = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Astronaut Career Matches',
        text: `I found my astronaut matches! My top match is ${matches?.top_astronauts[0]?.name} with ${Math.round((matches?.top_astronauts[0]?.similarity || 0) * 100)}% similarity.`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Results link copied to clipboard!')
    }
  }

  if (!matches || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-space-dark via-space-navy to-space-blue flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No Results Found</h1>
          <p className="text-white/70 mb-6">Please complete the questionnaire or upload your resume first.</p>
          <Link href="/">
            <button className="btn-primary">Go Back Home</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Your Astronaut Matches - Astronaut Career Matcher</title>
        <meta name="description" content="Discover your astronaut career matches and personalized advice" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-space-dark via-space-navy to-space-blue">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center space-x-2 text-white hover:text-space-blue transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold gradient-text">Your Astronaut Matches</h1>
              <p className="text-white/70">Discover your space career path</p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={downloadReport}
                className="p-2 text-white/70 hover:text-white transition-colors"
                title="Download Report"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={shareResults}
                className="p-2 text-white/70 hover:text-white transition-colors"
                title="Share Results"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Astronaut Matches */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
              >
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Star className="w-6 h-6 mr-2 text-accent-gold" />
                  Your Top Matches
                </h2>
                
                <div className="space-y-4">
                  {matches.top_astronauts.map((astronaut, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
                        selectedAstronaut?.name === astronaut.name
                          ? 'border-space-blue bg-space-blue/10'
                          : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                      }`}
                      onClick={() => setSelectedAstronaut(astronaut)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white">{astronaut.name || astronaut['Profile.Name'] || 'Unknown Astronaut'}</h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-accent-gold font-bold">
                            {Math.round(astronaut.similarity * 100)}%
                          </span>
                          <div className="w-16 h-2 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-space-blue to-accent-gold"
                              initial={{ width: 0 }}
                              animate={{ width: `${astronaut.similarity * 100}%` }}
                              transition={{ delay: index * 0.1 + 0.3, duration: 0.8 }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
                        <div>
                          <p><strong>Nationality:</strong> {astronaut['Profile.Nationality'] || 'Unknown'}</p>
                          <p><strong>Age:</strong> {astronaut['Profile.Birth Year'] ? new Date().getFullYear() - astronaut['Profile.Birth Year'] : 'Unknown'}</p>
                        </div>
                        <div>
                          <p><strong>Time in Space:</strong> {astronaut['Profile.Lifetime Statistics.Mission duration'] ? `${astronaut['Profile.Lifetime Statistics.Mission duration']} days` : 'Unknown'}</p>
                          <p><strong>Missions:</strong> {astronaut['Profile.Lifetime Statistics.Mission count'] || 0}</p>
                        </div>
                      </div>
                      
                      {astronaut['Mission.Role'] && (
                        <div className="mt-3">
                          <p className="text-sm text-white/70 mb-1">Mission Role:</p>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-1 bg-space-blue/20 text-space-blue text-xs rounded-full">
                              {astronaut['Mission.Role']}
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Role Similarity Scores */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card"
              >
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-space-blue" />
                  Role Similarity Scores
                </h3>
                
                <div className="space-y-3">
                  {Object.entries(matches.role_scores).map(([role, score]) => (
                    <div key={role} className="flex items-center justify-between">
                      <span className="text-white/70 capitalize">{role}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-space-blue to-accent-gold"
                            initial={{ width: 0 }}
                            animate={{ width: `${score * 100}%` }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                          />
                        </div>
                        <span className="text-white font-semibold w-8 text-right">
                          {Math.round(score * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Selected Astronaut Details & Advice */}
            <div className="space-y-6">
              {selectedAstronaut && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="card"
                >
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-accent-gold" />
                    {selectedAstronaut.name || selectedAstronaut['Profile.Name'] || 'Unknown Astronaut'}
                  </h3>
                  
                  <div className="space-y-4">
                    {selectedAstronaut.education && selectedAstronaut.education.length > 0 && (
                      <div>
                        <h4 className="text-white font-medium mb-2">Education</h4>
                        <div className="space-y-1 text-white/70 text-sm">
                          {selectedAstronaut.education.slice(0, 3).map((edu, index) => (
                            <p key={index}>• {edu.institution || edu}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedAstronaut.interests && selectedAstronaut.interests.length > 0 && (
                      <div>
                        <h4 className="text-white font-medium mb-2">Interests</h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedAstronaut.interests.slice(0, 5).map((interest, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-accent-gold/20 text-accent-gold text-xs rounded-full"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* AI Career Advice */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="card"
              >
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-space-blue" />
                  AI Career Advice
                </h3>
                
                {careerAdvice ? (
                  <div className="text-white/80 leading-relaxed">
                    {careerAdvice}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-white/70 mb-4">
                      Get personalized career advice based on your astronaut match
                    </p>
                    <button
                      onClick={generateCareerAdvice}
                      disabled={isGeneratingAdvice}
                      className="btn-primary disabled:opacity-50"
                    >
                      {isGeneratingAdvice ? 'Generating...' : 'Generate Advice'}
                    </button>
                  </div>
                )}
              </motion.div>

              {/* Face Swap Feature */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <FaceSwap astronautName={selectedAstronaut?.name || selectedAstronaut?.['Profile.Name']} />
              </motion.div>
            </div>
          </div>

          {/* 3D Network Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8"
          >
            <div className="card">
              <h3 className="text-xl font-bold text-white mb-4">Interactive Network Visualization</h3>
              <div className="h-96 bg-black/20 rounded-lg overflow-hidden">
                <Canvas camera={{ position: [0, 0, 10] }}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} />
                  
                  {/* User node */}
                  <Sphere position={[0, 0, 0]} args={[0.5]}>
                    <meshStandardMaterial color="#3B82F6" />
                  </Sphere>
                  <Text
                    position={[0, -1, 0]}
                    fontSize={0.3}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                  >
                    You
                  </Text>
                  
                  {/* Astronaut nodes */}
                  {matches.top_astronauts.map((astronaut, index) => {
                    const angle = (index * 2 * Math.PI) / matches.top_astronauts.length
                    const x = Math.cos(angle) * 3
                    const z = Math.sin(angle) * 3
                    
                    return (
                      <group key={index}>
                        <Sphere position={[x, 0, z]} args={[0.3]}>
                          <meshStandardMaterial color="#F59E0B" />
                        </Sphere>
                        <Text
                          position={[x, -0.8, z]}
                          fontSize={0.2}
                          color="white"
                          anchorX="center"
                          anchorY="middle"
                        >
                          {(astronaut.name || astronaut['Profile.Name'] || 'Astronaut').split(' ')[0]}
                        </Text>
                        <Line
                          points={[[0, 0, 0], [x, 0, z]]}
                          color="white"
                          opacity={astronaut.similarity}
                          lineWidth={2}
                        />
                      </group>
                    )
                  })}
                  
                  <OrbitControls enableZoom={true} enablePan={true} />
                </Canvas>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </>
  )
}
