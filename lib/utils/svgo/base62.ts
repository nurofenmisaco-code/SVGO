// lib/utils/svgo/base62.ts

const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateShortCode(length: number = 8): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += BASE62_CHARS[Math.floor(Math.random() * BASE62_CHARS.length)];
  }
  return code;
}

export async function ensureUniqueCode(prisma: any): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const code = generateShortCode();
    const exists = await prisma.svgoLink.findUnique({
      where: { code },
    });
    
    if (!exists) {
      return code;
    }
    
    attempts++;
  }
  
  throw new Error('Failed to generate unique code');
}



