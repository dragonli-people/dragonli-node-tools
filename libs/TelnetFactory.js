const net = require('net');
const factory = {};
module.exports = factory;
factory.create = function (port,messageHandler)
{
    //telnet
    const telnet = {};
    return new Promise((res,rej)=>{
        const server = net.createServer((con) => {
            con.write('success\n');
            telnet.server = server;

            con.on('data',async data=>{
                let str = data.toString().trim();
                if(!str)
                {
                    con.write('dataError!\n');
                    return;
                }

                let paras = str.split(/\s+/gi)
                let key = paras.shift();

                if(key === 'quit'){
                    console.log('close')
                    con.end()
                    return
                }

                var result = messageHandler && await messageHandler(key,...paras) || null;
                result ? con.write(`${result}\n`) : con.write(`errror\n`);

            })

            con.on('end', ()=>{
                console.log('userclose')
            });
            res(telnet);
        });
        server.listen(port);

    });
}