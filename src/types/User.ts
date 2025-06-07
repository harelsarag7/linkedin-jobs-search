
export interface UserType {
    fullName: string
    language?: string,
    phone?: string
    email: string
    location?: string
    bio?: string
    linkedinUrl?: string
    githubUrl?: string
    personalWebsite?: string
    desiredJobTitle?: string
    employmentType?: string
    minSalary: number
    maxSalary: number
    searchRadius: number
    openToRemote: boolean
    skills: string[]
    blockedCompanies: string[]
    UserAgent?: string
    li_at?: string
    createdAt?: Date
    password?: string;
    resumeUrl?: string;
    keywords?: string[]; // Keywords for job search
}