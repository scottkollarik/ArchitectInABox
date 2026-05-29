import React from 'react'
import { Link } from 'react-router-dom'
import POCLayout from '../components/POCLayout'

export default function POCIndex() {
  return (
    <POCLayout title="POC Sandbox">
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-architect-gray-900 dark:text-white mb-4">
            🧪 UI Proof-of-Concept Sandbox
          </h1>
          <p className="text-architect-gray-600 dark:text-gray-300 mb-8">
            Explore UI variations safely without affecting production data.
            All changes are temporary and stored in memory only.
          </p>

          {/* Drawer Variants Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-architect-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-architect-gray-900 dark:text-white mb-3">
              📐 Drawer Variants
            </h2>
            <p className="text-sm text-architect-gray-600 dark:text-gray-300 mb-4">
              Test different drawer patterns for NFRs and Reports
            </p>

            <div className="space-y-3">
              {/* Variant A */}
              <div className="border border-green-300 dark:border-green-700 rounded p-4 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-architect-gray-900 dark:text-white">
                      Variant A: Unified Side Drawer
                    </h3>
                    <p className="text-sm text-architect-gray-600 dark:text-gray-300 mt-1">
                      Single resizable drawer from right side with tabs for NFRs and Reports
                    </p>
                  </div>
                  <Link
                    to="/aib/poc/drawer-variants/a"
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium"
                  >
                    Try Variant A →
                  </Link>
                </div>
              </div>

              {/* Variant B - Coming Soon */}
              <div className="border border-architect-gray-300 dark:border-gray-700 rounded p-4 bg-architect-gray-100 dark:bg-gray-800 opacity-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-architect-gray-700 dark:text-gray-400">
                      Variant B: Tab-Specific Panels
                    </h3>
                    <p className="text-sm text-architect-gray-600 dark:text-gray-400 mt-1">
                      Not implemented yet
                    </p>
                  </div>
                  <button
                    disabled
                    className="px-4 py-2 bg-architect-gray-400 text-white rounded cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>

              {/* Variant C - Coming Soon */}
              <div className="border border-architect-gray-300 dark:border-gray-700 rounded p-4 bg-architect-gray-100 dark:bg-gray-800 opacity-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-architect-gray-700 dark:text-gray-400">
                      Variant C: Dual Drawer Compare
                    </h3>
                    <p className="text-sm text-architect-gray-600 dark:text-gray-400 mt-1">
                      Not implemented yet
                    </p>
                  </div>
                  <button
                    disabled
                    className="px-4 py-2 bg-architect-gray-400 text-white rounded cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Back to Production */}
          <div className="text-center">
            <Link
              to="/aib/cloud-architecture"
              className="text-architect-gray-600 dark:text-gray-300 hover:text-architect-gray-900 dark:hover:text-white transition"
            >
              ← Back to Production
            </Link>
          </div>
        </div>
      </div>
    </POCLayout>
  )
}
