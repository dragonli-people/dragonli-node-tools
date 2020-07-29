const {httpGetBuffer,imgTypeFromBuffer} = require('./GeneralUtil');

async function handleImgTagInHtml(code,imgHandler,autoAddHostKey=false){
    var imgCodes = extractImgTagsInfo(code);
    code = code.replace( /<\/img\s+[^<>]*>/gi, '');//兼容</img>配对写法。只处理<img...>
    var list = code.split(/<img\s+[^<>]*>/gi);
    var imgCodetransforms = await Promise.all( imgCodes.map( v=>transformOneImgTag(v,imgHandler,autoAddHostKey) ) );
    //list的长度必须比imgCodetransforms的长度大一，否则是不可思议之事
    var arr = imgCodetransforms.reduce((r,v,i)=>(r.push(list[i]),r.push(v),r),[]);
    arr.push( list.pop() );
    return arr.join('');
}

async function transformOneImgTag(oneImgTagCode,imgHandler,autoAddHostKey=false) {
    var buffer = await extractOneImgInfo(oneImgTagCode);
    if(!buffer)return '';
    var {url,hostKey} = await imgHandler(buffer);
    return oneImgTagCode.replace(/src=[\"\']+.*[\"\']+/gi,`src="${autoAddHostKey && hostKey || ''}${url}"`);
}

function extractImgTagsInfo(code){
    return code.match( /(<img\s+[^<>]*>)/gi) || [];
}

async function extractOneImgInfo(str){
    var buffer,[_,code] = str.match(/src=\"(.*)\"/i) || [];
    if(!code)return null;
    var [__,base64] = code.match(/^data\:.*;base64,(.*)/i ) || [];
    // console.log('base64',base64 && base64.length || false);
    if(base64)return Buffer.from(base64,'base64');
    if( code.match(/^(http\:\/\/)|(https\:\/\/)/gi) ) return await httpGetBuffer(code);//远程抓取
    return null;
}

module.exports = {
    handleImgTagInHtml,
    transformOneImgTag,
    extractImgTagsInfo,
    extractOneImgInfo,
}