import { Repository } from "../repository/repository.js";

import type { EmployeeRaw } from "../types/types.js";

export class Employee {

    private repository: Repository;

    public employeeRaw: EmployeeRaw;

    constructor(
        repository: Repository,
        firstName: string,
        middleName: string,
        lastName: string,
        birthDate: string,
        gender: "Male" | "Female"
    ) {
        this.repository = repository;
        this.employeeRaw = {
            firstName,
            middleName,
            lastName,
            birthDate,
            gender
        }
    }

    public async saveToRepo(): Promise<void> {
        await this.repository.insert(this);
    }

    /**
     * Сортируем по уникальным ФИО и дате рождения
     * Детерминируем выбор по DESC id при дубликатах
     */
    public static ageFromBirthDate(birthDate: Date): number {
        const currentDate = new Date();
        const employeeDate = new Date(birthDate);

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