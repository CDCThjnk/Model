import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { ChevronLeft, ChevronRight, Rocket, GraduationCap, Globe, Users, Calendar, Heart } from 'lucide-react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

interface FormData {
  name: string
  age: number
  nationality: string
  education: string[]
  major: string
  languages: string[]
  careerInterests: string[]
  teamworkPreference: string
  ageAtMission: number
  hobbies: string[]
  leadershipExperience: string
  technicalSkills: string[]
}

const educationOptions = [
  'High School',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'PhD',
  'Professional Degree'
]

const languageOptions = [
  'English',
  'Spanish',
  'French',
  'German',
  'Russian',
  'Chinese',
  'Japanese',
  'Arabic',
  'Portuguese',
  'Italian'
]

const careerInterests = [
  'Engineering',
  'Medicine',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Psychology',
  'Geology',
  'Astronomy',
  'Mathematics',
  'Education',
  'Military',
  'Aviation',
  'Research'
]

const technicalSkills = [
  'Programming',
  'Data Analysis',
  'Machine Learning',
  'Robotics',
  'Electronics',
  'Mechanical Design',
  'Software Development',
  'Network Administration',
  'Database Management',
  'Cybersecurity'
]

export default function Questionnaire() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>()
  
  const totalSteps = 6

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      // Transform data to match backend expected format
      const userProfile = {
        name: data.name,
        age: data.age,
        nationality: data.nationality,
        education: data.education.map(edu => ({ institution: edu })),
        occupations: data.careerInterests,
        interests: data.hobbies,
        languages: data.languages,
        technical_skills: data.technicalSkills,
        teamwork_preference: data.teamworkPreference,
        age_at_mission: data.ageAtMission,
        leadership_experience: data.leadershipExperience,
        major: data.major
      }

      const response = await fetch('http://127.0.0.1:4000/similar_astronauts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile: userProfile,
          top_k: 3
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get astronaut matches')
      }

      const result = await response.json()
      
      // Store results in sessionStorage for results page
      sessionStorage.setItem('astronautMatches', JSON.stringify(result))
      sessionStorage.setItem('userProfile', JSON.stringify(userProfile))
      
      router.push('/results')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to process your questionnaire. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
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
              <h2 className="text-3xl font-bold gradient-text mb-2">Personal Information</h2>
              <p className="text-white/70">Let's start with some basic information about you</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Full Name</label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="input-field"
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="text-red-400 mt-1">{errors.name.message}</p>}
              </div>
              
              <div>
                <label className="block text-white font-medium mb-2">Age</label>
                <input
                  {...register('age', { required: 'Age is required', min: 16, max: 100 })}
                  type="number"
                  className="input-field"
                  placeholder="Enter your age"
                />
                {errors.age && <p className="text-red-400 mt-1">{errors.age.message}</p>}
              </div>
              
              <div>
                <label className="block text-white font-medium mb-2">Nationality</label>
                <input
                  {...register('nationality', { required: 'Nationality is required' })}
                  className="input-field"
                  placeholder="e.g., American, Canadian, British"
                />
                {errors.nationality && <p className="text-red-400 mt-1">{errors.nationality.message}</p>}
              </div>
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
              <GraduationCap className="w-16 h-16 mx-auto mb-4 text-space-blue" />
              <h2 className="text-3xl font-bold gradient-text mb-2">Education & Background</h2>
              <p className="text-white/70">Tell us about your educational journey</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Education Level</label>
                <div className="grid grid-cols-2 gap-3">
                  {educationOptions.map((option) => (
                    <label key={option} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        {...register('education')}
                        type="checkbox"
                        value={option}
                        className="rounded border-white/30 bg-white/10 text-space-blue focus:ring-space-blue"
                      />
                      <span className="text-white">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-white font-medium mb-2">Major/Field of Study</label>
                <input
                  {...register('major', { required: 'Major is required' })}
                  className="input-field"
                  placeholder="e.g., Aerospace Engineering, Physics, Medicine"
                />
                {errors.major && <p className="text-red-400 mt-1">{errors.major.message}</p>}
              </div>
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
              <Globe className="w-16 h-16 mx-auto mb-4 text-space-blue" />
              <h2 className="text-3xl font-bold gradient-text mb-2">Languages & Skills</h2>
              <p className="text-white/70">What languages do you speak and what are your technical skills?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Languages</label>
                <div className="grid grid-cols-2 gap-3">
                  {languageOptions.map((language) => (
                    <label key={language} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        {...register('languages')}
                        type="checkbox"
                        value={language}
                        className="rounded border-white/30 bg-white/10 text-space-blue focus:ring-space-blue"
                      />
                      <span className="text-white">{language}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-white font-medium mb-2">Technical Skills</label>
                <div className="grid grid-cols-2 gap-3">
                  {technicalSkills.map((skill) => (
                    <label key={skill} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        {...register('technicalSkills')}
                        type="checkbox"
                        value={skill}
                        className="rounded border-white/30 bg-white/10 text-space-blue focus:ring-space-blue"
                      />
                      <span className="text-white">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>
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
              <Users className="w-16 h-16 mx-auto mb-4 text-space-blue" />
              <h2 className="text-3xl font-bold gradient-text mb-2">Career & Interests</h2>
              <p className="text-white/70">What career paths and interests drive you?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Career Interests</label>
                <div className="grid grid-cols-2 gap-3">
                  {careerInterests.map((interest) => (
                    <label key={interest} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        {...register('careerInterests')}
                        type="checkbox"
                        value={interest}
                        className="rounded border-white/30 bg-white/10 text-space-blue focus:ring-space-blue"
                      />
                      <span className="text-white">{interest}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-white font-medium mb-2">Teamwork Preference</label>
                <select
                  {...register('teamworkPreference', { required: 'Teamwork preference is required' })}
                  className="input-field"
                >
                  <option value="">Select your preference</option>
                  <option value="leader">I prefer to lead</option>
                  <option value="collaborator">I prefer to collaborate equally</option>
                  <option value="supporter">I prefer to support the team</option>
                  <option value="independent">I prefer to work independently</option>
                </select>
                {errors.teamworkPreference && <p className="text-red-400 mt-1">{errors.teamworkPreference.message}</p>}
              </div>
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
              <Calendar className="w-16 h-16 mx-auto mb-4 text-space-blue" />
              <h2 className="text-3xl font-bold gradient-text mb-2">Mission Timeline</h2>
              <p className="text-white/70">When do you envision yourself going to space?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Age at Mission</label>
                <input
                  {...register('ageAtMission', { required: 'Age at mission is required', min: 25, max: 65 })}
                  type="number"
                  className="input-field"
                  placeholder="At what age would you like to go to space?"
                />
                {errors.ageAtMission && <p className="text-red-400 mt-1">{errors.ageAtMission.message}</p>}
              </div>
              
              <div>
                <label className="block text-white font-medium mb-2">Leadership Experience</label>
                <select
                  {...register('leadershipExperience', { required: 'Leadership experience is required' })}
                  className="input-field"
                >
                  <option value="">Select your experience level</option>
                  <option value="none">No formal leadership experience</option>
                  <option value="some">Some leadership experience</option>
                  <option value="extensive">Extensive leadership experience</option>
                  <option value="executive">Executive leadership experience</option>
                </select>
                {errors.leadershipExperience && <p className="text-red-400 mt-1">{errors.leadershipExperience.message}</p>}
              </div>
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
              <h2 className="text-3xl font-bold gradient-text mb-2">Personal Interests</h2>
              <p className="text-white/70">What hobbies and interests make you unique?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Hobbies & Interests</label>
                <textarea
                  {...register('hobbies')}
                  className="input-field h-32 resize-none"
                  placeholder="Tell us about your hobbies, interests, and what you enjoy doing in your free time..."
                />
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

      <main className="min-h-screen bg-gradient-to-br from-space-dark via-space-navy to-space-blue">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center space-x-2 text-white hover:text-space-blue transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold gradient-text">Astronaut Career Matcher</h1>
              <p className="text-white/70">Step {currentStep} of {totalSteps}</p>
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
              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Previous</span>
                </button>
                
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
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
