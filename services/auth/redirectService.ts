type user = {
    id: string,
    email: string,
    passwordHash: string,
    firstName: string,
    lastName: string,
    roleName: string | null,
    roleId: string,
    clinicId: string | null,
    clinicName: string | null,
    clinic: string | null,
    isActive: boolean,
    lastLogin: string | null,
    createdAt: string,
    updatedAt: string
}

export function getRedirectUrl(user: user | null | undefined) {
    // roleName (and even `user` itself) can come back null/missing from the
    // backend (e.g. a user with no role assigned yet) — treat that the same
    // as "not a client" rather than crashing the whole login request.
    if (user?.roleName?.toLocaleLowerCase().includes("client")) {
        return "/patientdashboard"
    }

    return "/dashboard"
}

