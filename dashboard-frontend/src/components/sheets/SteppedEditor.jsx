import { useState } from 'react'
import { Button } from '../ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Multi-step form framework for entity editing
 *
 * Provides consistent stepped UI pattern with progress indicator,
 * navigation controls, and form state management.
 */
export function SteppedEditor({
  steps,
  initialData = {},
  onComplete,
  onCancel,
  title,
  subtitle,
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [formData, setFormData] = useState(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  const handleNext = async () => {
    // Validate current step if validation function provided
    if (currentStep.validate) {
      const validation = await currentStep.validate(formData)
      if (!validation.valid) {
        alert(validation.error || 'Please fix the errors before continuing')
        return
      }
    }

    // Move to next step or complete
    if (isLastStep) {
      await handleComplete()
    } else {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleComplete = async () => {
    try {
      setIsSubmitting(true)
      await onComplete(formData)
    } catch (error) {
      console.error('Error completing form:', error)
      alert(error.message || 'Failed to save changes')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (updates) => {
    setFormData({ ...formData, ...updates })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with progress */}
      <div className="mb-6">
        {title && (
          <h2 className="text-xl font-semibold text-neutral-900 mb-1">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-sm text-neutral-600 mb-4">{subtitle}</p>
        )}

        {/* Step Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-neutral-900">
              {currentStep.title}
            </span>
            <span className="text-neutral-500">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
          {currentStep.description && (
            <p className="text-sm text-neutral-600">
              {currentStep.description}
            </p>
          )}
        </div>

        {/* Visual step indicators */}
        <div className="flex items-center gap-2 mt-4">
          {steps.map((step, index) => (
            <div key={index} className="flex-1">
              <div
                className={`h-1 rounded-full transition-all ${
                  index <= currentStepIndex ? 'bg-brand-600' : 'bg-neutral-200'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        {currentStep.render({
          formData,
          updateFormData,
          isSubmitting,
        })}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-3 mt-6 pt-6 border-t border-neutral-200">
        <Button
          variant="outline"
          onClick={isFirstStep ? onCancel : handleBack}
          disabled={isSubmitting}
        >
          {isFirstStep ? (
            'Cancel'
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </>
          )}
        </Button>

        <Button onClick={handleNext} disabled={isSubmitting}>
          {isLastStep ? (
            isSubmitting ? (
              'Saving...'
            ) : (
              'Save Changes'
            )
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/**
 * Helper hook for building stepped form configurations
 */
export function useSteppedForm(steps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({})

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const updateData = (updates) => {
    setFormData({ ...formData, ...updates })
  }

  const reset = () => {
    setCurrentStep(0)
    setFormData({})
  }

  return {
    currentStep,
    formData,
    nextStep,
    prevStep,
    updateData,
    reset,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    progress: ((currentStep + 1) / steps.length) * 100,
  }
}
