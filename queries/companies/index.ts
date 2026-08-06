// Export all company-related queries and mutations
export {
  useGetCompanies,
  useGetCompanyById,
  getCompanyById,
  type Company,
  type ProductType
} from './get-company';

export { 
  useCreateCompany, 
  type CreateCompanyRequest 
} from './create-company';

export { 
  useUpdateCompany, 
  type UpdateCompanyRequest 
} from './update-comapny';

export { 
  useDeleteCompany 
} from './delete-comapny';


export {
  useGetCompanyBySubdomain,
  getCompanyBySubdomain
} from './get-company-by-subdomain';
