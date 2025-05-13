/**
 * capitalizes each word in a string
 * 
 * @param string the string to be modified
 * @returns the string with each word capitalized
 */

export function capitalizeFirstLetter(string: string) {
    const words = string.split(" ");
    
    return string.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
}