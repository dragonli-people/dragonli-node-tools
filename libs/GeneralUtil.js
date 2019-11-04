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

Array.prototype.sum = function (valueFilterFunc){
    valueFilterFunc = valueFilterFunc || (v=>v);
    return this.reduce((r,v)=>r+valueFilterFunc(v),0)
}

Array.prototype.dictionary = function (keyFilter,valueFilter,skipIfExsit=false,autoClone=false){
    if(!keyFilter) throw new Error('keyFilter cant be empty');
    if(typeof keyFilter === 'string') keyFilter = ( (key)=>v=>v[key] )(keyFilter);
    if(typeof keyFilter !== 'function') throw new Error('keyFilter only can be string or function(return the dic key)');
    valueFilter = valueFilter || (v=>v);
    return this.reduce((r,v)=>{
                var key = keyFilter(v);
                if(!key)return r;
                if(skipIfExsit && r[key])return r;
                var value=valueFilter(v);
                value && autoClone && (value=JSON.parse(JSON.stringify(value)));
                r[key]=value;
                return r;
            },{});

}

Array.prototype.leftJoin = function (otherList,leftFieldFilter,rightFieldFilter,leftNewFiled,toOne=true,autoCloneRight=true){
    if(!leftFieldFilter) throw new Error('leftFieldFilter cant be empty');
    if(typeof leftFieldFilter === 'string') leftFieldFilter = ( (key)=>v=>v[key] )(leftFieldFilter);
    if(typeof leftFieldFilter !== 'function') throw new Error('leftFieldFilter only can be string or function(return left field value)');

    if(!rightFieldFilter) throw new Error('rightFieldFilter cant be empty');
    if(typeof rightFieldFilter === 'string') rightFieldFilter = ( (key)=>v=>v[key] )(rightFieldFilter);
    if(typeof rightFieldFilter !== 'function') throw new Error('rightFieldFilter only can be string or function(return right field value)');

    if(!leftNewFiled || typeof leftNewFiled !== 'string') throw new Error('leftNewFiled cant be empty and must be string');

    this.forEach(one=>{
        var leftJoinValue = leftFieldFilter(one);
        if(!leftJoinValue && leftJoinValue!== 0)return;
        var rightList = otherList.filter(that=>leftJoinValue === rightFieldFilter(that));
        autoCloneRight && (rightList = rightList.map(v=>JSON.parse(JSON.stringify(v))));
        one[leftNewFiled] = toOne ? rightList[0] || null : rightList;
    })
}


Array.prototype.max = function (getFunc){
    var list = getFunc ? this.map(getFunc) : this.map(v=>v);
    return list.reduce((r,v)=>Math.max(r,v))
}

Array.prototype.min = function (getFunc){
    var list = getFunc ? this.map(getFunc) : this.map(v=>v);
    return list.reduce((r,v)=>Math.min(r,v))
}

Array.prototype.isSort = function (sortFunc=(v1,v2=>v1-v2)){
    var list = this.map( (v,i)=>({index1:i,d:v})).sort((v1,v2)=>sortFunc(v1.d,v2.d));
    list.forEach((v,i)=>v.index2 = i);
    return list.every(v=>v.index1===v.index2);
}

root.promiseFactory = (result,promise)=>
    ( promise = new Promise((resolve,reject)=>( result={resolve,reject} ) ) ) && ( result.promise = promise ) && result;

// for example:
// var testData = {
//     'user.id': 1,
//     'user.username': 'dragonli',
//     'user.passwd': 'asdf',
//     'user.city.id': 1,
//     'user.city.name': 'bejing',
//     'user.city.country.id': 1,
//     'user.city.country.name': 'English',
// }
// getObjectByPrefix(testData,'user');
function getObjectByPrefix (source,header){
    var headerDot = `${header}.`
    var keys = Object.keys(source).filter(key=>key.substr(0,headerDot.length) === headerDot);
    var myKeys = keys.filter(key=>!~key.indexOf('.',headerDot.length)).map(key=>key.slice(headerDot.length));
    var childKeys = keys.map((key,nextDot)=>(nextDot = key.indexOf('.',headerDot.length) )
        && ~nextDot && key.slice(headerDot.length,nextDot) || null ).filter(v=>v);
    var node = {};
    myKeys.forEach(key=>node[key] = source[`${headerDot}${key}`]);//such as user.id user.username user.passwd
    childKeys.forEach(key=>node[key]=getObjectByPrefix(source,`${headerDot}${key}`));
    return node;

    // return Object.keys(source).filter(key=>(new RegExp(`^${head}\\..+$`)).test(key))
    //     .reduce((result,key)=>( ( result[key.replace(new RegExp(`^${head}\\.`),'')]=source[key] ) || true ) && result,{});
}
root.getObjectByPrefix = getObjectByPrefix;

module.exports = root;