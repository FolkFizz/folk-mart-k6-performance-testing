export const jsonOrNull = (response) => {
  try {
    return response.json();
  } catch (error) {
    return null;
  }
};
