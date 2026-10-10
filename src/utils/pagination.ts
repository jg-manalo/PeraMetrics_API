import type { PaginatedData } from '../types/api.js';

export const pagination = (page: number) => {
  const currentPage = page || 1;
  const pageLimit = 5;
  const offset = (currentPage - 1) * pageLimit;

  return {
    pageLimit,
    offset,
  };
};

export const paginationResult = <T>(
  rows: number,
  data: T[],
  pageLimit: number,
  offset?: number,
  currentPage?: number
): PaginatedData<T> => {
  return {
    totalPages: Math.ceil(rows / pageLimit),
    canPreviousPage:
      (offset ? offset > 0 : false) && Math.ceil(rows / pageLimit) > 1,
    canNextPage:
      (currentPage ? currentPage < Math.ceil(rows / pageLimit) : true) &&
      Math.ceil(rows / pageLimit) > 1,
    data,
  };
};
