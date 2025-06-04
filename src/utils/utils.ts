

export const getLiAtCookie = (cookieHeader: string): string | null => {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const liAt = cookies.find(c => c.startsWith('li_at='));
    return liAt ? liAt.split('=')[1] : null;
};
  

export function extractJobId(url: string): string | null {
    const match = url.match(/\/view\/[^/]+-(\d+)/);
    return match ? match[1] : null;
  }
  
  export const experienceRange = {
    internship: "1",
    "entry level": "2",
    associate: "3",
    senior: "4",
    director: "5",
    executive: "6",
  } as const;