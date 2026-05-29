import React from 'react'
import { useParams, Link } from 'react-router-dom'
import POCLayout from '../components/POCLayout'
import VariantA_UnifiedDrawer from '../components/VariantA_UnifiedDrawer'

export default function DrawerVariantsPOC() {
  const { variant } = useParams<{ variant: string }>()

  if (variant === 'a') {
    return <VariantA_UnifiedDrawer />
  }

  // Unknown variant
  return (
    <POCLayout title="Drawer Variants">
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-architect-gray-900 dark:text-white mb-4">
          Variant "{variant}" not found
        </h2>
        <p className="text-architect-gray-600 dark:text-gray-300 mb-6">
          This variant has not been implemented yet.
        </p>
        <Link
          to="/aib/poc"
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          ← Back to POC Index
        </Link>
      </div>
    </POCLayout>
  )
}
