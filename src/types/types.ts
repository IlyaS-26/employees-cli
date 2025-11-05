export type Bucket = {
    items: string[];
    pointerFirst: number;
    pointerMiddle: number;
}

export type Buckets = Map<string, Bucket>;

export type EmployeeRaw = {
    firstName: string;
    middleName: string;
    lastName: string;
    gender: "Male" | "Female";
    birthDate: string;
}