export default (string)=>{
    let total = 0;
    for(let char of string)
        total += char.charCodeAt(0)
    // '}' is 125
    // ' ' is 32
    total%=126
    // total-=32
    total/=(126)
    const firstPartOfString = '#' + total.toString(16).substring(2,8)
    return [ firstPartOfString + "00", firstPartOfString + "30"]
}