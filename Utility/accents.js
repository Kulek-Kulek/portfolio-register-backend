const removeAccents = str => {
    let accents = 'żŻóÓłŁćĆęĘśŚąĄźŹńŃ';
    let accentsOut = "zŻoOlLcCeEsSaAzZnN";
    str = str.split('');
    str.forEach((letter, index) => {
        let i = accents.indexOf(letter);
        if (i != -1) {
            str[index] = accentsOut[i];
        }
    })
    return str.join('');
}


module.exports = removeAccents;