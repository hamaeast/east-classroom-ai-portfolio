export function normalizeUserRecord(user) {
  if (!user?.display_name?.trim()) return user;
  return { ...user, full_name: user.display_name.trim() };
}