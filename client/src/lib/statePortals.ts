/**
 * Official State Government E-Governance Succession Portals (future.md §2.1)
 */

export interface StatePortalInfo {
  name: string;
  url: string;
  doc: string;
  authority: string;
  estimatedDays: string;
}

export const STATE_PORTALS: Record<string, StatePortalInfo> = {
  'Tamil Nadu': {
    name: 'TN e-Sevai',
    url: 'https://www.tnesevai.tn.gov.in',
    doc: 'Legal Heir Certificate',
    authority: 'Tahsildar (Revenue Department)',
    estimatedDays: '15–30 days',
  },
  'Karnataka': {
    name: 'Nadakacheri (Atalji Janasnehi Kendra)',
    url: 'https://nadakacheri.karnataka.gov.in',
    doc: 'Family Tree / Survival Certificate',
    authority: 'Tahsildar (Nadakacheri)',
    estimatedDays: '7–21 days',
  },
  'Andhra Pradesh': {
    name: 'MeeSeva AP',
    url: 'https://www.meeseva.gov.in',
    doc: 'Family Member Certificate',
    authority: 'Tahsildar via MeeSeva',
    estimatedDays: '7–30 days',
  },
  'Telangana': {
    name: 'MeeSeva Telangana',
    url: 'https://www.meeseva.gov.in',
    doc: 'Family Member Certificate',
    authority: 'Tahsildar via MeeSeva',
    estimatedDays: '7–30 days',
  },
  'Delhi': {
    name: 'e-District Delhi',
    url: 'https://edistrict.delhigovt.nic.in',
    doc: 'Legal Heir Certificate',
    authority: 'SDM / Revenue Department',
    estimatedDays: '15–30 days',
  },
  'Uttar Pradesh': {
    name: 'e-District Uttar Pradesh',
    url: 'https://edistrict.up.gov.in',
    doc: 'Varisan Praman Patra (Heirship Certificate)',
    authority: 'Tehsil via e-District UP',
    estimatedDays: '15–30 days',
  },
  'Maharashtra': {
    name: 'Aaple Sarkar',
    url: 'https://aaplesarkar.mahaonline.gov.in',
    doc: 'Heirship / Succession Certificate',
    authority: 'Civil Court (District)',
    estimatedDays: '3–6 months',
  },
  'Kerala': {
    name: 'e-District Kerala',
    url: 'https://edistrict.kerala.gov.in',
    doc: 'Legal Heirship Certificate',
    authority: 'Village Officer / Tahsildar',
    estimatedDays: '15–30 days',
  },
  'West Bengal': {
    name: 'e-District West Bengal',
    url: 'https://edistrict.wb.gov.in',
    doc: 'Succession Certificate',
    authority: 'District Civil Court / Revenue Dept',
    estimatedDays: '2–4 months',
  },
  'Gujarat': {
    name: 'Digital Gujarat',
    url: 'https://www.digitalgujarat.gov.in',
    doc: 'Pedhinama (Legal Heir Certificate)',
    authority: 'Talati cum Mantri / Mamlatdar',
    estimatedDays: '15–30 days',
  },
};

export function getStatePortal(stateName?: string): StatePortalInfo | null {
  if (!stateName) return null;
  return STATE_PORTALS[stateName] || null;
}
