const hasProp = Object.prototype.hasOwnProperty;

function throwsMessage(err) {
  return '[Throws: ' + (err ? err.message : '?') + ']';
}

function safeGetValueFromPropertyOnObject(obj, property) {
  if (hasProp.call(obj, property)) {
    try {
      return obj[property];
    }
    catch (err) {
      return throwsMessage(err);
    }
  }

  return obj[property];
}

function ensureProperties(obj) {
  const seen = [ ]; // store references to objects we have seen before

  function visit(objVisit) {
    if (objVisit === null || typeof objVisit !== 'object') {
      return objVisit;
    }

    if (seen.indexOf(objVisit) !== -1) {
      return '[Circular]';
    }
    seen.push(objVisit);

    if (typeof objVisit.toJSON === 'function') {
      try {
        const fResult = visit(objVisit.toJSON());
        seen.pop();
        return fResult;
      } catch(err) {
        return throwsMessage(err);
      }
    }

    if (Array.isArray(objVisit)) {
      const aResult = objVisit.map(visit);
      seen.pop();
      return aResult;
    }

    const result = Object.keys(objVisit).reduce((aggr: any, prop: any) => {
      // prevent faulty defined getter properties
      aggr[prop] = visit(safeGetValueFromPropertyOnObject(objVisit, prop));
      return aggr;
    }, {});
    seen.pop();
    return result;
  }

  return visit(obj);
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function safeJsonStringify (data: any, replacer?: any, space?: number) {
  return JSON.stringify(ensureProperties(data), replacer, space);
}
