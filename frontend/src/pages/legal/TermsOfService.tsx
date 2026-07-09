import React from 'react'
import LegalLayout, { LegalSection } from './LegalLayout'

const CONTACT_EMAIL = 'support@technologoo.com'

const TermsOfService: React.FC = () => {
  return (
    <LegalLayout title="Terms of Service" effectiveDate="July 9, 2026">
      <p className="text-gray-700 dark:text-gray-300">
        These terms govern your use of Architect-in-a-Box ("the Service"), operated by Technologoo. By
        signing in and using the Service, you agree to these terms.
      </p>

      <LegalSection heading="What the Service is">
        <p>
          Architect-in-a-Box is a tool for planning cloud architectures and assessing non-functional
          requirements. It generates recommendations and estimates to help you think through designs.
        </p>
      </LegalSection>

      <LegalSection heading="Accounts and sign-in">
        <p>
          You access the Service with your existing Microsoft account via Microsoft Entra ID. You are
          responsible for maintaining the security of that account and for activity under it. You must
          use an account you are authorized to use.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>use the Service for unlawful purposes or to infringe others' rights;</li>
          <li>attempt to gain unauthorized access to the Service, other accounts, or its infrastructure;</li>
          <li>disrupt, overload, or reverse-engineer the Service; or</li>
          <li>upload content you do not have the right to use.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Your content">
        <p>
          You retain ownership of the projects and content you create. You grant us the limited
          permission needed to store and display that content back to you so the Service can function.
        </p>
      </LegalSection>

      <LegalSection heading="Recommendations are informational">
        <p>
          Architecture recommendations, cost estimates, and NFR assessments are provided for
          informational and planning purposes only. They are not professional, legal, financial, or
          engineering advice. You are responsible for validating any design before relying on it.
        </p>
      </LegalSection>

      <LegalSection heading="Availability">
        <p>
          The Service is provided on an "as available" basis and may change, be interrupted, or be
          discontinued. It is offered for evaluation and demonstration, without a guaranteed service
          level.
        </p>
      </LegalSection>

      <LegalSection heading="Disclaimer and limitation of liability">
        <p>
          The Service is provided "as is" without warranties of any kind, express or implied. To the
          maximum extent permitted by law, Technologoo will not be liable for any indirect, incidental,
          or consequential damages arising from your use of the Service.
        </p>
      </LegalSection>

      <LegalSection heading="Termination">
        <p>
          You may stop using the Service at any time and request deletion of your account. We may
          suspend or terminate access that violates these terms.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to these terms">
        <p>
          We may update these terms as the Service evolves. Material changes will be reflected by an
          updated effective date on this page.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms:{' '}
          <a className="text-blue-600 dark:text-blue-400 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}

export default TermsOfService
