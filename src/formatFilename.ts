export const formatFilename = (s: string) => {
  const [first, ...rest] = s.split(".");
  return [first, "atom-story", ...rest].join(".");
};
