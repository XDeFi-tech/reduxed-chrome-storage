/**
 * Utility function: returns a deep copy of its argument
 */
declare function cloneDeep(o: any): any;
/**
 * Utility function: checks deeply if its two arguments are equal
 */
declare function isEqual(a: any, b: any): boolean;
/**
 * Utility function: returns the deep difference between its two arguments
 */
declare function diffDeep(a: any, b: any): any;
declare function mergeOrReplace(a: any, b: any, withReduction?: boolean): any;
export { cloneDeep, isEqual, diffDeep, mergeOrReplace };
