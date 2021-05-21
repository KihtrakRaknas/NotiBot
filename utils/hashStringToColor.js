export default (string)=>{
    let total = 0;
    for(let char of string)
        total += char.charCodeAt(0)
    // '}' is 125
    // ' ' is 32
    total%=126
    total-=32
    total/=(126-32)
    const firstPartOfString = '#' + total.toString(16).substr(2, 6)
    console.log(firstPartOfString)
    return [ firstPartOfString + "00", firstPartOfString + "30"]
}