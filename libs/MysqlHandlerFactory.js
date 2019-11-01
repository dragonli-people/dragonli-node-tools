const mysql=require('mysql');

const root = {};
module.exports = root;
root.create = handlerFactory;

function connectFactory(host,port,user,password,database,multipleStatements=false) {
    console.log('===debug1===',host,port,user,password,database);

    var connection = mysql.createConnection({
        host,
        port,
        user,
        password,
        database,
        multipleStatements,
    });

    return new Promise(resolve => {
        connection.connect(function (err) {
            if (err) {
                console.error('error connecting:' + err.stack);
                return;
            }
            console.log('connected as id ' + connection.threadId);
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

    return handler;
}
