import React from 'react'
import LegalLayout, { LegalSection } from './LegalLayout'

const CONTACT_EMAIL = 'privacy@technologoo.com'

const PrivacyPolicy: React.FC = () => {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate="July 9, 2026">
      <p className="text-gray-700 dark:text-gray-300">
        Architect-in-a-Box ("the Service") is operated by Technologoo. This policy explains what
        information we collect when you use the Service, how we use it, and the choices you have. We
        aim to collect as little as possible and to be plain about what happens to it.
      </p>

      <LegalSection heading="How you sign in">
        <p>
          The Service uses <strong>Microsoft Entra ID</strong> (OAuth 2.0 / OpenID Connect) for
          authentication. You sign in with your existing work, school, or personal Microsoft account.
          We never see, receive, or store your password — Microsoft handles the sign-in and returns a
          secure token to us.
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Account identity</strong> from your Microsoft sign-in token: your name, email
            address, and a Microsoft-issued user identifier (object ID). We use these to create your
            account and associate your work with you.
          </li>
          <li>
            <strong>Content you create</strong> in the Service, such as saved architecture projects,
            components, and non-functional-requirement (NFR) assessments.
          </li>
          <li>
            <strong>Basic usage and error telemetry</strong> (for example, page views and JavaScript
            errors) to keep the Service working and to fix problems. This is aggregate operational
            data, not a profile of you.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> collect payment information, and the Service does not ask you to
          enter passwords or financial details directly.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <ul className="list-disc pl-5 space-y-1">
          <li>To authenticate you and provide the Service.</li>
          <li>To save and display the projects and assessments you create.</li>
          <li>To operate, secure, debug, and improve the Service.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal information, and we do not use it for
          advertising.
        </p>
      </LegalSection>

      <LegalSection heading="Where your data is stored">
        <p>
          Your data is stored in <strong>Microsoft Azure</strong> (United States region), including a
          managed database for your account and projects. Authentication is provided by Microsoft
          Entra ID. These providers process data on our behalf to run the Service.
        </p>
      </LegalSection>

      <LegalSection heading="Service providers we rely on">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Microsoft</strong> — identity (Entra ID) and cloud hosting/storage (Azure).</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Retention and deletion">
        <p>
          We keep your account and content while your account is active. You can request access to,
          correction of, or deletion of your data at any time by contacting us at{' '}
          <a className="text-blue-600 dark:text-blue-400 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          On deletion we remove your account identity and the content associated with it.
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          Access to the Service requires a valid Microsoft-issued token; requests are authenticated on
          every protected endpoint. We use industry-standard transport encryption (HTTPS) for data in
          transit. No system is perfectly secure, but we take reasonable measures to protect your data.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>The Service is not directed to children under 13, and we do not knowingly collect their data.</p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          We may update this policy as the Service evolves. Material changes will be reflected by an
          updated effective date on this page.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions or requests about your data:{' '}
          <a className="text-blue-600 dark:text-blue-400 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}

export default PrivacyPolicy
