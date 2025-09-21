import Head from 'next/head'
import { motion } from 'framer-motion'
import { Rocket } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'

// Animated stars background with consistent positions
const StarsBackground = () => {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Use deterministic positioning based on fixed seeds
  const starPositions = useMemo(() => {
    const generateStar = (seed: number) => {
      const left = ((seed * 37) % 100)
      const top = ((seed * 73) % 100)
      return { left, top }
    }
    
    const largeStars = Array.from({ length: 20 }, (_, i) => ({
      id: `large-${i}`,
      ...generateStar(i + 1),
    }))
    
    const mediumStars = Array.from({ length: 40 }, (_, i) => ({
      id: `medium-${i}`,
      ...generateStar(i + 21),
    }))
    
    const smallStars = Array.from({ length: 100 }, (_, i) => ({
      id: `small-${i}`,
      ...generateStar(i + 61),
    }))
    
    return { largeStars, mediumStars, smallStars }
  }, []) // Empty dependency array - positions only calculated once
  
  if (!isClient) {
    return null // Don't render on server to avoid hydration mismatch
  }

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

export default function Home() {
  return (
    <>
      <Head>
        <title>Astronaut Career Matcher - Discover Your Space Journey</title>
        <meta name="description" content="Find which astronauts match your career path and get personalized space career advice" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
        {/* Animated stars background */}
        <StarsBackground />
        
        {/* Main content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-8">
              <span className="text-white">Astronaut</span>
              <br />
              <span className="text-white">Career Matcher</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              Discover which astronauts share your journey and unlock personalized career advice 
              for your space exploration dreams.
            </p>
            
            <Link href="/questionnaire">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-space-blue to-accent-gold text-white text-xl font-semibold px-12 py-4 rounded-lg flex items-center gap-3 mx-auto shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Rocket className="w-6 h-6" />
                Lift off
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </main>
    </>
  )
}
