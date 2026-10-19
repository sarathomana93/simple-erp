(function(root){
'use strict';
const small=['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function integerWords(n){if(n<20)return small[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+small[n%10]:'');for(const [scale,name] of [[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand'],[100,'Hundred']])if(n>=scale)return integerWords(Math.floor(n/scale))+' '+name+(n%scale?' '+integerWords(n%scale):'');}
function amountInWords(value){const amount=Number(value);if(!Number.isFinite(amount)||amount<0)return '';const paise=Math.round(amount*100);if(!Number.isSafeInteger(paise))return '';const rupees=Math.floor(paise/100),fraction=paise%100;return 'Rupees '+integerWords(rupees)+(fraction?' and '+integerWords(fraction)+(fraction===1?' Paisa':' Paise'):'')+' Only';}
root.amountInWords=amountInWords;
if(typeof module!=='undefined'&&module.exports)module.exports=amountInWords;
})(globalThis);
