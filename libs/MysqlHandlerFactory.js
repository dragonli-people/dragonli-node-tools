const mysql=require('mysql');
const GeneralUtil = require('./GeneralUtil')

const root = {};
module.exports = root;
root.create = handlerFactory;

async function connectFactory(host,port,user,password,database,multipleStatements=false
    , connectionLimit = 10,conntectName=null,retryTime=5000,useLittleHump=false) {
    conntectName = conntectName || ( `${host}:${port}` );

    console.log('===mysql try connecting===',host,port,user,password,database);
    const connectPool = [];

    var mysqlHandlerPool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        multipleStatements,
        connectionLimit
    });
    // console.log('===mysqlHandlerPool===', mysqlHandlerPool)


    function removeConnect(connection,i,intervalId) {
        var index = connectPool.indexOf(connection);
        ~index && connectPool.splice(index,1);
        clearInterval(intervalId);
        try{
            connection.release()
        }catch (e) {

        }
        console.log(`connect(${i}) had closed:${connection.threadId} , index:${index} , pool length:${connectPool.length}`);
    }

    function getConnect(i) {
        return new Promise((resolve,reject) => {
            mysqlHandlerPool.getConnection((err, connection) => {
                if (err) {
                    console.error('error connecting:' + err.stack);
                    reject(err);
                    return;
                }
                connectPool.push(connection);
                console.log(`mysql connect(${i}) successed created:${connection.threadId}  pool length:${connectPool.length}`);
                // console.log(`mysql connected(${i}) successed! with id ${connection.threadId}`);
                var id = setInterval(_=>connection.query('select UNIX_TIMESTAMP()'),5*60*1000);
                connection.on('error',err=>(console.log(`${i} is breaked`,removeConnect(connection,i,id))));
                connection.on('release',err=>(console.log(`${i} is releaseed`),removeConnect(connection,i,id)));
                connection.on('end',err=>(console.log(`${i} is ended`),removeConnect(connection,i,id)));
                // i === 3 && setTimeout(()=>removeConnect(connection,i,id),5000);
                resolve(connection);
            });
        });
    }

    await Promise.all( Array(connectionLimit).fill(true).map((v,i)=>getConnect(i)) );
    (async function () {
        var i = connectionLimit;
        while (true)
            try{
                await getConnect(i++);
            }catch(e){
                console.log(`数据库[${conntectName}]连接异常，目前正常连接数为(${connectPool.length})，${retryTime/1000}秒之后将再次尝试连接...`)
                await sleep(retryTime);
            }
    })();

    return function(){
        if( connectPool.length === 0 )throw new Error('the length of mysql connect pool is zero!')
        return connectPool[ Math.floor(Math.random()*100000) % connectPool.length ];
    }
}

function toLittleHump(o){
    if(!o || typeof o !== 'object')return o;
    return Object.entries(o).reduce( (r,[k,v])=>{
        var arr = k.split('_');
        k = `${arr.shift()}${arr.map(v=>`${v.substr(0,1).toUpperCase()}${v.substr(1)}`).join('')}`;
        r[k] = v;
        return r;
    },{});
}

async function handlerFactory(host,port,user,pass,database , connectionLimit = 10,conntectName=null,retryTime=5000,useLittleHump=false){
    const handler = {};
    port = parseInt(port);
    var [conn,connMultiple] = await Promise.all( [
        connectFactory(host,port,user,pass,database,false,connectionLimit,conntectName,retryTime,useLittleHump),
        connectFactory(host,port,user,pass,database,true,connectionLimit,conntectName,retryTime,useLittleHump),
    ]);
    handler.query = function(sql,...paras){
        // paras = paras.map(v=>`'${v.replace(/\'/gi,'\\\'')}'`);
        // paras.forEach(v=>sql=sql.replace('?',v));
        // paras.push()
        // console.log('===sql===',sql);
        return new Promise(async (res,rej)=>{
            conn().query(sql, paras,function (error, results, fields) {
                error && console.error(error);
                error && rej(error);
                if (error) throw error;
                // console.log('The solution is:', results);
                useLittleHump && ( results = results.map(v=>toLittleHump(v)) );
                res(results);
            });
        });
    }

    handler.multipleQuery = function(sql,...paras){
        // paras = paras.map(v=>`'${v.replace(/\'/gi,'\\\'')}'`);
        // paras.forEach(v=>sql=sql.replace('?',v));
        // paras.push()
        // console.log('===sql===',sql);
        return new Promise((res,rej)=>{
            connMultiple().query(sql, paras,function (error, results, fields) {
                error && console.error(error);
                error && rej(error);
                if (error) throw error;
                // console.log('The solution is:', results);
                useLittleHump && ( results = results.map(v=>toLittleHump(v)) );
                res(results);
            });
        });
    }

    handler.addOne = function (table,one){
        return new Promise((res,rej)=>{
            conn().query(`INSERT INTO ${table} SET ?`,one,function(error,result){
                error && console.error(error);
                error && rej(error);
                useLittleHump && ( result = toLittleHump(result) );
                res(result);
            });
        });
    }

    handler.getOne = async function (table, pkValue , pk='id'){
        return new Promise((res,rej)=>{
            conn().query(`select * from ${table} where ${pk}= ?`,[pkValue],function(error,result){
                error && console.error(error);
                error && rej(error);
                [result] = result;
                useLittleHump && ( result = toLittleHump(result) );
                res(result || null);
            });
        });
    }

    handler.deleteOne = async function (table, pkValue , pk='id'){
        return new Promise((res,rej)=>{
            conn().query(`delete from ${table} where ${pk}= ?`,[pkValue],function(error,result){
                error && console.error(error);
                error && rej(error);
                res(result);
            });
        });
    }

    handler.count = async function(table, condition = '' , ...paras){
        condition && ( condition = ` where ${condition} ` );
        var [count] = await new Promise((res,rej)=>{
            conn().query(`select count(*) as c from ${table} ${condition}`,paras,function(error,result){
                error && console.error(error);
                error && rej(error);
                res(result);
            });
        });
        return Object.values(count)[0];
    }

    handler.findIn = async function(table,values,field='id'){
        if(!values || !Array.isArray(values) || !values.length)return [];
        values = Array.from(new Set(values));
        return await new Promise((res,rej)=>{
            conn().query(`select *  from ${table} where ${field} in (${Array(values.length).fill('?').join(',')})`
                ,values,function(error,result){
                    error && console.error(error);
                    error && rej(error);
                    res(result);
                });
        });
    }

    handler.deleteBy = async function (table, condition , ...paras){
        return new Promise((res,rej)=>{
            condition && ( condition = ` where ${condition} ` );
            conn().query(`delete from ${table} ${condition}`,paras,function(error,result){
                error && console.error(error);
                error && rej(error);
                res(result);
            });
        });
    }

    handler.findOneBy = async function (table, condition , ...paras){
        return new Promise((res,rej)=>{
            condition && ( condition = ` where ${condition} ` );
            conn().query(`select * from ${table} ${condition}`,paras,function(error,result){
                error && console.error(error);
                error && rej(error);
                [result] = result;
                useLittleHump && ( result = toLittleHump(result) );
                res(result || null);
            });
        });
    }

    handler.findListBy = async function ( ...paras){
        var table, condition,page = paras.shift(),pageSize = paras.shift(),usePage = true;
        if(typeof page !== 'number' && typeof page !== typeof pageSize)
            throw new Error('page and pageSize muse all be given,or all not be given');
        if(typeof page !== 'number'){
            table = page;
            condition = pageSize ;
            usePage = false;
        }
        if(usePage){
            table = paras.shift();
            condition = paras.shift();
        }
        condition && ( condition = ` where ${condition} ` );
        if(usePage){
            var [count] = await new Promise((res,rej)=>{
                conn().query(`select count(*) as c from ${table} ${condition}`,paras,function(error,result){
                    error && console.error(error);
                    error && rej(error);
                    res(result);
                });
            });
            [count] = Object.values(count);
            var minPage = 1,maxPage = Math.max(1,Math.ceil(count/pageSize));
            page = Math.min( maxPage , Math.max(minPage,page) );
            paras.push((page-1)*pageSize,pageSize);
            var list = await new Promise((res,rej)=>{
                conn().query(`select * from ${table} ${condition} limit ?,?`,paras,function(error,result){
                    error && console.error(error);
                    error && rej(error);
                    res(result);
                });
            });
            useLittleHump && ( list = list.map(v=>toLittleHump(v)) );
            return {pageSize,page,minPage,maxPage,list};
        }
        return await new Promise((res,rej)=>{
            conn().query(`select * from ${table} ${condition}`,paras,function(error,result){
                error && console.error(error);
                error && rej(error);
                useLittleHump && ( result = result.map(v=>toLittleHump(v)) );
                res(result);
            });
        });
    }

    handler.updateOne = function (table,one,pk='id'){
        var keys = Object.keys(one).filter(v=>v!==pk);
        var values = keys.map(k=>one[k]);
        keys = keys.map(v=>`${v}=?`).join(',');
        values = [...values,one[pk]];
        return new Promise((res,rej)=>{
            conn().query(`update ${table} SET ${keys} where ${pk}=?`,values,function(error,result){
                error && console.error(error);
                error && rej(error);
                useLittleHump && ( result = toLittleHump(result) );
                res(result);
            });
        });
    }

    handler.join = async function (list, leftKey, newField, table, rightKey, dir='left',autoCloneRight=true) {
        var leftKeyValues = list.map(v=>v[leftKey]).filter(v=>v);
        leftKeyValues = [...new Set(leftKeyValues)];
        list.forEach(v=>v[newField]=null);
        if(leftKeyValues.length === 0)return list;
        // console.log('sql==',`select * from ${table} where ${rightKey} in (${leftKeyValues.map(v=>'?').join(',')})`,JSON.stringify(leftKeyValues));
        var otherList = await this.query(`select * from ${table} where 
            ${rightKey} in (${leftKeyValues.map(v=>'?').join(',')})` ,...leftKeyValues);
        list.joinList(otherList,leftKey,rightKey,newField,dir,autoCloneRight);
        return list;
    }

    handler.leftJoin = function (list, leftKey, newField, table, rightKey,autoCloneRight=true) {
        return this.join(list, leftKey, newField, table, rightKey,'left',autoCloneRight);
    }

    handler.rightJoin = function (list, leftKey, newField, table, rightKey,autoCloneRight=true) {
        return this.join(list, leftKey, newField, table, rightKey,'right',autoCloneRight);
    }

    handler.save = async function (table, one, pk='id'){
        if( one[pk] )
            await this.updateOne ( table, one )
        else{
            var result = await this.addOne( table, one );
            [one] = await this.query( `select * from ${table} where ${pk} = ?`,result.insertId );
        }
        useLittleHump && ( one = toLittleHump(one) );
        return one;
    }

    return handler;
}
