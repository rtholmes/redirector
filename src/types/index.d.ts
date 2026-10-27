export interface ApplicationError extends Error {
    status?: number;
    syscall?: string;
    code?: string;
}

export interface Link {
    name: string;
    user: string;
    created: string; // ISO 8601 local time with UTC offset
    url: string;
}

export interface User {
    username: string;
    password: string;
}
