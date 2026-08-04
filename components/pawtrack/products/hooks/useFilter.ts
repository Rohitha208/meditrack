import { useDebounce } from "@/hooks/use-debounce";
import { createSerializer, inferParserType, parseAsBoolean, parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useCallback } from "react";

export const defaultFilter = {
    searchByname: null,
    category: null
}

export const productSearchParams = {
    searchByname: parseAsString,
    category: parseAsString
}

export const proudctSearchParser = createSerializer(productSearchParams);
export type ProductSearchParamsType = inferParserType<typeof productSearchParams>;


export const useFilter = () => {

    const [searchParam, setSearchParam] = useQueryStates(productSearchParams);

    const debouncedSetSearchParam = useDebounce((key: string, value: string) => {
        setSearchParam({ [key]: value });
    }, 500);

    const handleSearch = useCallback((key: string, value: string) => {
        debouncedSetSearchParam(key, value);
    }, [debouncedSetSearchParam]);

    const handleClearFilters = useCallback(() => {
        setSearchParam({
            searchByname: null,
            category: null,
        });
    }, [setSearchParam]);

    return { searchParam, setSearchParam, handleSearch, handleClearFilters };
}
