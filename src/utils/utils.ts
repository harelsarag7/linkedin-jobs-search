

export const getLiAtCookie = (cookieHeader: string): string | null => {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const liAt = cookies.find(c => c.startsWith('li_at='));
    return liAt ? liAt.split('=')[1] : null;
};
  