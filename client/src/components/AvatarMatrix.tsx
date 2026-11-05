
import { cx } from './ui';

export type LifeStage = 'Teen' | 'Adulthood' | 'Old age';
export type Gender = 'Male' | 'Female';

export interface PersonaAvatar {
  id: string;
  variant: number;
  stage: LifeStage;
  gender: Gender;
  title: string;
  role: string;
  description: string;
  badgeBg: string;
}

export const AVATAR_OPTIONS: PersonaAvatar[] = [
  {
    id: 'teen-male',
    variant: 0,
    stage: 'Teen',
    gender: 'Male',
    title: 'Teen · Male',
    role: 'Student / Heir',
    description: 'Youthful heir preparing for future estate stewardship.',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    id: 'teen-female',
    variant: 1,
    stage: 'Teen',
    gender: 'Female',
    title: 'Teen · Female',
    role: 'Student / Heir',
    description: 'Youthful heir learning family financial succession.',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'adult-male',
    variant: 2,
    stage: 'Adulthood',
    gender: 'Male',
    title: 'Adult · Male',
    role: 'Primary Account Holder',
    description: 'Working professional managing family wealth & nominees.',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'adult-female',
    variant: 3,
    stage: 'Adulthood',
    gender: 'Female',
    title: 'Adult · Female',
    role: 'Primary Account Holder',
    description: 'Working professional consolidating holdings & coverage.',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'senior-male',
    variant: 4,
    stage: 'Old age',
    gender: 'Male',
    title: 'Senior · Male',
    role: 'Patriarch / Estate Owner',
    description: 'Dignified elder orchestrating smooth wealth transmission.',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'senior-female',
    variant: 5,
    stage: 'Old age',
    gender: 'Female',
    title: 'Senior · Female',
    role: 'Matriarch / Estate Owner',
    description: 'Dignified elder securing family succession protections.',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
];

export function resolveAvatarId(seedOrId?: string | null): string {
  if (!seedOrId) return 'adult-male';
  const clean = seedOrId.toLowerCase().trim();
  if (AVATAR_OPTIONS.some((a) => a.id === clean)) return clean;
  if (clean.includes('teen') && clean.includes('fem')) return 'teen-female';
  if (clean.includes('teen')) return 'teen-male';
  if ((clean.includes('senior') || clean.includes('old')) && clean.includes('fem')) return 'senior-female';
  if (clean.includes('senior') || clean.includes('old')) return 'senior-male';
  if (clean.includes('fem') || clean.includes('woman') || clean.includes('girl')) return 'adult-female';
  if (clean.includes('male') || clean.includes('man') || clean.includes('boy')) return 'adult-male';

  // Deterministic fallback based on string hash
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (hash << 5) - hash + clean.charCodeAt(i);
  const idx = Math.abs(hash) % AVATAR_OPTIONS.length;
  return AVATAR_OPTIONS[idx].id;
}

export function AvatarFace({
  seed,
  className = 'h-full w-full',
}: {
  seed: string;
  className?: string;
}) {
  const avatarId = resolveAvatarId(seed);

  return (
    <div className={cx('relative overflow-hidden rounded-full aspect-square flex items-center justify-center select-none', className)}>
      {avatarId === 'teen-male' && (
        <svg viewBox="0 0 80 80" fill="none" className="h-full w-full">
          <circle cx="40" cy="40" r="40" fill="#e0f2fe" />
          <path d="M18 78C18 61 27 54 40 54C53 54 62 61 62 78Z" fill="#0284c7" />
          <path d="M34 54L40 62L46 54" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="40" cy="34" r="16" fill="#fed7aa" />
          <path d="M24 30C24 20 30 16 40 16C50 16 56 20 56 30C52 26 48 24 40 24C32 24 28 26 24 30Z" fill="#1e293b" />
          <circle cx="34" cy="34" r="2" fill="#0f172a" />
          <circle cx="46" cy="34" r="2" fill="#0f172a" />
          <path d="M35 41C37 43 43 43 45 41" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}

      {avatarId === 'teen-female' && (
        <svg viewBox="0 0 80 80" fill="none" className="h-full w-full">
          <circle cx="40" cy="40" r="40" fill="#ffe4e6" />
          <path d="M22 26C18 36 18 50 20 60C21 64 26 65 29 60" fill="#334155" />
          <path d="M18 78C18 62 27 55 40 55C53 55 62 62 62 78Z" fill="#e11d48" />
          <path d="M36 55L40 60L44 55" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="34" r="15" fill="#fde68a" />
          <path d="M24 28C24 18 31 15 40 15C49 15 56 18 56 28C52 23 47 22 40 22C33 22 28 23 24 28Z" fill="#334155" />
          <path d="M54 28C57 36 58 48 56 56" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
          <circle cx="35" cy="34" r="2" fill="#0f172a" />
          <circle cx="45" cy="34" r="2" fill="#0f172a" />
          <path d="M36 41C38 43 42 43 44 41" stroke="#be123c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}

      {avatarId === 'adult-male' && (
        <svg viewBox="0 0 80 80" fill="none" className="h-full w-full">
          <circle cx="40" cy="40" r="40" fill="#dbeafe" />
          <path d="M16 78C16 59 26 51 40 51C54 51 64 59 64 78Z" fill="#1e3a8a" />
          <path d="M34 51L40 64L46 51" fill="#ffffff" />
          <path d="M38 58L40 70L42 58" fill="#d97706" />
          <circle cx="40" cy="33" r="16" fill="#fed7aa" />
          <path d="M23 28C23 17 31 14 40 14C49 14 57 17 57 28C53 23 46 20 39 20C31 20 25 24 23 28Z" fill="#0f172a" />
          <path d="M24 37C25 43 31 47 40 47C49 47 55 43 56 37" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="1.5 1.5" />
          <circle cx="34" cy="32" r="2" fill="#0f172a" />
          <circle cx="46" cy="32" r="2" fill="#0f172a" />
          <path d="M36 40H44" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}

      {avatarId === 'adult-female' && (
        <svg viewBox="0 0 80 80" fill="none" className="h-full w-full">
          <circle cx="40" cy="40" r="40" fill="#ccfbf1" />
          <path d="M20 26C16 38 16 55 19 66C22 74 27 74 30 66" fill="#1e293b" />
          <path d="M60 26C64 38 64 55 61 66C58 74 53 74 50 66" fill="#1e293b" />
          <path d="M16 78C16 60 26 52 40 52C54 52 64 60 64 78Z" fill="#0f766e" />
          <path d="M32 52C32 60 40 65 40 65C40 65 48 60 48 52" fill="#fed7aa" />
          <circle cx="40" cy="33" r="15" fill="#fed7aa" />
          <path d="M23 27C23 16 31 14 40 14C49 14 57 16 57 27C52 21 46 19 40 19C34 19 28 21 23 27Z" fill="#1e293b" />
          <circle cx="24" cy="37" r="2" fill="#f59e0b" />
          <circle cx="56" cy="37" r="2" fill="#f59e0b" />
          <circle cx="34" cy="33" r="2" fill="#0f172a" />
          <circle cx="46" cy="33" r="2" fill="#0f172a" />
          <path d="M36 41C38 43 42 43 44 41" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}

      {avatarId === 'senior-male' && (
        <svg viewBox="0 0 80 80" fill="none" className="h-full w-full">
          <circle cx="40" cy="40" r="40" fill="#fef3c7" />
          <path d="M16 78C16 59 26 52 40 52C54 52 64 59 64 78Z" fill="#78350f" />
          <path d="M36 52H44V78H36Z" fill="#fef3c7" />
          <circle cx="40" cy="33" r="16" fill="#fed7aa" />
          <path d="M23 28C23 16 31 13 40 13C49 13 57 16 57 28C53 23 48 21 40 21C32 21 27 23 23 28Z" fill="#94a3b8" />
          <rect x="28" y="29" width="9" height="7" rx="2" stroke="#475569" strokeWidth="1.8" fill="none" />
          <rect x="43" y="29" width="9" height="7" rx="2" stroke="#475569" strokeWidth="1.8" fill="none" />
          <path d="M37 32H43" stroke="#475569" strokeWidth="1.8" />
          <circle cx="32.5" cy="32.5" r="1.5" fill="#0f172a" />
          <circle cx="47.5" cy="32.5" r="1.5" fill="#0f172a" />
          <path d="M33 42C36 44 44 44 47 42" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}

      {avatarId === 'senior-female' && (
        <svg viewBox="0 0 80 80" fill="none" className="h-full w-full">
          <circle cx="40" cy="40" r="40" fill="#ede9fe" />
          <circle cx="40" cy="15" r="7" fill="#94a3b8" />
          <path d="M16 78C16 60 26 53 40 53C54 53 64 60 64 78Z" fill="#5b21b6" />
          <path d="M30 53L40 78L50 53" fill="#f5d0fe" />
          <circle cx="40" cy="33" r="15" fill="#fde68a" />
          <path d="M23 28C23 16 31 14 40 14C49 14 57 16 57 28C53 22 47 20 40 20C33 20 27 22 23 28Z" fill="#94a3b8" />
          <circle cx="28" cy="33" r="4.5" stroke="#475569" strokeWidth="1.6" fill="none" />
          <circle cx="52" cy="33" r="4.5" stroke="#475569" strokeWidth="1.6" fill="none" />
          <path d="M32.5 33H47.5" stroke="#475569" strokeWidth="1.6" />
          <circle cx="28" cy="33" r="1.5" fill="#0f172a" />
          <circle cx="52" cy="33" r="1.5" fill="#0f172a" />
          <circle cx="40" cy="27" r="1.8" fill="#be123c" />
          <path d="M36 41C38 43 42 43 44 41" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}
