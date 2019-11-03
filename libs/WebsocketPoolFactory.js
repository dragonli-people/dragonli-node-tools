/**
 * Created by freeangel on 17/4/1.
 */
const WebSocket = require('ws')
const {sleep}=require('./GeneralUtil');
const factory = {};

function onMessage(pool, event, websocket) {
    websocket.lastResponse = Date.now();
    // console.log(`onmessage----${event.data}--${websocket.lastResponse}`)
    try{
        let data = JSON.parse(event.data)
        if(data && ( data.heart || data.available ) )
        {
            // console.log(`心跳包回来---${data.heart}`)
            // websocket.xxx = 0000;
            return
        }

    }catch (e){

    }
    console.log(`onmessage----${event.data}--${websocket.lastResponse}`,pool.onMessage)
    pool.onMessage && pool.onMessage(event.data,websocket)
}



module.exports = factory;
factory.create = async function (_host,_port,_size,_query,heartDataFunc=null,checkHeartInterval=1000) {

    const connects = []
    const pool = {}

    setInterval(()=>{
        const now = Date.now();
        // console.log(`exec set interval:${now}`);
        connects.forEach(websocket=>{
            if( now - websocket.lastResponse > 10000 )
            {
                // console.log(`close-${now} - ${websocket.lastResponse}`)
                websocket.close()
                removeConnect(websocket)
                return;
            }

            if(now - websocket.lastResponse > 1000 )
            {
                // console.log(`send-${now} - ${websocket.lastResponse}`);
                // console.log(websocket.heartDataFun,typeof websocket.heartDataFun,websocket.send);
                websocket.heartDataFunc && typeof websocket.heartDataFunc === 'function'
                     && websocket.send(JSON.stringify(websocket.heartDataFunc()))
                return;
            }
        })
    },checkHeartInterval);

    function createConnect(host,port,query,heartDataFunc)
    {
        return new Promise((res,rej)=>{
            var hadResult = false;
            setTimeout(_=>{hadResult=true;rej(new Error("connect time out"))},5000);
            query = query ? `?${query}` :'';
            let websocket = new WebSocket(`ws://${host}:${port}${query}`)//'ws://10.0.0.51:1093');
            websocket.heartDataFunc = heartDataFunc;
            websocket.onopen = function (event) {
                // console.log("websocket================open")
                //todo logs
                if(hadResult)return;
                hadResult = true;
                websocket.lastResponse = Date.now();
                connects.push(websocket);
                poolSize = connects.length;
                res();
            }
            websocket.onmessage = (websocket=>event=>onMessage(pool, event, websocket))(websocket);

            websocket.onclose = websocket.onerror = function (event) {
                if( !hadResult )
                {
                    hadResult = true;
                    console.log("websocket connect error!");
                    rej();
                }
                console.error('websocketOnClose.....ip',event.target.url)
                removeConnect(websocket)
            }

        });
    }

    function removeConnect(c,index)
    {
        ((index = connects.indexOf(c))>=0 ) && connects.splice(index,1);
        !c.hadRemoved && ( c.hadRemoved = true ) && connects.length < _size && createConnect(_host,_port,_query,c.heartDataFunc)
    }

    var host,port,size,query,poolSize = 0;
    pool.start = async function(host,port,size,query,onMessage,heartDataFunc)
    {
        heartDataFunc = heartDataFunc || ( ()=>({'heart':true}) );
        // pool.onMessage = onMessage;
        await Promise.all(Array(size).fill(null).map(_=>createConnect(host,port,query,heartDataFunc)));
    }

    let index = 0;
    pool.send = function (text)
    {
        if(connects.length===0)
            throw new Error('==connect is all down!===')
        poolSize && connects[index++ % poolSize].send(typeof text === 'object' ? JSON.stringify(text):text)
    }

    Object.assign(pool,{get all (){ return connects } } );

    await pool.start(_host,_port,_size,_query,onMessage,heartDataFunc);
    return pool
}
