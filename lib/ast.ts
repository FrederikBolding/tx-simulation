// @todo Clean up this entire file

export const searchASTs = (asts: any[], predicate: (i: any) => boolean) => {
  return asts.reduce((acc, cur) => {
    if (acc) {
      return acc;
    }
    const result = searchAST(cur, predicate);
    return result;
  }, undefined);
};

export const searchAST = (ast: any, predicate: (i: any) => boolean) => {
  return ast.nodes.reduce((acc, cur) => {
    if (acc) {
      return acc;
    }
    if (predicate(cur)) {
      return cur;
    } else if ("nodes" in cur) {
      return searchAST(cur, predicate);
    }
    return nestedSearch(cur, predicate);
  }, undefined);
};

export const nestedSearch = (obj: any, predicate: (i: any) => boolean) => {
  if (predicate(obj)) {
    return obj;
  }
  return Object.values(obj)
    .filter((o) => typeof o === "object")
    .reduce((acc, cur) => {
      if (acc) {
        return acc;
      }
      if (!cur) {
        return acc;
      }
      return nestedSearch(cur, predicate);
    }, undefined);
};
