// Simulated regulator registries (RBI / EPFO / IRDAI / SEBI / LIC).
// In production each of these is an Account Aggregator FIP fetch or a
// regulator API; here they are deterministic mocks keyed on PAN so any
// identity produces a stable, realistic set of records.
import crypto from 'node:crypto';

export const REGULATORS = {
  RBI: { name: 'Reserve Bank of India', covers: 'Bank deposits', fiType: 'DEPOSIT' },
  EPFO: { name: "Employees' Provident Fund Organisation", covers: 'Provident fund & pension', fiType: 'EPF' },
  IRDAI: { name: 'Insurance Regulatory and Development Authority', covers: 'Private life insurance', fiType: 'INSURANCE_POLICIES' },
  SEBI: { name: 'Securities and Exchange Board of India', covers: 'Mutual funds & demat', fiType: 'MUTUAL_FUNDS' },
  LIC: { name: 'Life Insurance Corporation of India', covers: 'LIC policies', fiType: 'LIC_POLICIES' },
};

export const DEMO_IDENTITY = {
  name: 'Raghavan Iyer',
  pan: 'ABCPI1234K',
  dob: '1958-03-14',
  aadhaarLast4: '4821',
  mobile: '9840012345',
  state: 'Tamil Nadu',
};

// Hand-written registry for the demo persona: covers every alert type.
const DEMO_RECORDS = [
  { regulator: 'RBI', type: 'Savings account', institution: 'State Bank of India', ref: 'XXXX4417', value: 384500, status: 'active', lastActivity: '2026-09-30', nominee: { name: 'Meenakshi Iyer', relation: 'Spouse', status: 'valid' }, kycUpdated: '2023-06-11' },
  { regulator: 'RBI', type: 'Fixed deposit', institution: 'Indian Bank', ref: 'XXXX0932', value: 650000, status: 'inoperative', lastActivity: '2015-02-18', nominee: null, kycUpdated: '2012-01-09' },
  { regulator: 'RBI', type: 'Savings account', institution: 'Canara Bank', ref: 'XXXX2210', value: 41230, status: 'unclaimed', lastActivity: '2013-07-02', nominee: { name: 'Lakshmi Iyer', relation: 'Mother', status: 'deceased' }, kycUpdated: '2009-04-21', registeredName: 'R. Iyer' },
  { regulator: 'EPFO', type: 'EPF (current employer)', institution: 'UAN 1009XXXX7712', ref: 'TN/MAS/0042117', value: 1872000, status: 'active', lastActivity: '2026-09-30', nominee: { name: 'Meenakshi Iyer', relation: 'Spouse', status: 'valid' }, kycUpdated: '2024-02-01' },
  { regulator: 'EPFO', type: 'EPF (previous employer)', institution: 'UAN 1003XXXX0485', ref: 'TN/AMB/0019873', value: 512400, status: 'inoperative', lastActivity: '2011-11-30', nominee: null, kycUpdated: '2010-08-15' },
  { regulator: 'IRDAI', type: 'Term life insurance', institution: 'HDFC Life', ref: 'POL-77XX1903', value: 5000000, status: 'active', lastActivity: '2026-04-01', nominee: null, kycUpdated: '2021-03-30' },
  { regulator: 'IRDAI', type: 'Personal accident cover', institution: 'Star Health', ref: 'POL-31XX0021', value: 500000, status: 'active', lastActivity: '2026-01-15', nominee: { name: 'Arjun Iyer', relation: 'Son', status: 'minor', }, kycUpdated: '2022-12-10' },
  { regulator: 'SEBI', type: 'Mutual fund folio', institution: 'SBI Mutual Fund · via CAMS', ref: 'FOLIO 1182XX44', value: 926300, status: 'active', lastActivity: '2026-08-05', nominee: null, kycUpdated: '2019-05-20' },
  { regulator: 'SEBI', type: 'Mutual fund folio', institution: 'HDFC Mutual Fund · via CAMS', ref: 'FOLIO 5530XX19', value: 214800, status: 'unclaimed', lastActivity: '2016-03-11', nominee: { name: 'Meenakshi Iyer', relation: 'Spouse', status: 'valid' }, kycUpdated: '2014-02-02' },
  { regulator: 'SEBI', type: 'Demat holdings', institution: 'CDSL · Zerodha', ref: 'BO 1208XXXX3321', value: 1348000, status: 'active', lastActivity: '2026-10-10', nominee: { name: 'Meenakshi Iyer', relation: 'Spouse', status: 'valid' }, kycUpdated: '2024-07-19' },
  { regulator: 'LIC', type: 'Endowment policy', institution: 'LIC of India · Jeevan Anand', ref: 'POL 7124XX09', value: 1000000, status: 'active', lastActivity: '2026-03-28', nominee: { name: 'Meenakshi Iyer', relation: 'Spouse', status: 'valid' }, kycUpdated: '2018-09-09' },
  { regulator: 'LIC', type: 'Matured policy (unpaid)', institution: 'LIC of India · Jeevan Saral', ref: 'POL 6630XX55', value: 287000, status: 'unclaimed', lastActivity: '2019-12-20', nominee: { name: 'Lakshmi Iyer', relation: 'Mother', status: 'deceased' }, kycUpdated: '2004-06-30' },
];

const BANKS = ['State Bank of India', 'Indian Bank', 'Canara Bank', 'Bank of Baroda', 'ICICI Bank', 'Punjab National Bank', 'Axis Bank', 'HDFC Bank'];
const INSURERS = ['HDFC Life', 'ICICI Prudential Life', 'Max Life', 'SBI Life', 'Tata AIA Life'];
const AMCS = ['SBI Mutual Fund', 'HDFC Mutual Fund', 'Nippon India MF', 'ICICI Prudential MF', 'Axis MF'];
const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Mother', 'Father', 'Brother'];

function rng(seed) {
  let h = crypto.createHash('sha256').update(seed).digest().readUInt32LE(0);
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

function synthRecords(identity) {
  const r = rng(identity.pan.toUpperCase());
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const digits = () => String(Math.floor(r() * 9000) + 1000);
  const date = (fromYear, toYear) => {
    const y = fromYear + Math.floor(r() * (toYear - fromYear + 1));
    const m = String(1 + Math.floor(r() * 12)).padStart(2, '0');
    const d = String(1 + Math.floor(r() * 28)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const surname = identity.name.split(' ').slice(-1)[0];
  const nominee = () => {
    const x = r();
    if (x < 0.3) return null;
    const status = x < 0.4 ? 'deceased' : x < 0.47 ? 'minor' : 'valid';
    return { name: `${pick(['Priya', 'Karthik', 'Anitha', 'Suresh', 'Divya', 'Ravi'])} ${surname}`, relation: pick(RELATIONS), status };
  };
  const status = () => (r() < 0.65 ? 'active' : r() < 0.6 ? 'inoperative' : 'unclaimed');
  const out = [];
  const add = (regulator, type, institution, ref, value) => {
    const s = status();
    out.push({
      regulator, type, institution, ref, value: Math.round(value / 100) * 100, status: s,
      lastActivity: s === 'active' ? date(2025, 2026) : date(2009, 2017),
      nominee: nominee(), kycUpdated: date(2008, 2025),
    });
  };
  const nBanks = 1 + Math.floor(r() * 3);
  for (let i = 0; i < nBanks; i++) add('RBI', r() < 0.6 ? 'Savings account' : 'Fixed deposit', pick(BANKS), `XXXX${digits()}`, 20000 + r() * 900000);
  add('EPFO', 'EPF account', `UAN 10${digits()}XXXX${digits()}`, `TN/MAS/00${digits()}`, 100000 + r() * 2500000);
  if (r() < 0.5) add('EPFO', 'EPF (previous employer)', `UAN 10${digits()}XXXX${digits()}`, `KA/BNG/00${digits()}`, 40000 + r() * 600000);
  if (r() < 0.8) add('IRDAI', 'Term life insurance', pick(INSURERS), `POL-${digits()}XX${digits()}`, 2500000 + r() * 7500000);
  const nMf = Math.floor(r() * 3);
  for (let i = 0; i < nMf; i++) add('SEBI', 'Mutual fund folio', `${pick(AMCS)} · via CAMS`, `FOLIO ${digits()}XX${digits().slice(0, 2)}`, 15000 + r() * 1200000);
  if (r() < 0.6) add('SEBI', 'Demat holdings', 'CDSL', `BO 12${digits()}XXXX${digits()}`, 50000 + r() * 2000000);
  if (r() < 0.7) add('LIC', 'Endowment policy', 'LIC of India', `POL ${digits()}XX${digits().slice(0, 2)}`, 200000 + r() * 1500000);
  return out;
}

/**
 * Query one regulator's registry for an identity. Returns the records the
 * regulator holds plus the name/DOB it has on file for each.
 */
export function queryRegulator(regulator, identity) {
  const isDemo = identity.pan.toUpperCase() === DEMO_IDENTITY.pan;
  const records = (isDemo ? DEMO_RECORDS : synthRecords(identity)).filter((rec) => rec.regulator === regulator);
  return records.map((rec) => ({
    ...rec,
    registeredName: rec.registeredName || (isDemo ? DEMO_IDENTITY.name : identity.name),
    registeredDob: isDemo ? DEMO_IDENTITY.dob : identity.dob,
  }));
}
