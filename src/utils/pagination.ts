export const pagination = (page: number) => {
  const currentPage = page || 1;
  const pageLimit = 5;
  const offset = (currentPage - 1) * pageLimit;

  return {
    pageLimit,
    offset,
  };
};
