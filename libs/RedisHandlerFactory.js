/**
 * Created by freeangel on 17/4/2.
 */

const supportCmd = [
    'blpop',
    'brpop',
    'brpoplpush',
    'decr',
    'decrby',
    'del',
    'exists',
    'expire',
    'expireat',
    'get',
    'getbit',
    'getrange',
    'getset',
    'hdel',
    'hexists',
    'hget',
    'hgetall',
    'hincrby',
    'hincrbyfloat',
    'hkeys',
    'hlen',
    'hset',
    'hsetnx',
    'hstrlen',
    'hvals',
    'incr',
    'incrby',
    'incrbyfloat',
    'lindex',
    'linsert',
    'llen',
    'lpop',
    'lpush',
    'lpushx',
    'lrange',
    'lrem',
    'lset',
    'ltrim',
    'mget',
    'mset',
    'msetnx',
    'persist',
    'pexpire',
    'pexpireat',
    'rpop',
    'rpoplpush',
    'rpush',
    'rpushx',
    'hscan',
    'sadd',
    'sdiff',
    'sdiffstore',
    'set',
    'setbit',
    'setex',
    'setnx',
    'setrange',
    'sismember',
    'smembers',
    // 'smove',
    'sort',
    'spop',
    'srandmember',
    'srem',
    'strlen',
    'ttl',
    'type',
    'zadd',
    'zcard',
    'zcount',
    'zincrby',
    'zinterstore',
    'zrange',
    'zrangebyscore',
    'zrank',
    'zrem',
    'zremrangebylex',
    'zremrangebyrank',
    'zremrangebyscore',
    'zrevrange',
    'zrevrangebylex',
    'zrevrangebyscore',
    'zrevrank',
    'zscan',
    'zscore',
    'SCARD'
]
const {substitute} = require('./GeneralUtil.js')
const redis=require('redis');

var size = 5;
var timeout = 50000;

const factory = {};
factory.setSize = s=>size=s;
factory.setTimeout = s=>timeout=s;
factory.create = async function (para1,para2) {

    const poolDic = {};
    const handler = {};
    //如果设置了redis组，需要将键值分发到不同host上。这需要一个分组策略，mappingFunc即为实现这样的功能
    //分组的情况，通常需要给每个组设置key
    var mappingFunc;
    var hosts = null;
    if( typeof para1 === 'array' ){
        hosts = para1;
        mappingFunc = para2;
    }
    else{
        hosts = [{host:para1,port:para2,key:null}];
        mappingFunc = ()=>Object.values(poolDic)[0];//如果不分组，默认规则是选第一个
    }

    for( var i = 0 ; i < hosts.length ;i++ ){
        var cf = hosts[i];
        var pool = [];
        poolDic[cf.host] = {key:cf.key,host:cf.host,pool};
        for(var ii=0;ii<size;ii++)
        {
            var connect = await createConnect(pool,cf.host,cf.port,size,timeout);
            connect.host = cf.host;
            pool.push(connect);
        }
    }

    supportCmd.forEach(cmd=>{
        handler[cmd] = async (...paras)=>{
            var supporPool = mappingFunc(poolDic,cmd,paras[0]);//所支持的命令中，第一个参数恒为key。按命令和key选中连接池
            var [conn] = supporPool.pool;//从连接池中选中第一个
            return await redisExec(conn,cmd,...paras);
        }
    })
    return handler;
}

function createConnect(pool,host,port,size,timeout=5000)
{
    var success = false;
    var hadTimeout = false;
    return new Promise( (resolve,reject)=>{
        // console.log('正在创建redis链接 链接地址：',host);

        let client = redis.createClient(port,host,{
            retry_strategy () {
                //不要重连，直接用池里别的
                removeConnect(pool,host,port,client,true,size)
                return null;
            }
        });
        client.host = host;
        client.on('error',function (err) {
            console.log('rediserror...')
            removeConnect(pool,host,port,client,true,size)
        });
        client.on('disconnect',function (){
            console.log('redisdisconnect...')
            removeConnect(pool,host,port,client,true,size)
        })
        client.on('connect',()=>{
            if(hadTimeout){
                this.close();
                return;
            }
            (success=true)&&resolve(client);
        });
        setTimeout(_=>!success && (hadTimeout=true) && reject(),timeout);
    });
}

async function removeConnect(pool,host,port,client,autoCheckAndCreate,size)
{
    // console.log('===pools[host]===',pools[host]);
    let index=0;
    (index=pool[host].indexOf(client)) >=0 && pool[host].splice(index,1);
    // console.log('success1',pools[host].length);
    // console.log('success2',autoCheckAndCreate);
    // console.log('success3',size);
    let obj = {}
    autoCheckAndCreate && pool[host].length < size && (obj = await createConnect(pool,host,port,size)) && pool[host].push(obj);
}

function redisExec(connect,cmdName,...paras)
{
    return new Promise( ( reslove,reject )=>
        connect[cmdName](...paras,
            (err,result)=>err ? reject(err):reslove(result)
        )
    )
}


module.exports = factory;