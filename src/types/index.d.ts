export interface ApplicationError extends Error {
    status?: number;
    syscall?: string;
    code?: string;
}

export interface Link {
    name: string;
    user: string;
    created: string; // ts would be better, but this is just a moment string
    url: string;
}

export interface User {
    username: string;
    password: string;
}
