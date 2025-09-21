import Head from 'next/head'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Rocket, FileText, Users, Brain, Camera } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const features = [
    {
      icon: <Rocket className="w-8 h-8" />,
      title: "Career Matching",
      description: "Discover which astronauts share your background and career path",
      color: "from-blue-500 to-purple-600"
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI-Powered Advice",
      description: "Get personalized career guidance based on astronaut experiences",
      color: "from-green-500 to-teal-600"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Interactive Visualizations",
      description: "Explore 3D network graphs connecting you to astronaut matches",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: <Camera className="w-8 h-8" />,
      title: "Space Suit Fun",
      description: "Try on a virtual space suit with our face-swap feature",
      color: "from-pink-500 to-rose-600"
    }
  ]

  return (
    <>
      <Head>
        <title>Astronaut Career Matcher - Discover Your Space Journey</title>
        <meta name="description" content="Find which astronauts match your career path and get personalized space career advice" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-space-dark via-space-navy to-space-blue">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/stars.svg')] opacity-20"></div>
          <div className="relative z-10 container mx-auto px-4 py-20">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <h1 className="text-6xl md:text-8xl font-bold mb-6">
                <span className="gradient-text">Astronaut</span>
                <br />
                <span className="text-white">Career Matcher</span>
              </h1>
              <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto">
                Discover which astronauts share your journey and unlock personalized career advice 
                for your space exploration dreams.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/questionnaire">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-primary text-lg px-8 py-4 flex items-center gap-3"
                  >
                    <FileText className="w-6 h-6" />
                    Take Questionnaire
                  </motion.button>
                </Link>
                <Link href="/upload">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-secondary text-lg px-8 py-4 flex items-center gap-3"
                  >
                    <FileText className="w-6 h-6" />
                    Upload Resume
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Features Section */}
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="gradient-text">Your Journey</span> to Space
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Experience the most comprehensive astronaut career matching platform with AI-powered insights and interactive features.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onHoverStart={() => setHoveredCard(feature.title)}
                onHoverEnd={() => setHoveredCard(null)}
                className="card group cursor-pointer"
              >
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${feature.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                <p className="text-white/70 group-hover:text-white transition-colors duration-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center bg-gradient-to-r from-space-blue/20 to-accent-gold/20 rounded-2xl p-12 border border-white/20"
          >
            <h2 className="text-4xl font-bold mb-6">
              Ready to Launch Your <span className="gradient-text">Space Career</span>?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of aspiring astronauts who have discovered their path to the stars.
            </p>
            <Link href="/questionnaire">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary text-xl px-12 py-4"
              >
                Start Your Journey Now
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </main>
    </>
  )
}
