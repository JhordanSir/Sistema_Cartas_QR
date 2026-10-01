export type HomeTarget = {
  role: 'OWNER' | 'ADMIN';
  mustChangePassword: boolean;
};

/** Where an account lands after signing in, or when it opens `/` (§E1, §E4). */
export function homePathFor({ role, mustChangePassword }: HomeTarget): string {
  const home = role === 'ADMIN' ? '/admin' : '/panel';
  return mustChangePassword ? `${home}/cuenta` : home;
}
