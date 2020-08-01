const {httpGetBuffer,imgTypeFromBuffer} = require('./GeneralUtil');

async function handleImgTagInHtml(code,imgHandler,sourceCodeSrcTag='source_code_src',autoAddHostKey=true){
    var imgCodes = extractImgTagsInfo(code);
    code = code.replace( /<\/img\s+[^<>]*>/gi, '');//兼容</img>配对写法。只处理<img...>
    var list = code.split(/<img\s+[^<>]*>/gi);
    var imgCodetransforms = await Promise.all( imgCodes.map( v=>transformOneImgTag(v,imgHandler,sourceCodeSrcTag,autoAddHostKey) ) );
    //list的长度必须比imgCodetransforms的长度大一，否则是不可思议之事
    var arr = imgCodetransforms.reduce((r,v,i)=>(r.push(list[i]),r.push(v),r),[]);
    arr.push( list.pop() );
    return arr.join('');
}

async function transformOneImgTag(oneImgTagCode,imgHandler,sourceCodeSrcTag='source_code_src',autoAddHostKey=true) {
    var [_,source] = oneImgTagCode.match(new RegExp(`${sourceCodeSrcTag}="([^\"]*)"`,"i")) || [];
    if(source)return oneImgTagCode.replace(/src=[\"\']{1}[^\'\"]*[\"\']{1}/gi,`src="${source}"`)
    var buffer = await extractOneImgInfo(oneImgTagCode);
    if(!buffer)return '';
    var {url,hostKey} = await imgHandler(buffer);
    var src = `${autoAddHostKey && hostKey || ''}${url}`;
    return oneImgTagCode.replace(/src=[\"\']+.*[\"\']+/gi,` ${sourceCodeSrcTag}="${src}" src="${src}" `);
}

function extractImgTagsInfo(code){
    return code.match( /(<img\s+[^<>]*>)/gi) || [];
}

async function extractOneImgInfo(str){
    var buffer,[_,code] = str.match(/src=[\"\']{1}([^\'\"]*)[\"\']{1}/i) || [];
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