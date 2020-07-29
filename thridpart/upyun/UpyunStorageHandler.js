const upyun = require('upyun');
const {imgTypeFromBuffer} = require('../../libs/GeneralUtil');
module.exports = class {
    constructor(bucket,operatorName,passwd){
        this.service = new upyun.Service(bucket, operatorName, passwd);
        this.client = new upyun.Client(this.service);
    }

    async put(file,buffer){
        return await this.client.putFile(file,buffer);
    }

    async putImageAndRename(buffer,prefix='',hostKey){
        var type = imgTypeFromBuffer(buffer);
        if(!type) throw new Error('unknow imgae type in buffer content')
        prefix.match(/\/$/gi) || ( prefix = `${prefix}/` );
        var now = new Date();

        var filename = `${now.getTime()}-${1000000 + Math.floor(Math.random()*(1000000-1))}`;
        filename = `${prefix}${now.format( 'yyyy' )}/${now.format( 'MM' )}/${now.format( 'dd' )}/${filename}${type}`
        return { url:filename,hostKey , result:await this.put( filename,buffer ) };
    }
};