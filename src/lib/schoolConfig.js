// School-specific values come from environment variables so the public copy
// carries no real school, district, or account details. See .env.example.
const env = import.meta.env || {};

export const SCHOOL_NAME = env.VITE_SCHOOL_NAME || 'Example Junior High';
export const PROGRAM_NAME = env.VITE_PROGRAM_NAME || 'EAST Classroom';
export const DISTRICT_SHORT_NAME = env.VITE_DISTRICT_SHORT_NAME || 'district';
// Students must sign in with an address on this domain (admins are exempt).
// Leave unset to allow any domain (used by demo / local preview).
export const SCHOOL_EMAIL_DOMAIN = String(env.VITE_SCHOOL_EMAIL_DOMAIN || '').replace(/^@/, '').toLowerCase();
export const SCHOOL_CALENDAR_PAGE_URL = env.VITE_SCHOOL_CALENDAR_PAGE_URL || '';
export const SCHOOL_CALENDAR_IMAGE_URL = env.VITE_SCHOOL_CALENDAR_IMAGE_URL || '';
export const SCHOOL_LOGO_URL = env.VITE_SCHOOL_LOGO_URL || '';

export const isSchoolEmail = email => !SCHOOL_EMAIL_DOMAIN || String(email || '').toLowerCase().endsWith(`@${SCHOOL_EMAIL_DOMAIN}`);
