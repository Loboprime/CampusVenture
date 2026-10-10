# CampusVenture application upgrade

Preserve the existing CampusVenture interface while completing the uploaded specification in focused, testable phases. Use only CampusVenture's existing Lovable Cloud backend and domain; keep production data in authenticated database/storage services, and keep seed data isolated from real accounts.

## Delivery phases

1. **Secure foundation:** align migrations and generated schema; harden signup role assignment, profile creation, role-gated routes and RLS; document how university accounts are provisioned without allowing self-assigned institutional privileges.
2. **Founder workflow:** finish persistent startup profile fields and validation; secure pitch-deck/data-room upload, access, download audit; keep public GitHub metadata real; provide transparent readiness scoring and persist analysis.
3. **Investor workflow:** persist investor preferences, discovery filters/matching, saved startups and connection lifecycle; ensure all actions are owner-checked and notifications reflect real changes.
4. **University workflow:** scope roster/reviews/programmes to authorized institutions; persist decisions and audit records; complete enrolment/capacity and programme management.
5. **Communication and data room:** complete participant-only messages, read state, meetings lifecycle, notification state, NDA records, and document authorization; preserve clear non-legal NDA wording.
6. **Quality and handoff:** audit every route for loading/empty/error states and required page metadata; add focused tests for security and workflow rules; verify authenticated key flows; document architecture, ownership, policies, storage, environment setup and remaining external dependencies.

## Technical details

- Keep the TanStack Start, React, TypeScript, Tailwind and existing design system; use service modules for browser-side, user-scoped data access, `createServerFn` for app-internal server work, and RLS as the authorization boundary.
- Keep role records separate from profiles. Student/investor self-registration must not grant university/admin authority; institutional access needs trusted provisioning.
- Never expose confidential files as public URLs; issue short-lived downloads only after database policy checks, with access requiring an accepted NDA record.
- Do not claim email delivery, legally binding e-signatures, OAuth providers, calendar integrations or other services are active unless configured and verified. Do not fabricate AI or GitHub data.
