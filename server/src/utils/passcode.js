import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPasscode = async (passcode) => {
  return await bcrypt.hash(passcode, SALT_ROUNDS);
};

export const verifyPasscode = async (passcode, hash) => {
  return await bcrypt.compare(passcode, hash);
};

export const checkPasscodeStrength = (passcode) => {
  if (!passcode) return { score: 0, label: 'Empty', isValid: false };
  
  let score = 0;
  if (passcode.length >= 6) score += 1;
  if (passcode.length >= 8) score += 1;
  if (/[0-9]/.test(passcode)) score += 1;
  if (/[a-zA-Z]/.test(passcode)) score += 1;
  if (/[^a-zA-Z0-9]/.test(passcode)) score += 1;

  let label = 'Weak';
  if (score >= 4) label = 'Very Strong';
  else if (score === 3) label = 'Strong';
  else if (score === 2) label = 'Moderate';

  return {
    score,
    label,
    isValid: passcode.length >= 6,
  };
};

export const generateProfileCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'CARE-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
