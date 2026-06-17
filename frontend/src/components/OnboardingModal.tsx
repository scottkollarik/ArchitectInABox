import { useState } from 'react'
import { useTheme } from '../hooks/useTheme'

interface OnboardingModalProps {
  userName: string
  onComplete: () => Promise<void>
}

export default function OnboardingModal({ userName, onComplete }: OnboardingModalProps) {
  const { theme } = useTheme()
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)

  const steps = [
    {
      title: 'Welcome to Architect-in-a-Box',
      content: (
        <div className="space-y-4">
          <p className="text-lg">
            Hi <span className="font-semibold">{userName}</span>! 👋
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            You&apos;re about to design enterprise-grade cloud architectures with AI-powered guidance.
          </p>
          <div className="space-y-3 mt-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
                1
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Design Architectures</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag-and-drop Azure services, configure NFRs, and generate cost estimates
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
                2
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">AI-Powered Analysis</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get recommendations based on Well-Architected Framework principles
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
                3
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Export & Deploy</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate Bicep templates and deployment guides
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Quick Tour',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Here&apos;s what you&apos;ll find in the platform:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">☁️ Cloud Architecture</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Visual canvas for designing your Azure infrastructure
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">📊 Inventory</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your architecture components and dependencies
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">🔌 API Development</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Design and document your API endpoints
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">🎨 Frontend Development</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Plan your UI components and user flows
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "You're All Set!",
      content: (
        <div className="space-y-4 text-center">
          <div className="text-6xl mb-4">🚀</div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            You&apos;re ready to start building enterprise-grade architectures!
          </p>
          <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              💡 <span className="font-medium">Tip:</span> Start by creating a new project in the Cloud Architecture module
            </p>
          </div>
        </div>
      ),
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await onComplete()
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      setIsCompleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-6 py-4">
          <h2 className="text-2xl font-bold text-white">{steps[currentStep].title}</h2>
          <div className="mt-2 flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded ${
                  index <= currentStep
                    ? 'bg-white'
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px]">
          {steps[currentStep].content}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {currentStep < steps.length - 1 && (
              <button
                onClick={handleComplete}
                disabled={isCompleting}
                className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title="Skip onboarding and start using the app"
              >
                Skip tour
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleComplete}
                disabled={isCompleting}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCompleting ? 'Starting...' : "Let's Go!"}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
