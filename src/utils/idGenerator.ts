// Helper to generate a random ID (AL + 3 digits from 100 to 999)
export const generateRandomId = (): string => {
  const num = Math.floor(Math.random() * 900) + 100; // 100 to 999
  return `AL${num}`;
};

// Helper to generate a random passcode (7 alphanumeric characters)
export const generateRandomPasscode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
