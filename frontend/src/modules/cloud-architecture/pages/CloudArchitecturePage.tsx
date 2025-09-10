import React from 'react'
import NFRAssessmentForm from '../components/NFRAssessmentForm'
import AzureServicesBrowser from '../components/AzureServicesBrowser'
import ArchitectureCanvas from '../components/ArchitectureCanvas'

const CloudArchitecturePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-architect-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-architect-gray-900">Cloud Architecture Planner</h1>
            <p className="text-architect-gray-600 mt-2">
              Assess your non-functional requirements, explore Azure services, and build your cloud architecture
            </p>
          </div>
          <div className="text-right text-sm text-architect-gray-500">
            <p>Based on Azure Well-Architected Framework</p>
            <p>NFR Assessment → Service Selection → Architecture Design</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6 min-h-screen">
        {/* Left Column: NFR Assessment */}
        <div className="col-span-4 space-y-4">
          <div className="bg-white rounded-lg shadow-lg border border-architect-gray-200 sticky top-6">
            <div className="bg-gradient-to-r from-azure-blue-50 to-azure-blue-100 px-6 py-4 rounded-t-lg border-b border-architect-gray-200">
              <h2 className="text-xl font-semibold text-azure-blue-900">Requirements Assessment</h2>
              <p className="text-azure-blue-700 text-sm mt-1">
                Define your non-functional requirements
              </p>
            </div>
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <NFRAssessmentForm />
            </div>
          </div>
        </div>
        
        {/* Center Column: Azure Services Browser */}
        <div className="col-span-5 space-y-4">
          <div className="bg-white rounded-lg shadow-lg border border-architect-gray-200">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 rounded-t-lg border-b border-architect-gray-200">
              <h2 className="text-xl font-semibold text-green-900">Azure Services Catalog</h2>
              <p className="text-green-700 text-sm mt-1">
                Browse and select services for your architecture
              </p>
            </div>
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <AzureServicesBrowser />
            </div>
          </div>
        </div>
        
        {/* Right Column: Architecture Canvas */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white rounded-lg shadow-lg border border-architect-gray-200 sticky top-6">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 rounded-t-lg border-b border-architect-gray-200">
              <h2 className="text-xl font-semibold text-purple-900">Your Architecture</h2>
              <p className="text-purple-700 text-sm mt-1">
                Drop services here to build
              </p>
            </div>
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <ArchitectureCanvas />
            </div>
          </div>
          
          {/* Quick Stats Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-architect-gray-200 p-4">
            <h3 className="font-semibold text-architect-gray-900 mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-architect-gray-600">Services Selected:</span>
                <span className="font-medium" id="services-count">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-architect-gray-600">Est. Monthly Cost:</span>
                <span className="font-medium text-green-600" id="estimated-cost">$0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-architect-gray-600">Compliance Score:</span>
                <span className="font-medium" id="compliance-score">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to Use This Tool</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div>
            <strong>1. Assess Requirements</strong>
            <p>Fill out the NFR assessment form on the left. Sections will show completion status.</p>
          </div>
          <div>
            <strong>2. Browse Services</strong>
            <p>Explore Azure services in the center. Expand categories to see available options.</p>
          </div>
          <div>
            <strong>3. Build Architecture</strong>
            <p>Drag services to the canvas. Dependencies will be automatically included.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CloudArchitecturePage