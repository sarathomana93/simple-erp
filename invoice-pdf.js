import PDFDocument from 'pdfkit';
import './dist/amount-words.js';
import {fileURLToPath} from 'node:url';
export const formatMoney=n=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
export async function invoicePDF(r){
 const quote=r.documentType==='quotation';
 const doc=new PDFDocument({size:'A4',margin:38,bufferPages:true}),chunks=[];
 const done=new Promise((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject)});
 const text=(s,x,y,w=519,size=10,bold=false)=>{doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor('#24394c').text(String(s??''),x,y,{width:w})};
 doc.image(fileURLToPath(new URL('./dist/logo.png',import.meta.url)),38,34,{width:195});text(quote?'QUOTATION':'TAX INVOICE',350,43,207,20,true);
 text('Fabrication | Roofing | Grills | Steps & SS Works\nVivekanandha Street, Kovil Thottam,\nNeelikonampalayam, Cbe-33.\nPhone: 99431 99797 | 80758 44604',38,115,310,9);
 text(quote?'FABRICATION & STEEL WORKS\nPrepared for your consideration':'GSTIN: 33HHYPS9430J1ZC\nTamilnadu | State code: 33',350,115,207,10,true);
 let y=180;const bill=[quote?'PREPARED FOR':'BILL TO',r.customer,r.address,r.phone?'Phone: '+r.phone:'',r.email,!quote&&r.gst?'GSTIN: '+r.gst:''].filter(Boolean).join('\n');text(bill,38,y,290);const end=doc.y;text(quote?'Quotation: '+r.number+'\nDate: '+r.date+'\nValid until: '+(r.validUntil||'-')+'\nCompletion: '+(r.delivery||'To be agreed'):'Invoice: '+r.number+'\nDate: '+r.date+'\nDespatched by: '+(r.dispatch||'-')+'\nL.R. No.: '+(r.lr||'-'),350,y,207);y=Math.max(end,doc.y)+25;
 const xs=quote?[38,65,305,385,465]:[38,62,249,308,382,447,490],ws=quote?[27,240,80,80,92]:[22,183,55,70,61,40,67];
 const head=()=>{doc.rect(38,y,519,25).fill('#19364e');(quote?['No.','Description of work','Qty. / Unit','Rate (Rs.)','Amount (Rs.)']:['No.','Item / Description','HSN','Qty.','Rate','GST %','Amount']).forEach((v,i)=>doc.font('Helvetica-Bold').fontSize(9).fillColor('white').text(v,xs[i]+3,y+8,{width:ws[i]-5}));y+=25};
 head();let sub=0,tax=0;
 for(let i=0;i<r.lines.length;i++){const l=r.lines[i],amount=Math.round(Number(l.qty)*Number(l.rate)*100)/100;sub+=amount;tax+=quote?0:Math.round(amount*Number(l.tax))/100;const allValues=[i+1,l.desc+(l.details?'\n('+l.details+')':''),l.hsn||'',l.qty+(l.unit?' '+l.unit:''),formatMoney(l.rate),l.tax,formatMoney(amount)];const values=quote?[allValues[0],allValues[1],allValues[3],allValues[4],allValues[6]]:allValues;doc.font('Helvetica').fontSize(9);const heights=values.map((v,j)=>doc.heightOfString(String(v),{width:ws[j]-6}));const height=Math.max(30,...heights.map(h=>h+16));if(y+height>750){doc.addPage();y=40;head()}values.forEach((v,j)=>{let size=9;if(quote?(j===3||j===4):(j===4||j===6)){doc.font('Helvetica').fontSize(9);size=Math.min(9,9*(ws[j]-6)/Math.max(1,doc.widthOfString(String(v))))}text(v,xs[j]+3,y+8,ws[j]-6,size)});doc.moveTo(38,y+height).lineTo(557,y+height).strokeColor('#dce3e8').stroke();y+=height;}
 sub=Math.round(sub*100)/100;tax=Math.round(tax*100)/100;const round=r.autoRound?(Math.round((sub+tax))*100-Math.round((sub+tax)*100))/100:Number(r.round||0),grand=Math.round((sub+tax+round)*100)/100;
 if(y+250>780){doc.addPage();y=40}y+=18;text('Amount in words',38,y,280,10,true);text(globalThis.amountInWords(grand),38,y+20,270,10);
 const totals=[['Subtotal',sub],...(quote?[]:r.taxMode==='IGST'?[['IGST',tax]]:[['CGST',Math.floor(tax*100/2)/100],['SGST',tax-Math.floor(tax*100/2)/100]]),['Round off',round],[quote?'Quotation total':'Grand total',grand],...(quote?[['Received amount',Number(r.received||0)],['Balance amount',Math.round((grand-Number(r.received||0))*100)/100]]:[])];
 totals.forEach(([label,value],i)=>{text(label,350,y+i*22,115,10,i===totals.length-1);text('Rs. '+formatMoney(value),460,y+i*22,97,10,i===totals.length-1)});y+=totals.length*22+28;
 if(quote&&r.terms){const h=doc.font('Helvetica').fontSize(10).heightOfString(String(r.terms),{width:519})+35;if(y+h+100>780){doc.addPage();y=40}text('TERMS & CONDITIONS',38,y,519,10,true);text(r.terms,38,y+20,519,10);y=doc.y+24}if(y+100>780){doc.addPage();y=40}text('BANK DETAILS\nIOB, Singanallur\nAccount No.: 184402000001521\nIFSC: IOBA0001844',38,y,270,10);text('For RAM FABRICATION\n\n\nAuthorised Signature',350,y,207,10,true);
 const range=doc.bufferedPageRange();for(let i=0;i<range.count;i++){doc.switchToPage(i);doc.fontSize(8).fillColor('#74818b').text('Page '+(i+1)+' of '+range.count,38,780,{width:519,align:'center',lineBreak:false})}doc.end();return done;
}
