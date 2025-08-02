/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface Registration {
    username: string;
    email: string;
    password: string;
}
