import { AnyActionArg, useCallback } from "react"


export const useCheckPermission = (user: any) => {


    const checkPermission = useCallback((roles: string[]) => {
        if (user) {
            const isAllowed = roles.some((item: string) => item.toLowerCase() === user?.roleName?.toLowerCase())
            return isAllowed
        }
        return false
    }, [user])

    return { checkPermission }
}
