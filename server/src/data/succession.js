// Structured, state-aware transfer checklists. The AI service holds the
// longer-form guidance; this file drives the step-by-step case workflow.
// Content is general guidance — families should confirm with the institution.

export const STATE_HEIR_DOC = {
  'Tamil Nadu': { doc: 'Legal Heir Certificate', authority: 'Tahsildar (apply via TN e-Sevai)', days: '15–30 days' },
  Kerala: { doc: 'Legal Heirship Certificate', authority: 'Village Officer / Tahsildar', days: '15–30 days' },
  Karnataka: { doc: 'Family Tree / Survival Certificate', authority: 'Tahsildar via Nadakacheri (Atalji Janasnehi Kendra)', days: '7–21 days' },
  'Andhra Pradesh': { doc: 'Family Member Certificate', authority: 'Tahsildar via MeeSeva', days: '7–30 days' },
  Telangana: { doc: 'Family Member Certificate', authority: 'Tahsildar via MeeSeva', days: '7–30 days' },
  Maharashtra: { doc: 'Heirship / Succession Certificate', authority: 'Civil Court (district)', days: '3–6 months' },
  Delhi: { doc: 'Legal Heir Certificate', authority: 'SDM / Revenue Department via e-District Delhi', days: '15–30 days' },
  'Uttar Pradesh': { doc: 'Varisan Praman Patra (Heirship Certificate)', authority: 'Tehsil via e-District UP', days: '15–30 days' },
  'West Bengal': { doc: 'Succession Certificate', authority: 'District Court', days: '3–6 months' },
  Gujarat: { doc: 'Heirship Certificate', authority: 'Mamlatdar / Civil Court', days: '1–3 months' },
};

export const STATES = Object.keys(STATE_HEIR_DOC);

const heirDoc = (state) =>
  STATE_HEIR_DOC[state] || { doc: 'Legal Heir / Succession Certificate', authority: 'Local revenue office or District Court', days: '1–6 months' };

const common = (state) => [
  { title: 'Obtain death certificate', detail: 'Issued by the local registrar under the Civil Registration System. Get several certified copies — every institution keeps one.', docs: ['Form 2 death report', 'ID of informant'], authority: 'Municipal / Panchayat registrar' },
  { title: `Get ${heirDoc(state).doc}`, detail: `Needed wherever there is no valid nominee. In ${state || 'your state'}, this comes from ${heirDoc(state).authority} — typically ${heirDoc(state).days}.`, docs: ['Death certificate', 'ID & address proof of all heirs', 'Relationship proof'], authority: heirDoc(state).authority, needsHeirDoc: true },
];

const BY_REGULATOR = {
  RBI: (h, nominated) => h.type.includes('Gold Bond') ? [
    { title: 'Transmit Sovereign Gold Bond', detail: `Submit a transmission request to the issuing bank / post office for ${h.ref}. Heirs can hold the bond to maturity or redeem early on an interest date after year 5.`, docs: ['SGB transmission request form', 'Death certificate', 'Holding certificate', 'Claimant KYC', ...(nominated ? [] : ['Legal heir / succession certificate', 'Indemnity'])], authority: h.institution.split(' · via ')[1] || 'Issuing bank' },
  ] : [
    nominated
      ? { title: `Submit nominee claim at ${h.institution}`, detail: 'Nominee claim with death certificate and KYC. Banks follow RBI timelines for settling deceased-depositor claims.', docs: ['Bank claim form (nominee)', 'Death certificate', 'Nominee KYC', 'Passbook / FD receipt'], authority: h.institution }
      : { title: `Submit legal-heir claim at ${h.institution}`, detail: 'No nominee on record: claim as legal heirs. Banks usually ask for an indemnity and, above their threshold, a succession certificate.', docs: ['Bank claim form (legal heirs)', 'Death certificate', 'Legal heir certificate', 'Letter of indemnity', 'KYC of all heirs'], authority: h.institution },
    ...(h.status === 'unclaimed' ? [{ title: 'Trace on RBI UDGAM & request DEA Fund refund', detail: 'Deposits untouched for 10+ years move to the RBI DEA Fund but stay claimable. Search UDGAM, then claim through the same bank.', docs: ['UDGAM search result', 'Bank claim form'], authority: 'RBI UDGAM portal → bank' }] : []),
  ],
  EPFO: (h, nominated) => [
    { title: 'File Form 20 (PF settlement)', detail: `Claim the PF balance for ${h.institution}. ${nominated ? 'Nominee files directly.' : 'With no nominee, legal heirs file with the heir certificate.'}`, docs: ['Form 20', 'Death certificate', 'Cancelled cheque', nominated ? 'Nominee Aadhaar' : 'Legal heir certificate'], authority: 'EPFO regional office / Unified Portal' },
    { title: 'File Form 10D (family pension, EPS)', detail: 'Monthly pension to the surviving spouse / children under EPS-95.', docs: ['Form 10D', 'Death certificate', 'Bank details', 'Photographs'], authority: 'EPFO regional office' },
    { title: 'File Form 5(IF) (EDLI insurance)', detail: 'Employees’ Deposit Linked Insurance — a lump sum linked to PF, if the member was in service.', docs: ['Form 5(IF)', 'Death certificate', 'Employer attestation'], authority: 'EPFO via employer' },
  ],
  IRDAI: (h, nominated) => [
    { title: `Intimate death claim to ${h.institution}`, detail: `Register the claim online or at a branch. ${nominated ? 'The nominee receives payment.' : 'No nominee: insurer pays legal heirs against the heir certificate / succession certificate.'}`, docs: ['Claim form', 'Death certificate', 'Policy document', 'Claimant KYC', 'Bank mandate', ...(nominated ? [] : ['Legal heir certificate'])], authority: h.institution },
    ...(h.status === 'unclaimed' ? [{ title: 'Check insurer’s unclaimed amounts page', detail: 'Insurers must list unclaimed amounts on their website; dues over 10 years move to the Senior Citizens’ Welfare Fund and remain claimable for 25 years.', docs: ['Policy number', 'PAN'], authority: h.institution }] : []),
  ],
  LIC: (h, nominated) => [
    { title: 'Submit LIC death / maturity claim', detail: `Visit the servicing branch for ${h.ref}. ${nominated ? '' : 'Nominee is missing or deceased, so legal heirs claim with title proof.'}`, docs: ['Claim Form A (claimant’s statement)', 'Death certificate', 'Original policy bond', 'NEFT mandate', 'Claimant KYC', ...(nominated ? [] : ['Legal heir certificate'])], authority: 'LIC servicing branch' },
  ],
  PFRDA: (h, nominated) => [
    { title: 'Claim NPS death withdrawal', detail: `The full corpus for ${h.ref} is paid to the ${nominated ? 'nominee' : 'legal heirs'} — on death there is no compulsory annuity purchase. Initiate through the Point of Presence or the CRA.`, docs: ['NPS withdrawal form (death of subscriber)', 'Death certificate', 'PRAN card / details', 'Claimant KYC & bank proof', ...(nominated ? [] : ['Legal heir certificate', 'Indemnity'])], authority: h.institution.split(' · ')[1] || 'Central Recordkeeping Agency' },
  ],
  DOP: (h, nominated) => [
    { title: `Close ${h.type.includes('Provident') ? 'PPF account' : 'certificate'} at the post office`, detail: `${nominated ? 'Nominee claims' : 'Legal heirs claim'} at ${h.institution.split(' · ')[1] || 'the account office'}. Small amounts may be paid to heirs without a succession certificate under India Post's limits.`, docs: ['Post office death claim form', 'Death certificate', 'Passbook / certificate', 'Claimant KYC', ...(nominated ? [] : ['Legal heir certificate', 'Indemnity & affidavit'])], authority: 'India Post' },
  ],
  SEBI: (h, nominated) =>
    h.type.toLowerCase().includes('demat')
      ? [{ title: `Transmit shares via ${h.institution}`, detail: 'The Depository Participant moves securities to the claimant’s demat account. Unpaid dividends 7+ years old may sit with IEPF (claim via Form IEPF-5).', docs: ['Transmission request form', 'Death certificate', 'Claimant demat CML', ...(nominated ? [] : ['Legal heir / succession certificate', 'Indemnity'])], authority: h.institution }]
      : [{ title: 'Request MF transmission', detail: 'Submit transmission to the RTA (CAMS / KFintech) — once for all folios at that RTA. Lost folios can be traced on MF Central or SEBI’s MITRA.', docs: ['Transmission request form', 'Death certificate', 'Claimant KYC', ...(nominated ? [] : ['Legal heir certificate', 'Indemnity bond'])], authority: h.institution.split(' · via ')[1] || 'RTA' }],
};

export function buildTasks(holdings, state) {
  const needsHeirDoc = holdings.some((h) => !h.nominee || h.nominee.status !== 'valid');
  let n = 0;
  const id = () => `t${++n}`;
  const tasks = common(state)
    .filter((t) => !t.needsHeirDoc || needsHeirDoc)
    .map(({ needsHeirDoc: _, ...t }) => ({ ...t, id: id(), holdingId: null, done: false }));
  for (const h of holdings) {
    const nominated = h.nominee?.status === 'valid';
    for (const t of BY_REGULATOR[h.regulator](h, nominated)) {
      tasks.push({ ...t, id: id(), holdingId: h.id, done: false });
    }
  }
  return tasks;
}
