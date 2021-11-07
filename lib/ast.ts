// @todo Clean up this entire file

export const searchASTs = (asts: any[], src: string) => {
  return asts.reduce((acc, cur) => {
    if (acc) {
      return acc;
    }
    const result = searchAST(cur, src);
    return result;
  }, undefined);
};

export const searchAST = (ast: any, src: string) => {
  return ast.nodes.reduce((acc, cur) => {
    if (acc) {
      return acc;
    }
    if (cur.src === src) {
      return cur;
    } else if ("nodes" in cur) {
      return searchAST(cur, src);
    }
    return searchForSrc(cur, src);
  }, undefined);
};

const searchForSrc = (obj: any, src: string) => {
  if (obj.src === src) {
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
      return searchForSrc(cur, src);
    }, undefined);
};
