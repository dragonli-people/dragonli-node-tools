const mysql=require('mysql');
const GeneralUtil = require('./GeneralUtil')

const root = {};
module.exports = root;
root.create = handlerFactory;
var mysqlHandlerPool;

function connectFactory(host,port,user,password,database,multipleStatements=false, connectionLimit = 10) {
    console.log('===mysql try connecting===',host,port,user,password,database);

    if (!mysqlHandlerPool) {
        mysqlHandlerPool = mysql.createPool({
            host,
            port,
            user,
            password,
            database,
            multipleStatements,
            connectionLimit
        })
        console.log('===mysqlHandlerPool===', mysqlHandlerPool)
    }
    // var connection = mysql.createConnection({
    //     host,
    //     port,
    //     user,
    //     password,
    //     database,
    //     multipleStatements,
    // });
    return new Promise(resolve => {
        return mysqlHandlerPool.getConnection((err, connection) => {
            if (err) {
                console.error('error connecting:' + err.stack);
                return;
            }
            console.log('mysql connected successed! with id ' + connection.threadId);
            setInterval(_=>connection.query('select UNIX_TIMESTAMP()'),5*60*1000);
            resolve(connection);
        })
    })
}

async function handlerFactory(host,port,user,pass,database){
    const handler = {};
    port = parseInt(port);
    var [conn,connMultiple] = await Promise.all( [
        connectFactory(host,port,user,pass,database),
        connectFactory(host,port,user,pass,database,true),
    ]);
    handler.query = function(sql,...paras){
        // paras = paras.map(v=>`'${v.replace(/\'/gi,'\\\'')}'`);
        // paras.forEach(v=>sql=sql.replace('?',v));
        // paras.push()
        // console.log('===sql===',sql);
        return new Promise(res=>{
            conn.query(sql, paras,function (error, results, fields) {
                error && console.error(error);
                if (error) throw error;
                // console.log('The solution is:', results);
                res(results);
            });
        });
    }

    handler.multipleQuery = function(sql,...paras){
        // paras = paras.map(v=>`'${v.replace(/\'/gi,'\\\'')}'`);
        // paras.forEach(v=>sql=sql.replace('?',v));
        // paras.push()
        // console.log('===sql===',sql);
        return new Promise(res=>{
            connMultiple.query(sql, paras,function (error, results, fields) {
                error && console.error(error);
                if (error) throw error;
                // console.log('The solution is:', results);
                res(results);
            });
        });
    }

    handler.addOne = function (table,one){
        return new Promise(res=>{
            conn.query(`INSERT INTO ${table} SET ?`,one,function(error,result){
                error && console.error(error);
                if (error) throw error;
                res(result);
            });
        });
    }

    handler.updateOne = function (table,one,pk='id'){
        var keys = Object.keys(one).filter(v=>v!==pk);
        var values = keys.map(k=>one[k]);
        keys = keys.map(v=>`${v}=?`).join(',');
        values = [...values,one[pk]];
        return new Promise(res=>{
            conn.query(`update ${table} SET ${keys} where ${pk}=?`,values,function(error,result){
                error && console.error(error);
                if (error) throw error;
                res(result);
            });
        });
    }

    handler.join = async function (list, leftKey, newField, table, rightKey, dir='left',autoCloneRight=true) {
        var leftKeyValues = list.map(v=>v[leftKey]).filter(v=>v);
        leftKeyValues = [...new Set(leftKeyValues)];
        list.forEach(v=>v[newField]=null);
        if(leftKeyValues.length === 0)return list;
        console.log('sql==',`select * from ${table} where ${rightKey} in (${leftKeyValues.map(v=>'?').join(',')})`,JSON.stringify(leftKeyValues));
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

    return handler;
}
