const upyun = require('pyun');
const {imgTypeFromBuffer} = require('../../libs/GeneralUtil');
module.exports = class {
    constructor(bucket,operatorName,passwd){
        this.service = new upyun.Service(bucket, operatorName, passwd);
        this.client = new upyun.Client(this.service);
    }

    async put(file,buffer){
        return await this.client.putFile(file,buffer);
    }

    async putImageAndRename(buffer,prefix=''){
        var type = imageBufferHeaders.find(item=>Buffer.from(item.bufBegin).equals(buffer.slice(0,item.bufBegin.length)));
        type = type && type.suffix || null;
        if(!type) throw new Error('unknow imgae type in buffer content')
        prefix.match(/\/$/gi) || ( prefix = `${prefix}/` );
        var now = new Date();

        var filename = `${now.getTime()}-${1000000 + Math.floor(Math.random()*(1000000-1))}`;
        filename = `${prefix}${now.format( 'yyyy' )}/${now.format( 'MM' )}/${now.format( 'dd' )}/${filename}`
        return this.put( filename,buffer )
    }
};