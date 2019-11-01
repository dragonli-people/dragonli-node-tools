const root = {};
root.substitute = (txt,...paras)=>
    txt && paras.map((v, index) => txt = txt.replace(RegExp('\\{' + index + '\\}', 'gi'), v)) && txt || ''

root.sleep = t=>new Promise(res=>setTimeout(_=>res(),t));

root.getIp = function (request) {
    let ip = request.headers['x-forwarded-for'] ||
        request.ip ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress ||
        request.connection.socket.remoteAddress || '';
    if(ip.split(',').length>0){
        ip = ip.split(',')[0]
    }
    var m = ip.match(/\d+\.\d+\.\d+\.\d+/);
    return m ? ip[0] : ip;
};
Promise.queue = async function(list,ignoreError=true){
    var arr = [];
    for(var i=0;i<list.length;i++) {
        try {
            arr.push( await list[i]() );
        }catch (e) {
            console.error(e);
            if(!ignoreError)return;
        }
    }
    return arr;
}

Date.prototype.format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}


module.exports = root;