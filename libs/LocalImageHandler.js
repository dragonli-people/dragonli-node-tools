const fs = require('fs');
const write = async (file, data)=>new Promise( (res,rej)=>fs.writeFile(file,data,err=>err && rej(err) || res()));
const mkdir = async path=>new Promise( (res,rej)=>fs.mkdir(path,{recursive:true},err=>err && rej(err) || res()));
const {imgTypeFromBuffer} = require('./GeneralUtil');

module.exports = async function (buffer,uploadRoot,uploadPrefix,hostKey) {
    var type = imgTypeFromBuffer(buffer);
    if(!type) throw new Error('unknow imgae type in buffer content')
    uploadPrefix.match(/\/$/gi) || ( uploadPrefix = `${uploadPrefix}/` );
    uploadPrefix.match(/^\//gi) || ( uploadPrefix = `/${uploadPrefix}` );
    uploadRoot.match(/\/$/gi) || ( uploadRoot = uploadRoot.replace(/\/$/gi,'') );
    var now = new Date();

    var filename = `${now.getTime()}-${1000000 + Math.floor(Math.random()*(1000000-1))}`;
    var path = `${uploadPrefix}${now.format( 'yyyy' )}/${now.format( 'MM' )}/${now.format( 'dd' )}/`;
    await mkdir(`${uploadRoot}${path}`);
    filename = `${path}${filename}${type}`
    await write(`${uploadRoot}${filename}`,buffer);
    return { url:filename,hostKey , result:true };
}