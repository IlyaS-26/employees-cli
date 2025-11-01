import { Repository } from "../repository/repository.js";

export class Employee {

    private repository: Repository;

    public firstName: string;
    public middleName: string | null;
    public lastName: string;
    public birthDate: string;
    public gender: string;

    constructor(
        repository: Repository,
        firstName: string,
        middleName: string,
        lastName: string,
        birthDate: string,
        gender: string
    ) {
        this.repository = repository;
        this.firstName = firstName;
        this.middleName = middleName;
        this.lastName = lastName;
        this.birthDate = birthDate;
        this.gender = gender;
    }

    public async saveToRepo(): Promise<void> {
        await this.repository.insert(this);
    }

    public ageFromBirthDate(): number {
        const currentDate = new Date();
        const employeeDate = new Date(this.birthDate);

        let age: number = currentDate.getFullYear() - employeeDate.getFullYear();

        const currentMonth = currentDate.getMonth();
        const currentDay = currentDate.getDate();
        const employeeBirthMonth = employeeDate.getMonth();
        const employeeBirthDay = employeeDate.getDate();

        const isMonthLess = currentMonth < employeeBirthMonth;
        const isDateLess = isMonthLess || (currentMonth === employeeBirthMonth && currentDay < employeeBirthDay);

        return isDateLess ? age - 1 : age;
    }
}