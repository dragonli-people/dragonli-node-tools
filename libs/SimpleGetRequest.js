/**
 * Created by dev on 2017/8/9.
 * 这玩意暂时先这样,以后再慢慢丰富吧,先能把请求发出去再说
 * by 大尾巴狼
 */
const request = require('request');

const SimpleGetRequest={};
SimpleGetRequest.sendGet = function (url){
   return new Promise(function(resolve, reject) {
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(body)
            }else{
                reject(error);
            }
        })
    });
}
module.exports = SimpleGetRequest;

